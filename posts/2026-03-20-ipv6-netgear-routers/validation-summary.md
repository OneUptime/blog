# Validation Summary: How to Configure IPv6 on Netgear Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- NETGEAR consumer router administration
- NETGEAR Nighthawk routers
- NETGEAR Orbi mesh routers
- DHCPv6
- IPv6 prefix delegation
- SLAAC
- Windows and Linux network troubleshooting commands

## Sources Consulted
- NETGEAR Support: Auto-detect IPv6 on Nighthawk routers: https://kb.netgear.com/24008/How-do-I-use-auto-detection-to-set-up-an-IPv6-Internet-connection-on-my-Nighthawk-router
- NETGEAR Support: DHCP IPv6 on Nighthawk routers: https://kb.netgear.com/24013/How-do-I-set-up-a-IPv6-Internet-connection-with-a-DHCP-server-on-my-Nighthawk-router
- NETGEAR Support: Fixed IPv6 on Nighthawk routers: https://kb.netgear.com/24012/How-do-I-set-up-a-fixed-IPv6-Internet-connection-on-my-Nighthawk-router
- NETGEAR Orbi WiFi 6 Dual-band Mesh System User Manual: https://www.downloads.netgear.com/files/GDC/RBK352/RBK352_RBK353_UM_EN.pdf
- NETGEAR Nighthawk Pro Gaming Router User Manual: https://www.downloads.netgear.com/files/GDC/XR300/XR300_UM_EN.pdf
- Microsoft Learn: `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `ping`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- IETF RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- IETF RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc8415
- Local CLI help output used to verify Linux command syntax: `ip -help`, `ip address help`, `ip route help`, `ping -h`, `curl --help all`

## Issues Found
- The post described an unsupported fallback menu path of **Internet Setup > IPv6**. I changed it to note the alternate documented path **Settings > Advanced Settings > IPv6** used on some NETGEAR models.
- The post incorrectly described **Auto Config** as the common mode when an ISP provides DHCPv6. I corrected this to distinguish **Auto Detect** from **Auto Config**, matching NETGEAR's documented meanings.
- The DHCP section included fields that NETGEAR consumer router IPv6 pages do not document for DHCP mode, including **Use This Router's MAC Address** and a manually entered delegated **Prefix Length**. I replaced those with the documented DHCPv6 fields and behavior.
- The LAN section referred to **LAN Address Type**, explicit Router Advertisement toggles, **STATELESS/STATEFUL** address-type controls, advertisement lifetime, and LAN-side DNS fields that do not match the documented NETGEAR IPv6 UI. I rewrote this section to use the documented **IP Address Assignment**, **Use DHCP Server**, **Auto Config**, and **Use This Interface ID** options.
- The client test block incorrectly grouped Linux and macOS together even though `ip` is not a standard macOS command. I narrowed the CLI example to Linux and kept the Windows example separate.
- The troubleshooting section used distro-specific or non-portable guidance (`dhclient -6 -v eth0`, `rdisc6`) and drew conclusions that were too strong. I replaced those with verifiable checks based on observed WAN/LAN IPv6 addresses, Linux `ip` commands, and ISP prefix delegation behavior.
- The conclusion overstated the role of **Auto Config** and used **STATELESS** as if it were a NETGEAR UI setting. I updated it to reflect the documented WAN mode selection and LAN **Auto Config** behavior.

## Review Notes
- NETGEAR's IPv6 UI varies by product line and firmware. The corrected post now reflects documented patterns across both traditional Nighthawk firmware and DumaOS-style Nighthawk pages, plus Orbi manuals.
- Some models also support additional IPv6 WAN types such as PPPoE, 6to4, 6rd, and Pass Through. Their omission is acceptable for a general guide, but readers should still follow the connection type documented by their ISP.
