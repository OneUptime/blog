# Validation Summary: How to Use Dual-Stack Sockets with IPV6_V6ONLY

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Dual-stack socket programming
- `IPV6_V6ONLY`
- C sockets on Linux/Unix-like systems
- Python `socket` programming
- Linux `sysctl`

## Sources Consulted
- RFC 3493, "Basic Socket Interface Extensions for IPv6": https://www.rfc-editor.org/rfc/rfc3493
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux kernel IP sysctl documentation (`bindv6only`): https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- Microsoft Learn, "Dual-Stack Sockets for IPv6 Winsock Applications": https://learn.microsoft.com/en-us/windows/win32/winsock/dual-stack-sockets
- Python `socket` documentation: https://docs.python.org/3.9/library/socket.html
- FreeBSD `inet6(4)` man page: https://man.freebsd.org/cgi/man.cgi?manpath=FreeBSD+11.1-RELEASE&query=inet6&sektion=4
- OpenBSD `ip6(4)` man page: https://man.openbsd.org/ip6.4
- Oracle Solaris `ip6(7P)` man page: https://docs.oracle.com/cd/E36784_01/html/E36884/ip6-7p.html
- Oracle Solaris socket creation documentation: https://docs.oracle.com/en/operating-systems/solaris/oracle-solaris/11.4/prog-interfaces/socket-creation.html
- Local `sysctl --help` output to confirm `sysctl -p <file>` syntax

## Issues Found
- The OS defaults table was too broad. It stated `macOS/BSDs` default to `1` and `Solaris` defaults to `0` without sufficiently specific vendor documentation for those exact blanket claims. I replaced the table with verified defaults for Linux, Windows (Vista and later), and FreeBSD/OpenBSD, and clarified that RFC 3493 specifies a default of `0` even though implementations vary.
- The main C example would continue after a failed `setsockopt(IPV6_V6ONLY, ...)` call, which could leave the socket in the wrong actual mode while printing a misleading success message. I added fail-fast error handling for `getsockopt()`, `setsockopt()`, `SO_REUSEADDR`, `bind()`, and `listen()`, and I close the socket on failure.
- The IPv4-mapped-address C snippet used `inet_ntop()` but did not show the required `<arpa/inet.h>` header. I added the missing include.
- The best-practices section presented a single dual-stack listener as the default recommendation for public-facing servers. I corrected that to note that while dual-stack can simplify deployment, separate IPv4 and IPv6 sockets are still commonly used for portability and policy control.

## Review Notes
- The Python example is technically valid, but Python 3.8+ also provides higher-level helpers such as `socket.has_dualstack_ipv6()` and `socket.create_server(..., dualstack_ipv6=True)` for portability.
- The C snippets were syntax-checked locally with `gcc -Wall -Wextra -Werror -fsyntax-only` after the fixes.
