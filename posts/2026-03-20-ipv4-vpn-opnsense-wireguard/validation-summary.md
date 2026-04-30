# Validation Summary: How to Configure IPv4 VPN on OPNsense with WireGuard

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OPNsense
- WireGuard
- IPv4
- Firewall rules
- Outbound NAT

## Sources Consulted
- OPNsense WireGuard Road Warrior Setup: https://docs.opnsense.org/manual/how-tos/wireguard-client.html
- OPNsense Virtual Private Networking manual, WireGuard section: https://docs.opnsense.org/manual/vpnet.html
- OPNsense 23.7 release notes: https://docs.opnsense.org/releases/CE_23.7.html
- OPNsense 24.1 release notes: https://docs.opnsense.org/releases/CE_24.1.html
- OPNsense 25.1 release notes: https://docs.opnsense.org/releases/CE_25.1.html
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- `wg-quick(8)` reference: https://man7.org/linux/man-pages/man8/wg-quick.8.html

## Issues Found
- The post said OPNsense WireGuard is a community plugin and instructed readers to install `os-wireguard` unconditionally. I changed this to reflect current OPNsense releases, where WireGuard is built in, while still noting that older releases may require the plugin.
- The instance creation step used the older `VPN → WireGuard → Local` path. I corrected this to `VPN → WireGuard → Instances`, which matches the current OPNsense documentation and UI model.
- The instance step suggested setting the WireGuard instance DNS server to `8.8.8.8`. I changed this to leave the field blank because current OPNsense documentation warns that filling this field can overwrite OPNsense's own DNS configuration.
- The peer step linked the peer to the instance using outdated/incomplete guidance. I corrected it to save the peer and then attach it to the instance via the instance's `Peers` selection, matching the documented OPNsense workflow.
- The interface assignment step incorrectly implied the instance name appears as the assignable port. I corrected this to the actual `wgX` device naming used by OPNsense and added the required `IPv4 Configuration Type: None` and `IPv6 Configuration Type: None` settings.
- The outbound NAT step incorrectly made a manual NAT rule look mandatory for all IPv4 WireGuard setups and hard-coded the source as `10.0.0.0/24`. I corrected it to explain that assigned WireGuard interfaces can already get automatic IPv4 outbound NAT, and that a manual rule is only needed if no suitable automatic rule exists. I also changed the preferred source to `WireGuard net`, with the raw subnet only as the fallback when no interface is assigned.

## Review Notes
- The OPNsense documentation has some version-era inconsistency: current how-to pages still reference plugin installation in places, while official release notes state that WireGuard moved into core in 24.1. The post now reflects current behavior and keeps a compatibility note for older installs.
- The client example is a full-tunnel configuration because it uses `AllowedIPs = 0.0.0.0/0`. The post now keeps the NAT guidance aligned with that example.
- OPNsense also documents optional MSS clamping normalization rules for some WireGuard deployments to avoid TCP fragmentation issues. Their omission does not make the post incorrect for a basic setup, but they could be added in a future revision if broader troubleshooting coverage is desired.
