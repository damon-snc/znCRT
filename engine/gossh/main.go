// znCRT P0 SSH 链路冒烟（Go 实现）—— ADR-0003 E2' 的裁决实验。
// 纯 Go（golang.org/x/crypto/ssh），无 CGO，静态编译预期可在本机 execve。
// 凭证走环境变量（与 engine/smoke_ssh.py 同口径）：
//   ZN_SSH_HOST / ZN_SSH_PORT / ZN_SSH_USER / ZN_SSH_PASS
// 用法：gossh [command]   默认 whoami && uname -a
package main

import (
	"fmt"
	"net"
	"os"
	"time"

	"golang.org/x/crypto/ssh"
)

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func run() error {
	host := os.Getenv("ZN_SSH_HOST")
	user := os.Getenv("ZN_SSH_USER")
	pass := os.Getenv("ZN_SSH_PASS")
	if host == "" || user == "" || pass == "" {
		return fmt.Errorf("need ZN_SSH_HOST / ZN_SSH_USER / ZN_SSH_PASS")
	}
	port := env("ZN_SSH_PORT", "22")
	cmd := "whoami && uname -a"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	cfg := &ssh.ClientConfig{
		User:            user,
		Auth:            []ssh.AuthMethod{ssh.Password(pass)},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // 冒烟口径；正式引擎换 known_hosts
		Timeout:         12 * time.Second,
	}
	client, err := ssh.Dial("tcp", net.JoinHostPort(host, port), cfg)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer client.Close()

	sess, err := client.NewSession()
	if err != nil {
		return fmt.Errorf("session: %w", err)
	}
	defer sess.Close()
	out, err := sess.CombinedOutput(cmd)
	if err != nil {
		return fmt.Errorf("run: %w", err)
	}
	fmt.Printf("RC host=%s:%s user=%s cmd=%q\n", host, port, user, cmd)
	fmt.Printf("OUTPUT: %s", out)
	fmt.Println("SMOKE_OK")
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "SMOKE_FAIL:", err)
		os.Exit(1)
	}
}
