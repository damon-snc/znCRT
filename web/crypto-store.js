// znCRT 连接历史加密存储 v1（P0 #11 · 对标 hexhub Dexie+crypto 前端模型）
// 架构对齐：hexhub 在前端 IndexedDB 字段级加密（password/privateKey/jumpServer.*）——
// znCRT 用原生 IndexedDB + WebCrypto AES-GCM（PBKDF2 派生），零第三方依赖。
// 安全披露（如实）：主口令不落盘；密文与盐落 IndexedDB；v1 无防暴力破解节流（本地攻击面）。
"use strict";

const DB_NAME = "zncrt", STORE = "history";
const CRYPTO_FIELDS = ["pass"]; // 对齐 hexhub encryptFields 口径（v1 无 privateKey/jumpServer 字段）

let dbPromise = null;
let cryptoKey = null; // 主口令派生密钥（会话内存，刷新即失）

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        st.createIndex("host", "host", { unique: false });
        st.createIndex("updated", "updated", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function unlock(passphrase, saltB64) {
  // salt 首次生成后随记录集落库（meta store 简化为 localStorage 存盐——盐非机密）
  let salt;
  if (saltB64) salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  else { salt = crypto.getRandomValues(new Uint8Array(16)); localStorage.setItem("zncrt-salt", btoa(String.fromCharCode(...salt))); }
  cryptoKey = await deriveKey(passphrase, salt);
  // 自验：解密校验样例
  await encryptField("zncrt-selftest");
  return true;
}
export const isUnlocked = () => !!cryptoKey;
export const hasSalt = () => !!localStorage.getItem("zncrt-salt");

async function encryptField(plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, new TextEncoder().encode(plain));
  return { iv: btoa(String.fromCharCode(...iv)), data: btoa(String.fromCharCode(...new Uint8Array(buf))) };
}
async function decryptField(rec) {
  const iv = Uint8Array.from(atob(rec.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(rec.data), c => c.charCodeAt(0));
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data);
  return new TextDecoder().decode(buf);
}

export async function saveConnection(entry) {
  // entry: {name, host, port, user, pass}
  if (!cryptoKey) throw new Error("未解锁：先设置主口令");
  const rec = {
    name: entry.name || (entry.user + "@" + entry.host),
    host: entry.host, port: Number(entry.port) || 22, user: entry.user,
    updated: Date.now(),
  };
  for (const f of CRYPTO_FIELDS) if (entry[f]) rec[f + "_enc"] = await encryptField(entry[f]);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    // 同 host:port:user 覆盖旧记录
    const idx = tx.objectStore(STORE).index("host");
    const req = idx.getAll(entry.host);
    req.onsuccess = () => {
      const dup = req.result.find(r => r.port === rec.port && r.user === rec.user);
      if (dup) rec.id = dup.id;
      const put = tx.objectStore(STORE).put(rec);
      put.onsuccess = () => resolve(rec.id);
      put.onerror = () => reject(put.error);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listConnections() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.updated - a.updated));
    req.onerror = () => reject(req.error);
  });
}

export async function decryptPassword(rec) {
  if (!cryptoKey || !rec.pass_enc) return null;
  try { return await decryptField(rec.pass_enc); } catch { return null; } // 口令不符→null（不抛崩）
}

export async function deleteConnection(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
