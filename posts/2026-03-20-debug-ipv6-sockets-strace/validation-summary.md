# Validation Summary: How to Debug IPv6 Socket Issues with strace and ltrace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- strace (system call tracer)
- ltrace (library function call tracer)
- Linux socket API (BSD sockets)
- IPv6 (AF_INET6, sockaddr_in6, IPV6_V6ONLY, link-local addresses, scope IDs)
- IPv4 (AF_INET, sockaddr_in)
- glibc resolver functions (getaddrinfo, getnameinfo, inet_pton, inet_ntop, if_nametoindex)
- Bash scripting (pgrep, timeout)

## Sources Consulted
- strace(1) man page (https://man7.org/linux/man-pages/man1/strace.1.html), verified locally with strace 6.8
- ltrace(1) man page (https://man7.org/linux/man-pages/man1/ltrace.1.html)
- socket(2), bind(2), connect(2), accept(2), accept4(2), setsockopt(2) man pages
- ipv6(7) man page — sockaddr_in6 layout, scope_id semantics
- getaddrinfo(3) and if_nametoindex(3) man pages
- RFC 4291 (IPv6 Addressing Architecture) — link-local scope semantics
- Linux kernel headers: sizeof(struct sockaddr_in) = 16, sizeof(struct sockaddr_in6) = 28

## Issues Found
No technical issues found.

Verification notes:
- `strace -e trace=network` and the syscall list (`socket,bind,connect,accept,sendto,recvfrom`, `setsockopt`, `accept4`) are all valid syscalls and trace expressions.
- `-tt`, `-T`, `-f`, `-p`, `-o` flags are all correct.
- `setsockopt(5, SOL_IPV6, IPV6_V6ONLY, [0], 4)` matches the format produced by modern strace (≥5.x). Older versions may render the level as `IPPROTO_IPV6`; both decode to the same numeric value (41), so the example is accurate.
- Address-length values (16 for sockaddr_in, 28 for sockaddr_in6) are correct on Linux.
- The link-local + zero scope_id ⇒ `ENETUNREACH` / `EINVAL` behavior is consistent with the kernel's IPv6 connect path (RFC 4291 scope semantics).
- `if_nametoindex("eth0")` is the correct API for resolving a scope ID.
- The `ltrace -e a+b+c` filter syntax (additive `+` separator) is the documented form.
- Example addresses (93.184.216.34, 2001:500:88:200::10, 2001:db8::1, fe80::1) are appropriate illustrative values.

## Review Notes
- The strace output format for `sin6_addr` has evolved across versions: older strace prints `sin6_addr=2001:db8::1`, newer versions print `inet_pton(AF_INET6, "2001:db8::1", &sin6_addr)`. The post mixes both styles depending on the example, which mirrors real-world output across distributions and is fine.
- `sin6_flowinfo=0` is sometimes shown by recent strace as `sin6_flowinfo=htonl(0)`. The post's plain `sin6_flowinfo=0` rendering is still valid for some versions.
- The conclusion mentions `ss -tlnp` for visibility; `ss -6 -tlnp` would be even more targeted for IPv6-only inspection, but the existing form is correct.
- Attaching strace to another process generally requires either the same UID or `CAP_SYS_PTRACE` (and may be restricted by `/proc/sys/kernel/yama/ptrace_scope`); the post sensibly uses `sudo` in those examples.
