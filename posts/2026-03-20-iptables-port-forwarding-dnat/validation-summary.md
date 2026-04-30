# Validation Summary: How to Set Up Port Forwarding with iptables DNAT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iptables
- Linux netfilter / NAT
- DNAT, REDIRECT, MASQUERADE
- Linux IP forwarding (`net.ipv4.ip_forward`)

## Sources Consulted
- `iptables(8)`, `iptables-extensions(8)`, and `iptables-save(8)` man pages from `iptables` 1.8.10, validated locally in the review environment
- Netfilter project overview — https://www.netfilter.org/
- Netfilter `iptables` project page — https://www.netfilter.org/projects/iptables/index.html
- Netfilter NAT HOWTO, section 6 (`DNAT`, `REDIRECT`, `MASQUERADE`) — https://netfilter.org/documentation/HOWTO/NAT-HOWTO-6.html
- Netfilter NAT HOWTO, section 10 (DNAT onto the same network / hairpin case) — https://netfilter.org/documentation/HOWTO/NAT-HOWTO-10.html
- Linux kernel IP sysctl documentation (`net.ipv4.ip_forward`) — https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found

1. **The forwarding examples only allowed one direction of traffic.** The original `FORWARD` rules matched packets going to the internal host, but not the return packets coming back from that host. Added reverse-direction `FORWARD` rules with connection state matching so the examples work correctly when the `FORWARD` policy is restrictive.

2. **The `MASQUERADE` example was incorrect for ordinary DNAT port forwarding.** The post labeled a `POSTROUTING` `MASQUERADE` rule as "return traffic," but that rule would actually rewrite the source of packets heading to the internal server. For standard DNAT port forwarding, no extra `POSTROUTING` rule is required; conntrack reverses the translation on replies automatically. Replaced the command with a note explaining that `SNAT`/`MASQUERADE` is only needed for same-LAN hairpin cases.

3. **The local `OUTPUT` redirect rule was too broad for the stated purpose.** As written, it would redirect all locally generated TCP traffic to destination port 80, including outbound web requests to remote hosts. Restricted it to loopback with `-o lo` so it matches the comment about local loopback connections.

4. **The verification example was ambiguous about where to run `curl`.** The article only defined a `PREROUTING` rule for incoming traffic, so testing from the forwarding host itself can be misleading. Clarified that the `curl` test should be run from another host.

5. **The save command used shell redirection outside `sudo`.** `sudo iptables-save > /etc/iptables/rules.v4` relies on the non-root shell to open the file and can fail with permissions errors. Replaced it with `sudo iptables-save -f /etc/iptables/rules.v4`, which is supported by `iptables-save`.

6. **The description referred to "reverse proxy scenarios," which is not what DNAT provides.** DNAT is packet-level address/port translation, not an application-layer reverse proxy. Adjusted the wording to "traffic redirection scenarios."

## Review Notes
- The commands were validated against `iptables` 1.8.10 with the `nf_tables` backend. The syntax used in the post remains valid on modern Linux systems even when `iptables` is acting as a frontend to nftables.
- `/etc/iptables/rules.v4` is a common path on Debian/Ubuntu-style systems, but automatic restore at boot is distro-specific and usually depends on additional tooling such as `iptables-persistent`.
- The post uses `-m state`, which is still accepted and documented. `-m conntrack` is the more general state-tracking match module on modern systems, but the current examples remain valid.
