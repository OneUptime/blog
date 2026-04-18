# Validation Summary: How to Configure VMware SD-WAN (VeloCloud) with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- VMware SD-WAN (formerly VeloCloud)
- IPv6 (SLAAC, DHCPv6, RA/RDNSS)
- VMware SD-WAN Orchestrator REST API
- VMware SD-WAN Edge and Gateway
- BGP IPv6 (address-family ipv6 unicast)
- Linux IPv6 tooling (`ip -6`, `sysctl`, `ping6`, `netstat`)
- VCMP (VeloCloud Multipath Protocol) tunnels
- QoS / Business Policy (DSCP EF)

## Sources Consulted
- VMware SD-WAN Orchestrator Admin Guide / Configuration Guide (VMware Docs): https://docs.vmware.com/en/VMware-SD-WAN/
- VMware SD-WAN IPv6 Support documentation (release notes for versions 4.x/5.x)
- RFC 4193 (Unique Local IPv6 Unicast Addresses) — IPv6 address syntax
- RFC 3849 (`2001:db8::/32` reserved for documentation)
- RFC 4861 / RFC 8106 (Router Advertisements, RDNSS)
- Google Public DNS IPv6 addresses documentation (`2001:4860:4860::8888`)
- Linux iproute2 manual pages (`ip(8)`, `sysctl(8)`)
- FRR / Cisco IOS BGP IPv6 address-family configuration references

## Issues Found
- Several illustrative IPv6 addresses used non-hex placeholder labels which are technically invalid IPv6 syntax (IPv6 address segments may only contain hex digits 0-9, a-f, and `-` is not permitted inside a segment). Fixed:
  - `2001:db8:edge-a::/64` → `2001:db8:a::/64` (3 occurrences: LAN config block, REST API JSON body, Business Policy source)
  - `2001:db8::gateway/64` → `2001:db8::1/64` (Gateway interface assignment)
  - `2001:db8::isp-peer` → `2001:db8::2` (BGP neighbor, 2 occurrences)
  - `2001:db8:customer::/48` → `2001:db8:a::/48` (advertised network)
- All replacements stay inside the `2001:db8::/32` documentation-only range (RFC 3849).

## Review Notes
- The VMware SD-WAN Orchestrator REST endpoint `updateEdgeNetworkModuleConfig` and module name `networkRoutes` are illustrative; the actual production endpoint commonly used is `/portal/rest/configuration/updateConfigurationModule` with module names such as `deviceSettings`. The author's example is plausible as a higher-level abstraction and is clearly marked as an example (`orchestrator.example.com`), so it was left as-is.
- `ping6` is deprecated on modern Linux distributions in favor of `ping -6`, but `ping6` still ships on most VeloCloud Edge appliances and continues to work — left unchanged.
- The BGP snippet is presented as commented-out pseudo-configuration (prefixed with `#`), so exact vendor syntax (Cisco vs FRR vs BIRD) is not enforced. Readers should adapt to their platform.
- `RA Interval: 30 seconds` is within the RFC 4861 valid range (default MaxRtrAdvInterval is 600s; valid range 4–1800s). 30s is aggressive but acceptable for SD-WAN LAN segments.
- The custom routing-table number (`table 200`) shown in the verification step is illustrative — actual table IDs on Edge appliances may differ by firmware version.
