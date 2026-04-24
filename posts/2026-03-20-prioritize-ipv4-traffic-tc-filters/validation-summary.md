# Validation Summary: How to Prioritize IPv4 Traffic by Port Using tc Filters and Classes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traffic control (`tc`)
- HTB (`htb`) queueing discipline
- `fq_codel`
- `flower` and `fw` traffic classifiers
- `iptables` mangle table targets (`MARK`, `DSCP`)
- IPv4 DSCP / DiffServ

## Sources Consulted
- `tc(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-htb(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-htb.8.html
- `tc-u32(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-fw(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-fw.8.html
- `tc-flower(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-flower.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- RFC 2474, Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers: https://www.rfc-editor.org/info/rfc2474
- RFC 3246, An Expedited Forwarding PHB (Per-Hop Behavior): https://datatracker.ietf.org/doc/html/rfc3246
- Local CLI help for `tc` and `iptables` (`tc -help`, `tc ... help`, `iptables -j DSCP -h`)

## Issues Found
- The original post used `u32` destination-port matches (`match ip dport ...`) as if they were straightforward L4 filters. Upstream `tc-u32(8)` documents that direct L4 port matching is unsafe because it assumes a minimal IPv4 header and suitable transport header offsets. I replaced the exact port examples with protocol-aware `flower` filters and kept the port-range example on a `fw` mark path that is valid for `tc`.
- The original post hard-coded `burst 15k` on HTB classes at `100mbit`. `tc-htb(8)` and the local `htb help` output show that burst sizing is rate- and timing-dependent, so a fixed `15k` recommendation is not generally correct at that speed. I removed the hard-coded burst values and left `tc` to compute suitable defaults.
- The opening description implied generic "network congestion" handling, but HTB on `eth0` shapes outbound traffic on that interface. I tightened the wording to make the scope explicitly egress traffic on the shaped link.
- The original DNS filter matched only by port number without distinguishing transport protocol. After switching to protocol-aware filters, I added both UDP and TCP port 53 rules so the post still covers DNS accurately.
- The DSCP example used `OUTPUT`, which only covers locally generated packets. I changed it to `POSTROUTING -o eth0` so the example better aligns with egress classification on `eth0`, including forwarded traffic leaving that interface.

## Review Notes
- The post is now technically sound for outbound shaping on `eth0`. Inbound prioritization would require a different design, such as ingress redirection to an IFB device.
- The `iptables` examples remain valid on current Linux systems, but some environments prefer equivalent `nftables` rules operationally.
