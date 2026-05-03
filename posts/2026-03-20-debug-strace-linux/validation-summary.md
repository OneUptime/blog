# Validation Summary: How to Debug Socket Programming Issues with strace on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- strace (system call tracer for Linux)
- Linux socket system calls: socket(), bind(), listen(), accept()/accept4(), connect(), send(), recv(), setsockopt(), close(), shutdown()
- BSD sockets API on Linux (AF_INET / SOCK_STREAM / IPPROTO_TCP)
- Companion tools: ss, tcpdump, pgrep, curl

## Sources Consulted
- `strace --help` and `man strace` (verified version 6.8 on the local system) for all flags (`-p`, `-o`, `-f`, `-t`, `-tt`, `-r`, `-T`, `-c`, `-s`, `-e trace=...`).
- strace upstream documentation: https://strace.io/ — confirmed default `-s` value (32) and that `trace=network` (without `%`) is deprecated in favor of `trace=%network`.
- Linux man pages (`man 2 socket`, `man 2 bind`, `man 2 accept4`, `man 2 connect`, `man 7 socket`, `man 7 ip`) for syscall signatures, sockaddr_in size (16 bytes), SO_REUSEADDR / SOL_SOCKET semantics, and accept4 SOCK_NONBLOCK behavior.
- Live DNS lookup of `example.com` (`getent ahostsv4 example.com`) to verify the IP address shown in the example output.

## Issues Found
1. **Deprecated `-e trace=network` syntax** — The post used the bare group name `network`, but the strace 6.x man page explicitly notes this form is deprecated and recommends the `%`-prefixed form `%network`. Updated both occurrences (in the "Filter Only Socket-Related Syscalls" section and the conclusion) to `-e trace=%network`. The deprecated form still works, but the post should teach the current syntax.
2. **Outdated `example.com` IP address** — The "Expected output pattern" example showed `connect(...inet_addr("93.184.216.34")...)`. That is the historical Edgecast/Edgio IP for example.com; example.com was migrated to Cloudflare and now resolves to addresses such as `172.66.147.243` and `104.20.23.154`. Updated the example to `172.66.147.243` so a reader running the same `curl` would see a plausible address.

## Review Notes
- All other strace flags and their semantics are correct: `-p PID` (attach), `-o` (output to file), `-f` (follow forks), `-t`/`-tt` (absolute timestamps), `-r` (relative), `-T` (per-syscall time), `-c` (summary), `-s STRSIZE` (default 32), `-e trace=<list>`.
- Socket-call examples are correctly formed: sockaddr_in length of 16, `setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, [1], 4)`, `accept4` returning a new fd with `SOCK_NONBLOCK`, `connect` returning `-1 ECONNREFUSED`, etc. These match real strace output formatting.
- Modern glibc invokes the `accept4` syscall (not legacy `accept`) when applications call `accept()`, so showing `accept4` in the output is accurate for current systems.
- Minor: the front-matter description ends with an ellipsis ("…actually doing at the…"), which appears to be an intentional truncation marker rather than a technical error, so it was left unchanged.
- Minor: `strace -p $(pgrep my_server)` will fail if `pgrep` returns multiple PIDs; for production use, `strace -p PID1 -p PID2 ...` or `pidof -s` would be more robust. Not changed since the example is illustrative.
- `ss -tlnp` requires root (or `CAP_NET_ADMIN`) to display the owning process column; without privileges the `-p` portion is silent. A future revision could mention `sudo`.
