# Validation Summary: How to Set Up Network Traffic Shaping and QoS on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux traffic control (`tc`)
- HTB queueing discipline
- TBF queueing discipline
- fq_codel queueing discipline
- u32 traffic filters
- NetworkManager dispatcher scripts

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Linux traffic control": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/linux-traffic-control_configuring-and-managing-networking
- `tc(8)` manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-htb(8)` manual page: https://www.man7.org/linux/man-pages/man8/HTB.8.html
- `tc-tbf(8)` manual page: https://www.man7.org/linux/man-pages/man8/tbf.8.html
- `tc-u32(8)` manual page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-fq_codel(8)` manual page: https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- `NetworkManager-dispatcher(8)` manual page: https://networkmanager.dev/docs/api/latest/NetworkManager-dispatcher.html
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The TBF example used `burst 32kbit` for a 100 Mbit/s shaper. The `tc-tbf(8)` documentation notes that larger rates require larger buffers and that too-small buffers can cause drops because the bucket cannot hold the tokens that arrive per timer tick. Changed the example to `burst 1mbit`, which is a more appropriate minimum-scale burst value for 100 Mbit/s.
- The u32 filter examples matched only `ip dport`, without first matching the IPv4 protocol field. The `tc-u32(8)` documentation warns that source and destination port selectors assume a suitable layer-four protocol is present. Added `match ip protocol 6 0xff` for SSH/HTTP/HTTPS and `match ip protocol 17 0xff` for UDP DNS, including the persistent dispatcher script commands.

## Review Notes
The commands are examples for IPv4 outbound classification. IPv6 traffic would require equivalent `protocol ipv6`/`ip6` filters, and SSH server reply traffic would need source-port matching rather than destination-port matching.
