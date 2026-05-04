# Validation Summary: How to Configure IPv6 on Netgear Home Routers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6
- Netgear Nighthawk routers (AX12, AX8, RAX200, AC1900, AC2300, AC3200)
- Netgear Orbi mesh systems (RBK852, RBK753, RBK50)
- DHCPv6 / DHCPv6-PD (Prefix Delegation)
- SLAAC / Router Advertisements
- 6to4 tunneling
- PPPoEv6
- Windows ipconfig / ping diagnostics

## Sources Consulted
- Netgear support knowledge base on IPv6 configuration (kb.netgear.com / support articles for Nighthawk and Orbi IPv6 settings)
- Netgear router admin URLs: routerlogin.net (Nighthawk) and orbilogin.net (Orbi) — documented in Netgear quick start guides
- Google Public DNS IPv6 documentation (2001:4860:4860::8888) — developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IPv6 documentation (2606:4700:4700::1111) — developers.cloudflare.com/1.1.1.1
- RFC 3633 (IPv6 Prefix Delegation via DHCPv6)
- RFC 4861 (Neighbor Discovery / Router Advertisement)
- Microsoft Windows command reference for ipconfig, findstr, and ping (-6 flag)

## Issues Found
- The original Description metadata claimed the post covered configuration "through the web admin interface and Netgear mobile app", but the post does not actually cover the Nighthawk/Orbi mobile app. Removed the mobile app reference from the description so it accurately describes the post's scope.

## Review Notes
- The IPv6 connection mode list (None, Auto Detect, Auto Config, 6to4 Tunnel, Fixed, DHCP, PPP, Pass Through) accurately matches the modes available on Netgear's Advanced Setup → IPv6 page across recent Nighthawk firmware revisions. Some firmware also exposes a "6rd Tunnel" option, but its omission is acceptable for a generic guide.
- Default credentials `admin`/`password` are the historical factory defaults; modern Netgear firmware forces a password change at first setup, so the parenthetical "change this if you haven't" is appropriate guidance.
- The PowerShell-tagged code block contains `ipconfig | findstr /i "IPv6"` and `ping -6 ipv6.google.com -n 4`. Both commands work in PowerShell (findstr is available as an external command) and in cmd.exe; the tagging is acceptable.
- /56 and /60 are the most common DHCPv6-PD prefix lengths from consumer ISPs; some ISPs (notably Comcast/Xfinity) deliver /60 by default, while others (e.g. some European ISPs) deliver /56 or /48. The "ask ISP" caveat is correct.
- Google IPv6 DNS (2001:4860:4860::8888) and Cloudflare IPv6 DNS (2606:4700:4700::1111) are verified correct.
- The verification commands and admin-panel paths (Advanced → Administration → Router Status, Advanced → Advanced Setup → IPv6) match Netgear's current Nighthawk web UI.
