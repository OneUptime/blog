# Validation Summary: How to Debug Socket Errors (ECONNREFUSED, ETIMEDOUT, EADDRINUSE) in C

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- C language (POSIX sockets)
- Linux errno values (asm-generic)
- BSD sockets API: `socket()`, `connect()`, `bind()`, `setsockopt()`, `getsockopt()`, `send()`, `recv()`
- `<errno.h>` and `<string.h>` (`perror()`, `strerror()`)
- IPv4 (`AF_INET`, `sockaddr_in`, `inet_pton`, `htons`)
- Socket options: `SO_REUSEADDR`, `SO_ERROR`
- Send flags: `MSG_NOSIGNAL`
- Signal handling: `SIGPIPE`, `SIG_IGN`

## Sources Consulted
- Linux kernel UAPI errno headers (`/usr/src/linux-hwe-6.17-headers-*/include/uapi/asm-generic/errno-base.h` and `errno.h`) — for canonical Linux errno numeric values
- POSIX.1-2017 (IEEE Std 1003.1-2017) for `connect(2)`, `bind(2)`, `send(2)`, `recv(2)`, `getsockopt(2)`, `perror(3)`, `strerror(3)` semantics
- Linux man pages: `socket(7)`, `tcp(7)`, `signal(7)` for `MSG_NOSIGNAL`, `SO_REUSEADDR`, and SIGPIPE behavior
- glibc documentation for `perror()` (does not modify errno)

## Issues Found
No technical issues found.

All errno values in the table match Linux's asm-generic UAPI headers exactly:
- `ECONNREFUSED` = 111 ✓
- `ETIMEDOUT` = 110 ✓
- `EADDRINUSE` = 98 ✓
- `ECONNRESET` = 104 ✓
- `EPIPE` = 32 ✓
- `ENETUNREACH` = 101 ✓
- `EINPROGRESS` = 115 ✓
- `EAGAIN` / `EWOULDBLOCK` = 11 / 11 ✓ (EWOULDBLOCK is `#define`d to EAGAIN on Linux)

The code examples are syntactically correct C, use the proper POSIX/BSD socket APIs, and the patterns shown (SO_REUSEADDR before bind, MSG_NOSIGNAL or SIG_IGN for SIGPIPE, SO_ERROR after non-blocking connect) are the standard, recommended approaches.

## Review Notes
- The example code uses minimal includes per snippet for brevity (e.g., `<sys/socket.h>` is omitted from the ECONNRESET/EPIPE block although `send`/`recv`/`MSG_NOSIGNAL` come from there). This is conventional for tutorial snippets and not a technical error.
- `uint16_t` is used in function signatures; technically requires `<stdint.h>`, but on Linux/glibc it is typically transitively included via `<sys/socket.h>` / `<arpa/inet.h>`. Acceptable for an illustrative tutorial.
- The errno values listed are correct for the most common Linux architectures (x86, x86_64, arm, arm64, riscv, etc., which all use asm-generic). A handful of legacy architectures (alpha, mips, parisc, sparc) have different numeric values; the post correctly scopes the table to "Value (Linux)" and the values shown are the asm-generic defaults.
- Return values of `socket()`, `inet_pton()`, `setsockopt()`, and `getsockopt()` are not checked in the examples. This is fine for a focused tutorial on errno handling, but production code should always check them.
- The post uses `signal(SIGPIPE, SIG_IGN)`; `sigaction()` is the more portable POSIX-recommended call, but `signal()` for `SIG_IGN` of `SIGPIPE` is well-defined on Linux/glibc and widely used.
