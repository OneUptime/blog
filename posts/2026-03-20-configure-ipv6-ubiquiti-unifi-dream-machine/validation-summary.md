# Validation Summary: How to Configure IPv6 on Ubiquiti UniFi Dream Machine

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 (SLAAC, DHCPv6, Prefix Delegation, Router Advertisements, ICMPv6)
- Ubiquiti UniFi (UDM, UDM-Pro, UDR, UDM-SE)
- UniFi Network console
- VLANs with IPv6
- IPv6 firewall rules (WAN In, WAN Local)
- DNS over IPv6 (Google, Cloudflare)

## Sources Consulted
- Ubiquiti UniFi Network documentation: https://help.ui.com/hc/en-us/articles/360038597194-UniFi-IPv6
- RFC 4862 (IPv6 Stateless Address Autoconfiguration / SLAAC)
- RFC 8415 (DHCPv6, including Prefix Delegation)
- RFC 4443 (ICMPv6) and RFC 4861 (Neighbor Discovery)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation, 2001:db8::/32)
- Google Public DNS IPv6 addresses (`2001:4860:4860::8888`, `2001:4860:4860::8844`)
- Cloudflare DNS IPv6 addresses (`2606:4700:4700::1111`, `2606:4700:4700::1001`)
- UDM-Pro interface naming conventions (eth8 = RJ45 WAN1)

## Issues Found
1. **Incorrect VLAN subnetting example**: The original example showed `2001:db8::/64`, `2001:db8:10::/64`, and `2001:db8:20::/64` as subnets carved from a `2001:db8::/56` delegation. This is mathematically incorrect — a `/56` prefix only allows 8 bits (bits 57–64) for subnetting, so valid `/64`s must fall within `2001:db8:0:00::/64` through `2001:db8:0:ff::/64`. The values `2001:db8:10::/64` and `2001:db8:20::/64` actually fall outside the `/56` (they would require a `/40` or larger delegation). Fixed by rewriting the example to use `2001:db8:0:00::/64`, `2001:db8:0:10::/64`, and `2001:db8:0:20::/64`, which are correctly within the `/56` and preserve the author's intent of using the VLAN ID as the subnet identifier.

## Review Notes
- The `2001:db8::/32` block is RFC 3849 documentation prefix — appropriately used throughout.
- The placeholder `2001:db8:home::server/128` in the firewall rule example uses non-hex characters ("home", "server") as placeholders. This is clearly illustrative, but readers should know to substitute their own hex-only values.
- The PD size suggestions (56, 60, 64) match common ISP allocations; some ISPs (e.g., Comcast) issue `/60`, others issue `/56`. The advice to try multiple sizes is sound.
- The UniFi UI labels and menu paths reflect the modern UniFi Network console (7.x/8.x UI). Menu wording may shift slightly between releases.
- On the UDM-Pro, `eth8` is the RJ45 WAN1 interface; on a base UDM (non-Pro) the WAN interface name differs (commonly `eth1` / SFP variants), so the SSH commands may need adjustment per device. The post does call this out with the `# or your WAN interface` comment.
- `dhclient6` may not exist as a systemd unit on all UniFi OS versions; the troubleshooting `journalctl` command is best-effort and depends on firmware. Considered low-impact since it's presented as a troubleshooting hint.
- ICMPv6 is correctly noted as required for NDP and PMTUD (RFC 4890 outlines which ICMPv6 types should not be filtered).
