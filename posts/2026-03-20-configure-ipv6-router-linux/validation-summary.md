# Validation Summary: How to Configure an IPv6 Router on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux IPv6 networking
- sysctl (net.ipv6.conf.all.forwarding)
- iproute2 (`ip -6 addr`, `ip -6 route`)
- radvd (Router Advertisement Daemon)
- ip6tables (Linux netfilter for IPv6)
- systemd (service management)
- IPv6 SLAAC and Router Advertisements (RFC 4861, RFC 4862)

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (https://datatracker.ietf.org/doc/html/rfc4861)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (https://datatracker.ietf.org/doc/html/rfc4862)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (https://datatracker.ietf.org/doc/html/rfc3849)
- radvd.conf(5) man page (https://www.litech.org/radvd/)
- Linux kernel networking documentation: ip-sysctl.txt (Documentation/networking/ip-sysctl.rst)
- iproute2 manual pages (ip-address.8, ip-route.8)
- ip6tables(8) man page (netfilter.org)
- Cloudflare 1.1.1.1 IPv6 documentation — confirms 2606:4700:4700::1111

## Issues Found
No technical issues found.

All technical content was verified:
- `net.ipv6.conf.all.forwarding=1` is the correct sysctl to enable IPv6 forwarding.
- Documentation prefix `2001:db8::/32` is used correctly per RFC 3849.
- `ip -6 addr add` and `ip -6 route add` syntax matches iproute2 documentation.
- radvd configuration syntax (including trailing `};` on blocks) matches radvd.conf(5).
- radvd parameters (`AdvSendAdvert`, `AdvManagedFlag`, `AdvOtherConfigFlag`, `MinRtrAdvInterval`, `MaxRtrAdvInterval`, `AdvOnLink`, `AdvAutonomous`, `AdvRouterAddr`, `AdvValidLifetime`, `AdvPreferredLifetime`) all exist and behave as described. Values used are within valid ranges.
- ip6tables commands and FORWARD chain semantics with `-m state --state ESTABLISHED,RELATED` are correct.
- `2606:4700:4700::1111` is a valid Cloudflare public DNS IPv6 address.
- The note about RA-learned default routes appearing as `proto ra` in `ip -6 route show default` is accurate.

## Review Notes
- `ping6` is deprecated on modern Linux distributions in favor of unified `ping` (iputils >= s20161105), but `ping6` is still provided for backward compatibility on most distros and works as shown.
- The `-m state` match in iptables/ip6tables is technically older syntax; the conntrack module (`-m conntrack --ctstate ESTABLISHED,RELATED`) is the more modern equivalent. Both still work.
- Saving rules to `/etc/ip6tables.rules` via `ip6tables-save` does not by itself make rules persistent across reboots. On Debian/Ubuntu, the `iptables-persistent` (or `netfilter-persistent`) package or a custom systemd unit is needed to restore them at boot. This is implied by "Save the rules" but not made fully explicit — not a technical error.
- The example firewall rules do not explicitly allow ICMPv6 in the FORWARD chain. For full IPv6 functionality, RFC 4890 recommends permitting certain ICMPv6 message types (e.g., Packet Too Big for PMTUD) even on stateful firewalls. The current rules permit ICMPv6 implicitly via the ESTABLISHED,RELATED rule for return traffic, but a stricter firewall in production should explicitly handle ICMPv6 per RFC 4890. This is a defensible omission for a basic setup tutorial.
- Setting `net.ipv6.conf.all.forwarding=1` causes the kernel to stop accepting Router Advertisements on all interfaces (the system now acts as a router). This is correct behavior and consistent with the post's intent, but is a side effect worth being aware of when running a hybrid host that also wants to receive RAs.
