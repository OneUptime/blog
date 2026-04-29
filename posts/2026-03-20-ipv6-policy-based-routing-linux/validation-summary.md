# Validation Summary: How to Configure IPv6 Policy-Based Routing on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 routing on Linux
- `iproute2` (`ip rule`, `ip route`, routing tables)
- Policy-based routing (RPDB)
- `ip6tables` packet marking
- `systemd-networkd` persistent route and rule configuration

## Sources Consulted
- `ip-rule(8)` — https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `ip-route(8)` — https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables-extensions(8)` — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `systemd.network(5)` — https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html

## Issues Found

1. **The routing decision flow was too simplified and technically incorrect.** The original diagram implied that if a matching rule's routing table did not contain a route, processing stopped immediately with `UNREACHABLE`. Per `ip-rule(8)`, the RPDB continues with later rules unless the action returns a terminal failure. Updated the diagram and explanation to reflect that behavior.

2. **The example IPv6 next-hop addresses were invalid.** `fe80::isp1` and `fe80::isp2` are not valid IPv6 literals. Replaced them with valid example link-local addresses (`fe80::1` and `fe80::2`) and updated the verification comments accordingly.

3. **The `rt_tables` example omitted the required privilege escalation.** Writing to `/etc/iproute2/rt_tables` normally requires root privileges. Changed the commands to use `sudo tee -a` so the example works as shown.

4. **The firewall-mark example overgeneralized what the rule marks.** The command uses the `OUTPUT` chain, which applies to locally generated packets, not all traffic. Clarified the comment so the example matches the actual behavior described in `iptables-extensions(8)`.

5. **The persistence section only persisted rules, not the per-table routes they depend on.** Policy routing will not survive a reboot correctly if the custom table routes are missing. Added the table routes to the startup-script example and added matching `[Route]` sections to the `systemd-networkd` example.

6. **The `systemd-networkd` family value was normalized to the documented form.** Changed `Family=IPv6` to `Family=ipv6` to match the value format documented by `systemd.network(5)`.

## Review Notes
- The `ip6tables` example is technically valid, but many modern distributions default to nftables or the iptables-nft compatibility layer. A future revision could add an equivalent nftables example for completeness.
- The `rt_tables` commands append entries each time they are run, so repeated execution can create duplicate named table mappings. This does not invalidate the post, but a more idempotent provisioning example would be better for automation-focused readers.
