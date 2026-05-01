# Validation Summary: How to Enable IPv6 on Your Home Router

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- DHCPv6
- DHCPv6 Prefix Delegation
- SLAAC
- PPPoE
- Consumer router IPv6 configuration
- IPv6 DNS resolvers

## Sources Consulted
- ASUS Official Support, "[IPv6] How to set up IPv6 in ASUS router?" https://rog.asus.com/support/faq/113990/
- ASUS Official Support, "[Wireless Router] How to access my ASUS router’s web GUI setting page via HTTPS?" https://www.asus.com/global/support/faq/1045854/
- TP-Link, "Wi-Fi Router User Guide (For Web)" https://www.tp-link.com/us/document/111858/
- NETGEAR Support, "How do I set up an IPv6 Internet connection on my NETGEAR router?" https://kb.netgear.com/24006/How-do-I-set-up-an-IPv6-Internet-connection-on-my-NETGEAR-router
- Linksys Support, "Overview of the Connectivity Tool in Linksys Smart WiFi" https://support.linksys.com/kb/article/292-en/
- IETF RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" https://datatracker.ietf.org/doc/html/rfc8415
- IETF RFC 4862, "IPv6 Stateless Address Autoconfiguration" https://datatracker.ietf.org/doc/html/rfc4862
- IETF RFC 8106, "IPv6 Router Advertisement Options for DNS Configuration" https://datatracker.ietf.org/doc/html/rfc8106
- IETF RFC 7084, "Basic Requirements for IPv6 Customer Edge Routers" https://datatracker.ietf.org/doc/html/rfc7084
- IETF RFC 6177, "IPv6 Address Assignment to End Sites" https://datatracker.ietf.org/doc/html/rfc6177
- RFC 7526, "Deprecating the Anycast Prefix for 6to4 Relay Routers" https://www.rfc-editor.org/rfc/rfc7526.html
- Microsoft Learn, "`ipconfig`" https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Apple Support, "Use IPv6 on Mac" https://support.apple.com/guide/mac-help/mchlp2499/mac
- Google for Developers, "Google Public DNS" https://developers.google.com/speed/public-dns/docs/using
- Cloudflare Docs, "IP addresses" https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- Quad9, "Service Addresses & Features" https://quad9.net/service/service-addresses-and-features/
- test-ipv6.com https://test-ipv6.com/

## Issues Found
- The prerequisite said to test IPv6 "from any device". I changed this to a device connected to the home network, because testing from another network would not validate the router and ISP being configured.
- The ASUS default admin address example was outdated for current official documentation. I changed it to `asusrouter.com` or `192.168.50.1`.
- The Linksys settings path was incorrect. I changed `Connectivity → Local Network → IPv6` to `Connectivity → Internet Settings → IPv6` based on Linksys support documentation.
- The connection-type table conflated WAN connection modes with DHCPv6 prefix delegation and listed `Teredo`, which Microsoft documents as a host transition technology rather than a typical home-router WAN setting. I replaced those rows with vendor-documented router modes and transition-tunnel wording.
- The original guidance implied DHCPv6 means a fixed prefix and that prefix delegation is a standalone connection type. I corrected the descriptions to reflect native IPv6, DHCPv6, and DHCPv6-PD accurately.
- The prefix-delegation example hard-coded `WAN IPv6 Type: DHCPv6`, used an overly narrow prefix-size example, and treated `SLAAC + RDNSS` as a universal router mode. I changed it to use the ISP-required WAN mode, automatic or ISP-documented prefix sizes, and more accurate LAN autoconfiguration wording.
- The macOS verification step assumed the active interface is always `en0`. I replaced it with the System Settings path, which is correct across Mac configurations.
- The troubleshooting and conclusion text were updated so they no longer imply that DHCPv6 is always the right WAN choice or that prefix size is always manually selectable.

## Review Notes
- Router UI labels vary by model and firmware, even within the same vendor. The corrected post now uses vendor-documented terminology but still should be read as model-dependent guidance.
- Some ISPs do not allow customers to choose the delegated prefix length directly. In those cases, the router may expose only an automatic setting or a prefix-length request.
- `6to4` is a legacy transition mechanism and should be used only when specifically required. Native IPv6, or an ISP-documented transition method such as `6rd`, is preferable.
