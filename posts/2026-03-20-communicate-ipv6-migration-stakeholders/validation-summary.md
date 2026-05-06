# Validation Summary: How to Communicate IPv6 Migration Plans to Stakeholders

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Dual-stack networking
- Python `socket`
- PostgreSQL SQL DDL
- Linux networking tools (`ss`, `ping`)
- `curl`
- Prometheus

## Sources Consulted
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- PostgreSQL `ALTER TABLE` documentation: https://www.postgresql.org/docs/current/sql-altertable.html
- curl man page: https://curl.se/docs/manpage.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 6146, Stateful NAT64: https://www.rfc-editor.org/rfc/rfc6146
- AWS announcement for IPv6-only subnets and EC2 instances: https://aws.amazon.com/about-aws/whats-new/2021/11/amazon-virtual-private-cloud-ipv6-subnets-ec2-instances/
- Azure IPv6 overview: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Local command help/output: `ss --help`, `ping -h`, `curl --help all`

## Issues Found
- The Python socket example was incorrect for dual-stack listening. It switched the bind address to `::` but did not switch the socket family to `AF_INET6`, and it set `IPV6_V6ONLY` after `bind()`, which fails on Linux. I updated the example to create an `AF_INET6` socket and set `IPV6_V6ONLY` before binding.
- The operations example used `ping6 2001:db8::1` as a connectivity check. `2001:db8::/32` is reserved for documentation, so it should not be used as a real reachability target. I replaced it with `ping -6 <known-ipv6-host>` and changed the `curl` example to a service-hostname placeholder.
- The IPv6 listener check used `ss -tlnp | grep '::'`, which is less precise and can miss or misread IPv6 listeners. I replaced it with `ss -tlpn -6`, which directly lists listening TCP IPv6 sockets.
- The executive communication sample overstated the impact by saying services would be unreachable without IPv6. I corrected this to note that some environments are IPv6 or IPv6-only and that translation mechanisms may otherwise be required.
- The developer and operations communication samples had malformed outer Markdown fences around nested code blocks. I changed those outer fences to quadruple backticks so the examples render correctly.

## Review Notes
- `VARCHAR(45)` is a common choice when storing textual IPv4/IPv6 addresses, but databases that support native IP address types, such as PostgreSQL `inet`, can be a better long-term option if the application stack allows it.
