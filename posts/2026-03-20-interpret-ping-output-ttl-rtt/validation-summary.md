# Validation Summary: How to Interpret Ping Output (TTL, RTT, Packet Loss)

## Status
validated

## Post Type
Guide

## Technologies Covered
- `ping`
- ICMP Echo Request / Echo Reply
- IPv4 TTL
- RTT / latency measurement
- Packet loss analysis

## Sources Consulted
- Linux `ping(8)` manual page (`iputils`): https://man7.org/linux/man-pages/man8/ping.8.html
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- Microsoft `ping` command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Local `ping -h`, `man ping`, and sample `ping` output from the review environment

## Issues Found
- The anatomy diagram labeled `64 bytes` as payload size. In Linux `ping`, that value reflects the ICMP reply size shown by the tool, not just the user payload, so I corrected the label to `Reply size`.
- The TTL section assumed `ttl=118` meant the packet started at `128` and therefore used `10` hops. The `ping(8)` TTL details explicitly say `ping` prints the TTL from the reply packet it receives, and the remote host may choose different initial TTL behavior. I changed the explanation so hop estimation is conditional on knowing the sender's initial TTL and clarified that the example reflects the return path.
- The post stated that inconsistent TTL proves asymmetric routing or load balancing, and that changing TTL means the route changed. That is too strong. I revised the text to say TTL variation can indicate different return paths, different responders, or route changes, but TTL alone is not proof.
- The post defined `mdev` as jitter. The `ping(8)` manual documents `mdev` as the population standard deviation of the RTT samples. I corrected the wording and kept the practical interpretation as latency variation.
- The packet-loss interpretation table was too deterministic and did not account for ICMP filtering or rate limiting. I rewrote those comments as rough diagnostic guidance instead of direct cause attribution.
- The closing sentence claimed `ping` output lets you pinpoint whether a problem is local, mid-path, or at the destination from a single test. I corrected that to say `ping` helps distinguish symptoms, and that localization requires comparing progressively farther hosts.

## Review Notes
- The `ping -c` examples and the overall Linux output format used in the post are valid for current `iputils ping`.
- RTT ranges in the table are heuristics rather than protocol-defined thresholds. The post now labels them as rough guidance.
