# Validation Summary: How to Configure IPv4 Traffic Policing vs Shaping and When to Use Each

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux traffic control (`tc`)
- IPv4
- Traffic policing
- Traffic shaping
- TBF (`tc-tbf`)
- HTB (`tc-htb`)
- `u32` filters
- IFB redirection

## Sources Consulted
- `tc(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-tbf(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- `tc-police(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-police.8.html
- `tc-htb(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-htb.8.html
- `tc-u32(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-mirred(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-mirred.8.html
- Local `tc` CLI help and local man pages from `iproute2-6.1.0`

## Issues Found
- The TBF example used `burst 32kbit`, but `tc-tbf(8)` documents `burst` in bytes and notes that 10 Mbit/s shaping needs at least about 10 KB of buffer. I changed the example to `burst 16kb` and fixed the comment so the example can actually sustain the configured rate.
- The policing explanation incorrectly tied normal ingress policing to IFB devices. `tc-police(8)` documents policing on the ingress qdisc, while `tc-mirred(8)` shows IFB redirection as the mechanism used when you want to send ingress traffic through an egress qdisc for shaping. I corrected that explanation.
- The policing example used `flowid :1` on a classless ingress qdisc. That is unnecessary and potentially misleading in a pure policing example, so I removed it and made the ingress handle explicit with `handle ffff:` to match the documented pattern.
- The HTB example claimed to be a production shaping pattern but had no parent class capping the aggregate shaped rate. I added a parent `1:1` class at 10 Mbit/s and attached the child classes under it so the example represents a real shaped hierarchy.
- The HTB comments said the high-priority class covered “SSH, DNS,” but the filter only matched SSH. I corrected the comments to match the actual classifier behavior.
- The SSH classifier only matched destination port 22. I added an IPv4 protocol match for TCP (`match ip protocol 6 0xff`) so the example is explicitly classifying outbound SSH client traffic rather than relying on a generic L4 port match.

## Review Notes
- The post is specifically about IPv4 and correctly uses `protocol ip` and `match ip ...` selectors. Equivalent IPv6 examples would need `protocol ipv6` and `ip6` selectors instead.
- Command syntax was sanity-checked against the local `tc` parser, but live runtime testing was not possible in this environment because `tc` operations require network administration privileges and returned `RTNETLINK answers: Operation not permitted`.
