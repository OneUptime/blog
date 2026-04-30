# Validation Summary: How to Configure Source NAT (SNAT) with iptables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- iptables
- Linux IPv4 NAT
- SNAT
- MASQUERADE
- Linux IP forwarding
- Connection tracking
- WireGuard
- OpenVPN

## Sources Consulted
- iptables(8): https://man7.org/linux/man-pages/man8/iptables.8.html
- iptables-extensions(8): https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- iptables-save(8): https://man7.org/linux/man-pages/man8/iptables-save.8.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 1918: https://www.rfc-editor.org/rfc/rfc1918
- ipify API documentation: https://www.ipify.org/

## Issues Found
- The forwarding example used the older `state` match and overly broad forwarding rules. I updated it to `conntrack` with interface-scoped forwarding so the example matches the traffic flow being described.
- The VPN example claimed `SNAT` could keep using the current public IP automatically via command substitution. That command only resolves an address when the rule is added; it does not track later interface changes. I replaced it with a static-IP `SNAT` example and noted that dynamic addresses should use `MASQUERADE`.
- The verification section said `curl https://api.ipify.org` would show the client's private IP before SNAT. Public IP lookup services report the externally visible address, and in this no-SNAT scenario the request would typically fail because return traffic cannot be routed back. I corrected the explanation.
- The persistence example used `sudo iptables-save > /etc/iptables/rules.v4`, which does not elevate the shell redirection and would usually fail with a permission error. I changed it to `sudo sh -c 'iptables-save > /etc/iptables/rules.v4'`.
- The persistence section implied `iptables-save` was saving only NAT rules. I corrected it to say that the file contains the current IPv4 ruleset, including `nat` entries.
- The closing sentence was too absolute about RFC 1918 hosts having "no way" to reach the public internet. I narrowed it to direct communication in this setup, which is consistent with RFC 1918's discussion of mediated gateway access.

## Review Notes
- The post is technically valid for `iptables`, though many current Linux distributions provide `iptables` through the `nf_tables` backend.
- `sysctl -w net.ipv4.ip_forward=1` enables forwarding at runtime only; making it persistent is distribution-specific and not covered here.
- `/etc/iptables/rules.v4` is a distro-specific persistence path commonly used with restore tooling such as `iptables-persistent`.
