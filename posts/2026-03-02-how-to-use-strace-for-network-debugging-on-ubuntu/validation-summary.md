# Validation Summary: How to Use strace for Network Debugging on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- strace (system call tracer)
- Linux system calls (socket, connect, bind, listen, accept, sendto, recvfrom, openat, etc.)
- Ubuntu (22.04+)
- curl (used as the example application)
- TCP/IP networking, DNS, TLS
- glibc resolver (NSS, getaddrinfo)
- Bash scripting

## Sources Consulted
- strace manual page and `strace --help` output (verified against installed strace 6.8)
- strace project documentation: https://strace.io/
- GNU C Library (glibc) manual: getaddrinfo(3) - https://www.gnu.org/software/libc/manual/html_node/Host-Address-Lookup.html
- Linux man-pages: socket(2), connect(2), openat(2), open(2), getsockopt(2)
- Ubuntu package archive for the `strace` package (apt)
- Verified syscall recognition empirically with `strace -e trace=<name> /bin/true`

## Issues Found
1. **`getaddrinfo` used as a strace filter** (Tracing DNS Resolution section). The original example included `-e trace=getaddrinfo,getsockopt`. `getaddrinfo` is a glibc library function, not a system call, and strace can only trace syscalls — passing it to `-e trace=` causes strace to exit with `invalid system call 'getaddrinfo'`. Fixed by removing `getaddrinfo` from the filter, consolidating the trace options, and adding a brief note explaining that the underlying network and file syscalls should be traced instead.
2. **`open` used in DNS-tracing example** (Filtering for Network System Calls section). The example `strace -e trace=network,read,open curl ...` was intended to capture reads of `/etc/resolv.conf` and `/etc/hosts`, but modern glibc (and curl on Ubuntu 22.04+) uses `openat`, not `open`. Replaced `open` with `openat` so the example actually captures the relevant file opens. Updated the inline comment accordingly.

## Review Notes
- The `-Z` / `--failed-only` flag is correct in strace 5.x+ (confirmed against strace 6.8 `--help`).
- The `trace=network` and `trace=%network` set notations are both supported and equivalent.
- The example IP `93.184.216.34` for example.com is the historical IANA-assigned address; the IANA reserved range for example.com later changed, but this is fine as illustrative output and the post does not claim it is current.
- The `strace -p $(pgrep -x nginx | tr '\n' ',')` pattern can produce a trailing comma, which modern strace tolerates; it's a fragile but working idiom.
- The "Tracing all threads" comment under `-f` is slightly informal — `-f` follows children created by `fork`/`clone`, which includes threads — but this is acceptable conversational accuracy.
- No deprecated APIs or version-specific concerns beyond what is noted above.
