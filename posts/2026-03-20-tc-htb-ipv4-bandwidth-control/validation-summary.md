# Validation Summary: How to Use tc htb (Hierarchical Token Bucket) for IPv4 Bandwidth Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux traffic control (`tc`)
- HTB (Hierarchical Token Bucket) qdisc and classes
- `u32` traffic filters for IPv4 classification
- `fq_codel` leaf qdisc
- IPv4 TCP/UDP port and subnet matching

## Sources Consulted
- iproute2 `tc-htb(8)` manual: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/tc-htb.8
- iproute2 `tc-u32(8)` manual: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/tc-u32.8
- iproute2 `tc-fq_codel(8)` manual: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/tc-fq_codel.8
- iproute2 `tc(8)` manual: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/tc.8
- HTB user guide by Martin Devera: https://luxik.cdi.cz/~devik/qos/htb/manual/userg.htm
- Local verification against `tc` from iproute2 6.1.0 (`tc -V`, `tc ... help`, and local manpages)

## Issues Found
- **Oversubscribed guaranteed rates**: The original child class rates added up to 101 Mbps under a 100 Mbps parent class because the default class had an additional 1 Mbps guarantee. Changed the bulk tier from 20 Mbps to 19 Mbps so the four leaf rates total exactly 100 Mbps.
- **Port filters did not match the IP protocol**: The `u32` `ip dport` selector assumes a suitable layer-four protocol. Added explicit `match ip protocol` checks for TCP traffic, and added UDP plus TCP SIP filters for port 5060, to avoid classifying unrelated IPv4 protocols by bytes at the port offset.
- **`burst` definition was imprecise**: The original text described burst as bytes sent instantaneously at full rate. Updated it to describe the token bucket size used for short bursts.
- **Reset command comment was too broad**: `tc qdisc del dev eth0 root` removes the root qdisc and the classes/filters attached under it, not every possible traffic-control object on the interface. Updated the comment accordingly.

## Review Notes
- The `tc qdisc`, `tc class`, `tc filter`, and `fq_codel` commands are current iproute2 syntax. `flowid` is accepted by `tc filter` for classifying matches into HTB classes.
- HTB shaping applies to egress traffic on the selected interface. Ingress shaping would require a different setup such as ingress/clsact policing or IFB redirection.
- The fixed `u32` port filters still rely on the normal `u32` assumption of a minimal IPv4 header for direct port matching; more complex production policies may prefer `flower`, BPF, or firewall marks for easier protocol-aware matching.
