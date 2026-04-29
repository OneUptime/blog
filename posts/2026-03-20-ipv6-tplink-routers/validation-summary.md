# Validation Summary: How to Configure IPv6 on TP-Link Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- TP-Link Archer / Deco routers
- DHCPv6 Prefix Delegation
- SLAAC
- Router Advertisements
- DHCPv6
- Windows `ipconfig`
- Linux `ip` / `ping`
- DNS `nslookup`

## Sources Consulted
- TP-Link: How to Set Up IPv6 on TP-Link Wi-Fi Routers — https://www.tp-link.com/us/support/faq/1525/
- TP-Link: How to set up an IPv6 internet connection on my Deco — https://www.tp-link.com/support/faq/2642/?app=deco
- TP-Link: How to set up IPv6 service on the TP-Link wireless router — https://www.tp-link.com/us/support/faq/852/
- TP-Link: How to configure IPv6 settings on modem router (self-developed UI) — https://www.tp-link.com/us/support/faq/857/
- TP-Link Archer C6 V1 User Guide PDF — https://static.tp-link.com/upload/manual/2022/202206/20220607/1910013208_Archer%20C6%28US%29_UG_V1.pdf
- TP-Link TL-WR840N V6.2 User Guide — https://www.tp-link.com/us/user-guides/TL-WR840N_V6.2/chapter-4-configure-the-router-in-standard-wireless-router-mode
- TP-Link TD-W9960 V1.2 User Guide — https://www.tp-link.com/us/user-guides/TD-W9960_V1.2/chapter-13-specify-your-network-settings
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration — https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8106: IPv6 Router Advertisement Options for DNS Configuration — https://datatracker.ietf.org/doc/html/rfc8106
- RFC 7084: Basic Requirements for IPv6 Customer Edge Routers — https://datatracker.ietf.org/doc/rfc7084/
- Microsoft Learn: `ipconfig` — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Debian man page: `nslookup(1)` — https://manpages.debian.org/trixie/bind9-dnsutils/nslookup.1.en.html
- Local CLI help/output checked with `ip -6 addr help`, `ping -h`, and `ping6 -h`

## Issues Found
- The introduction said Archer and Deco models expose IPv6 through the web UI and the Tether app. I corrected this to web UI for routers and the Deco app for Deco systems, matching TP-Link’s current documentation.
- The prerequisites implied `192.168.0.1` is a general admin URL. I changed this to `tplinkwifi.net` or the router’s current LAN IP, because the default IP varies by model and user configuration.
- The WAN section used outdated or inconsistent connection type names (`PPPoEv6`, `Static IPv6`) and omitted `Pass-Through (Bridge)`. I aligned the labels with current TP-Link router documentation.
- The post told readers to set a delegated prefix length such as `/56` or `/48` manually. Current TP-Link home-router guidance documents enabling `Prefix Delegation` and using `Auto` for address acquisition instead; the ISP assigns the delegated prefix size.
- The LAN section treated one set of mode names as universal and said DHCPv6 provides all configuration. I rewrote this to reflect TP-Link’s model-dependent labels (`RADVD`, `SLAAC + RDNSS`, `SLAAC + Stateless DHCP`, `DHCPv6`) and clarified that IPv6 clients still learn the default gateway from Router Advertisements.
- The LAN prefix instructions implied manual `/64` entry even when prefix delegation is enabled. I changed this to keep the LAN prefix/site-prefix setting on `Delegated` / `Get from Prefix Delegation` unless the ISP explicitly requires manual prefix configuration.
- The router verification section pointed readers to `System Tools > Diagnostics`, which is not the standard IPv6 status path in the official guides I checked. I corrected it to model-appropriate IPv6 status pages.
- The Linux example used `ping6`, which still exists on many systems but is documented as the same unified `ping` binary here. I changed the example to `ping -6` for the clearer current form.
- The Linux example said `nslookup -type=AAAA example.com` verifies DNS “works over IPv6”. That command verifies AAAA resolution, not necessarily that the DNS transport itself used IPv6. I corrected the explanation.
- The troubleshooting section used `rdisc6`, which is not a standard default command on most Linux installations. I replaced it with standard `ip` commands and clarified the Router Advertisement dependency for DHCPv6 clients.
- The Deco section referenced the Tether app and an incorrect menu path. I changed it to the documented Deco app path and noted the IPv6 firewall-rules control that TP-Link documents on that page.
- The conclusion overstated the outcome by saying all connected devices receive globally routable IPv6 addresses enabling direct communication without NAT. I softened this to “can receive” and noted that inbound access still depends on firewall rules.

## Review Notes
- TP-Link’s IPv6 UI differs materially across hardware generations and firmware lines. The post is now accurate as a cross-model guide, but model-specific screenshots or exact field names would still need to be checked against the target product manual.
- Some older TP-Link models still expose legacy options such as `PPPoEv6`, `RADVD`, or `6to4`; current home-router guidance centers on `Dynamic IP`, `PPPoE`, `Pass-Through (Bridge)`, and `Static IP`.
- `ping6` remains available on many Linux systems as an alias or alternative entry point, but `ping -6` is the clearer documented usage on current iputils-based systems.
