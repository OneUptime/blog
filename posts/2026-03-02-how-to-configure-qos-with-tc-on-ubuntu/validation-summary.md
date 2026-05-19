# Validation Summary: How to Configure QoS with tc on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Linux traffic control
- iproute2 `tc`
- `tbf`, `htb`, `fq_codel`, and `u32`
- systemd service units
- DSCP/Differentiated Services

## Sources Consulted
- Linux `tc(8)` manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- Linux `tc-tbf(8)` manual page: https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- Linux `tc-htb(8)` manual page: https://man7.org/linux/man-pages/man8/HTB.8.html
- Linux `tc-u32(8)` manual page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- RFC 2474, Definition of the Differentiated Services Field: https://www.rfc-editor.org/rfc/rfc2474
- Local `tc` from iproute2 6.1.0 command help and local man pages

## Issues Found
- The post described `tc` as available on every Ubuntu installation and implied control over any Linux interface. Changed this to standard Ubuntu installations and Linux network interfaces to avoid overclaiming.
- The post stated that the default qdisc is `pfifo_fast`, then later stated that Ubuntu 22.04 uses `fq_codel`. Updated the explanation to distinguish the kernel fallback from Ubuntu systems that configure `fq_codel`, and changed the example to tell readers to verify `net.core.default_qdisc`.
- The ingress explanation said incoming traffic control requires an `ifb` device. Updated it to distinguish direct ingress filtering/policing from ingress shaping, which usually uses `ifb` redirection.
- The TBF example used `burst 32kbit`, while `tc-tbf` documents `burst` as a size in bytes. Changed the example to `burst 32kb`.
- The `u32` port filters matched destination ports without first matching the IP protocol. Added explicit TCP or UDP protocol matches so port classification does not rely on an unsafe layer-four assumption.
- The persistence commands wrote to `/usr/local/bin` and `/etc/systemd/system` without privilege elevation. Changed the heredocs to use `sudo tee` and changed `chmod` to `sudo chmod`.

## Review Notes
The remaining examples are technically valid for IPv4 egress shaping. The `u32` examples intentionally remain simple; production configurations may also need IPv6 filters, interface-specific names, `network-online.target` ordering, or more robust handling for fragmented packets and non-standard IP headers.
