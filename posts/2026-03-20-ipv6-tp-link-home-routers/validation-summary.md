# Validation Summary: How to Configure IPv6 on TP-Link Home Routers - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- TP-Link Archer home routers
- TP-Link Deco mesh systems
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC
- Router Advertisements and LAN IPv6 address assignment
- Linux IPv6 verification commands (`ip`, `ping`, `dig`, `curl`)

## Sources Consulted
- TP-Link, "How to Set Up IPv6 on TP-Link Wi-Fi Routers" https://www.tp-link.com/uk/support/faq/1525/
- TP-Link, "How to set up an IPv6 internet connection on my Deco" https://www.tp-link.com/uk/support/faq/2642/?app=deco
- TP-Link, "Wi-Fi Router User Guide (For Web)" https://www.tp-link.com/us/document/111858/
- TP-Link, "Set Up Remote Management on TP-Link Routers" https://www.tp-link.com/support/faq/1553/
- IETF RFC 4862, "IPv6 Stateless Address Autoconfiguration" https://datatracker.ietf.org/doc/html/rfc4862
- IETF RFC 7084, "Basic Requirements for IPv6 Customer Edge Routers" https://www.rfc-editor.org/rfc/rfc7084

## Issues Found
- The Archer configuration used `DHCPv6` as the top-level WAN connection type and `SLAAC` as an alternative WAN type. I updated this to TP-Link's current documented `Dynamic IP (SLAAC/DHCPv6)` flow, with `Get IPv6 Connection` and `Prefix Delegation` under Advanced Settings.
- The LAN settings described auto-filled prefix and prefix-length fields plus a `DHCPv6 Server` toggle that do not match TP-Link's current Archer web UI. I replaced these with the documented LAN `Address Type` and `Address Prefix` fields.
- The Deco section used an outdated path (`More → Advanced → IPv6`) and described `DHCPv6` as the main connection type. I updated it to the current documented path `More → Internet Connection → IPv6` and `Dynamic IP` for the common case.
- The router CLI section assumed stock TP-Link home routers expose SSH and OpenWrt-style internals such as `radvd`, `/tmp/radvd.conf`, `pppoe-wan`, `eth0.2`, and `ip6tables`. I replaced that section with supported Archer and Deco status-page checks because those commands are not part of TP-Link's documented stock-firmware workflow.
- The troubleshooting section recommended OpenWrt-specific service restarts and hard-coded PPPoE MTU changes. I replaced it with TP-Link-appropriate checks based on WAN type, prefix delegation, LAN address assignment, and IPv6 firewall rules.
- The sample router IPv6 address `2001:db8:home:1::1` was syntactically invalid because `home` is not valid hexadecimal in an IPv6 hextet. I replaced it with a valid documentation-prefix example and updated `ping6` to `ping -6`.

## Review Notes
- TP-Link UI labels and navigation vary slightly by model, firmware, and region. The post now aligns with TP-Link's current Archer web UI and Deco app documentation, but readers should still expect minor wording differences.
- Validation was done against stock TP-Link home-router firmware and protocol references, not custom OpenWrt installations.
