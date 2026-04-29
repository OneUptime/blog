# Validation Summary: How to Set Up NAT Masquerade on MikroTik for IPv4

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS
- NAT (Network Address Translation)
- IPv4
- Masquerade / Source NAT (SNAT)
- Destination NAT (DNAT) / Port Forwarding
- Hairpin NAT
- RouterOS firewall connection tracking

## Sources Consulted
- MikroTik official documentation: NAT (https://help.mikrotik.com/docs/spaces/ROS/pages/3211299/NAT)
- MikroTik wiki: Hairpin NAT examples
- MikroTik RouterOS firewall packet flow / chain ordering documentation

## Issues Found
- **Hairpin NAT example used the wrong `dst-address`**: The original rule matched `dst-address=203.0.113.2` (the public IP) in the `srcnat` chain. In RouterOS, `dstnat` runs in PREROUTING and `srcnat` runs in POSTROUTING, so by the time the packet reaches the srcnat chain, the destination address has already been translated to the internal IP. Matching the public IP in srcnat will never match. Fixed to use `dst-address=192.168.1.100` (the post-DNAT internal server IP), which matches MikroTik's documented hairpin NAT pattern. Added a brief inline comment explaining the post-dstnat address requirement.

## Review Notes
- All other configurations were verified against MikroTik RouterOS syntax: `chain=srcnat`/`chain=dstnat`, `action=masquerade`/`action=src-nat`/`action=dst-nat`, `to-addresses`, `to-ports`, `out-interface`, and `src-address`/`dst-address` filters are all correct.
- The SSH port-forward example intentionally omits `dst-address`, which is a valid pattern when the WAN IP is dynamic; the rule will match incoming traffic on any address. Adding `in-interface=ether1` would tighten this if desired but is not required for correctness.
- The verification commands (`/ip firewall nat print`, `/ip firewall nat print stats`, `/ip firewall connection print`, and the `~` regex match) are valid RouterOS syntax.
- The framing of MikroTik masquerade as the equivalent of Linux `iptables MASQUERADE` is accurate.
