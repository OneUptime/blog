# Validation Summary: How to Handle IPv6 Addresses in C/C++ Applications

## Status
<!-- One of: validated, not-code-blog, not-technically-relevant -->
validated

## Post Type
<!-- e.g., Tutorial, Guide, Opinion piece, Company update, Reference, etc. -->
Guide

## Technologies Covered
<!-- Bulleted list of technologies, frameworks, languages discussed in the post -->
- C
- C++
- IPv6
- POSIX sockets
- TCP/IP networking
- `inet_pton()`
- `inet_ntop()`
- `getaddrinfo()`

## Sources Consulted
<!-- Bulleted list of official documentation, RFCs, or authoritative sources you checked against. Include URLs where possible. -->
- The Open Group POSIX `inet_ntop()` / `inet_pton()` specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/inet_ntop.html
- The Open Group POSIX `getaddrinfo()` / `freeaddrinfo()` specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/getaddrinfo.html
- RFC 3493, Basic Socket Interface Extensions for IPv6: https://www.rfc-editor.org/rfc/rfc3493
- Linux `ipv6(7)` manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html

## Issues Found
<!-- If no issues: "No technical issues found." -->
<!-- If issues were found, list each one: what was wrong, what you changed, and why. -->
- The "Key IPv6 Data Structures" code block redefined `struct sockaddr_in6` and `struct in6_addr` after including the system headers that already define them. This would fail to compile, so I replaced the redefinitions with declarations of the existing system-defined types and retained the field explanations in comments.
- The `inet_pton()` parsing example checked `IN6_IS_ADDR_*` macros on `addr` even if parsing failed, which left `addr` uninitialized on the failure path. I moved the address classification checks into the successful parse path and returned failure from `main()` when parsing fails.
- The parsing example treated every non-success return from `inet_pton()` as invalid input. POSIX specifies `inet_pton()` returns `0` for invalid text and `-1` with `errno` set when the address family is unsupported, so I split those cases and added `perror("inet_pton")` for the error path.
- The parsing example called `inet_ntop()` without checking for failure, even though POSIX documents a `NULL` return on error. I added a return-value check and error handling.
- The IPv6 server example printed the listening port with `"[::]:5%d"`, which produced the wrong output. I corrected the format string to `"[::]:%d"`.
- The client connection example also treated every non-success `inet_pton()` result as invalid input. I split the invalid-text and error cases there as well.
- The `getaddrinfo()` example was missing required headers for `memset()`, `close()`, `socket()`, and `connect()`, and it used `perror()` even though `getaddrinfo()` reports errors via its return value. I added the missing headers and switched the error handling to `gai_strerror()`, matching the POSIX example pattern.
- The conclusion described `AF_INET6` as being for "dedicated IPv6 sockets". Since IPv6 sockets can also participate in IPv4-mapped operation depending on configuration, I changed that to "IPv6 sockets".

## Review Notes
<!-- Any additional observations: things that are technically correct but could be improved in the future, deprecation warnings, version-specific caveats, etc. If none, write "None." -->
- The examples are now technically correct for the APIs they demonstrate.
- For link-local IPv6 addresses such as `fe80::/10`, practical client or server code often also needs `sin6_scope_id` set to the relevant interface index. The post mentions the field correctly, but the simple connect example assumes a non-link-local address.
- Dual-stack behavior around `IPV6_V6ONLY` is implementation-specific in practice. The example is valid, but production code should check `setsockopt()` results and not assume identical defaults across platforms.
