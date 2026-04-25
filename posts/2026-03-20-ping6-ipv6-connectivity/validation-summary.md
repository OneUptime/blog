# Validation Summary: How to Use ping6 for IPv6 Connectivity Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- `ping` / `ping6` from `iputils`
- Linux networking utilities (`ip`, `ip route`, `ip addr`, `ip neigh`)
- Path MTU Discovery (PMTUD)

## Sources Consulted
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `ip-address(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201.html
- Local verification with `ping -h`, `ping6 -h`, `ping -V`, and live `ping6` command tests on Linux `iputils 20240117`

## Issues Found
- The post described `ping6 -v` as adding timing output. Timing is already part of normal `ping` output when RTT can be measured; `-v` enables verbose output. I corrected the description.
- The post stated that link-local IPv6 addresses require specifying an interface. Current Linux `ping` documentation says link specification can be used and is often needed to avoid ambiguity, but it is not universally required. I softened the wording accordingly.
- The sample successful output line had malformed formatting, with a duplicated address/parenthesis sequence. I replaced it with a valid Linux-style example.
- The `ttl` explanation implied a fixed initial value of 64 or 128 and the conclusion used it as a direct hop-count estimate. I corrected this to describe Linux `ping` output accurately: it shows the remaining hop limit, while the initial value depends on the sender.
- The explanation for `Destination unreachable: Address unreachable` was too broad. Per RFC 4443, this code is used when the destination address cannot be delivered for reasons such as neighbor-resolution failure or another link-specific problem. I updated the explanation.
- The DNS error example used `Unknown host`, which does not match current Linux `ping` output. I changed it to `Name or service not known` and broadened the cause to cover both missing AAAA data and general DNS resolution failure.
- The diagnostics shell script had a logic bug: `ip -6 route show default | head -1 || echo "NONE"` never printed `NONE` on an empty result because `head` still exits successfully. I fixed it by storing the first default route and checking whether it is empty before printing.
- The diagnostics shell script parsed the interface name with `grep -oE 'dev \\w+'`, which is brittle for interface names outside `\\w`. I replaced the parsing with `awk` over the saved default-route line.
- The diagnostics shell script labeled a `ping6 ipv6.google.com` test as `DNS over IPv6`, but that command checks name resolution plus ICMPv6 reachability, not the IP family used by the DNS transport itself. I corrected the label.
- The PMTU section treated `ping6 -s` values as if they were MTU-sized packets and reported failures as `FRAGMENTED or LOST`. In IPv6, routers do not fragment transit packets; oversized packets trigger Packet Too Big handling. I changed the example to use payload sizes, switched to `-M probe` for probing, and updated the failure text to `TOO BIG or LOST`.

## Review Notes
- `ping6` has been merged into `ping` in modern `iputils`; on many Linux systems `ping6` is still available as a symlink, while `ping -6` is the more portable form.
- The local `iputils 20240117` build accepts `-t` for IPv6 hop-limit testing, and live verification produced the expected ICMPv6 Time Exceeded response when the hop limit was set too low.
- Support for link-local interface selection via `-I` depends on kernel/libc details described in the `ping(8)` man page, so the article now keeps the safe guidance of specifying the interface or scope ID without overstating it as an absolute requirement.
