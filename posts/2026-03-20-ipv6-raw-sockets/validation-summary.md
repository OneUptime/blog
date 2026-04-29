# Validation Summary: How to Use IPv6 Raw Sockets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6 raw sockets
- ICMPv6
- C
- Linux capabilities
- Linux sockets API

## Sources Consulted
- RFC 3542, Advanced Sockets Application Program Interface (API) for IPv6: https://datatracker.ietf.org/doc/html/rfc3542
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://datatracker.ietf.org/doc/html/rfc4443
- `ipv6(7)` Linux manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- `capabilities(7)` Linux manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- `setcap(8)` Linux manual page: https://man7.org/linux/man-pages/man8/setcap.8.html
- `getcap(8)` Linux manual page: https://man7.org/linux/man-pages/man8/getcap.8.html
- `proc_pid_status(5)` Linux manual page: https://man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Local system header `/usr/include/netinet/icmp6.h`

## Issues Found
- The capability-check command was incorrect. `CapEff` in `/proc/self/status` is hexadecimal, so the original `printf "%d"` pipeline could misparse or fail. I replaced it with `getcap ./rawsock`, which correctly verifies the file capability actually granted to the binary.
- The `setcap` examples used `cap_net_raw+eip`. While valid libcap syntax, it was clearer and more appropriate here to use `cap_net_raw=ep`, which matches common file-capability usage and the form shown by `getcap`.
- The `struct icmp6_echo` layout was inaccurate. `struct icmp6_hdr` already contains the 4-byte type-specific field used for Echo Request identifier and sequence number, so the extra `id` and `seq` fields were redundant and misleading. I corrected the structure and updated the send code to use `icmp6_id` and `icmp6_seq`.
- The receive-side code extracted the sequence number with `*(uint16_t *)(buf + 6)`, which risks unaligned access and is weaker C practice for portable systems code. I changed it to copy into `struct icmp6_hdr` and read `icmp6_seq` from that structure.
- The post said `IPV6_RECVPKTINFO` enabled receiving source-address information, and the conclusion implied that ancillary data would simply be available. RFC 3542 and `ipv6(7)` make clear that packet info is delivered as ancillary data on `recvmsg()`. I corrected the wording to destination/interface/hop-limit ancillary data and clarified the `recvmsg()` requirement.
- The filter snippet included `<linux/filter.h>`, which is unrelated to `ICMP6_FILTER`, while the macros in `<netinet/icmp6.h>` rely on `memset()`. I replaced that include with `<string.h>`.
- The full example usage text accepted any “IPv6 address”, but the code uses `inet_pton()` and therefore expects a numeric literal. I updated the usage string and added input validation for invalid IPv6 literals.
- The compile/run section used `2001:db8::1` as a test target without noting that it is a documentation prefix. I kept the example but clarified that it should be replaced with a reachable IPv6 address.

## Review Notes
- The technical content is now accurate for Linux raw ICMPv6 sockets as documented in RFC 3542 and current Linux man pages.
- A merged version of the sample code compiled successfully with `gcc -Wall -Wextra -pedantic`.
- Runtime raw-socket testing was not performed in this environment because the current process does not have `CAP_NET_RAW`.
