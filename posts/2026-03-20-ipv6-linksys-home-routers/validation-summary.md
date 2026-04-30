# Validation Summary: How to Configure IPv6 on Linksys Home Routers - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Linksys Smart Wi-Fi routers
- Linksys Velop / Intelligent Mesh
- OpenWrt
- Linux networking CLI tools (`ip`, `ping6`, `traceroute6`, `curl`)
- Windows PowerShell (`Get-NetIPAddress`)

## Sources Consulted
- Linksys Support: How to access Linksys Smart Wi-Fi through a web browser — https://support.linksys.com/kb/article/73-en/
- Linksys Support: How to disable IPv6 on your Linksys router — https://support.linksys.com/kb/article/88-en/
- Linksys Support: Overview of the Connectivity Tool in Linksys Smart Wi-Fi — https://support.linksys.com/kb/article/2893/
- Linksys Support: Overview of the Advanced Settings on the Linksys app for Mesh system — https://support.linksys.com/kb/article/148-en/
- Linksys Support: Accessing the web interface of the Linksys WHW03 — https://support.linksys.com/kb/article/639-en/
- Linksys Support: DHCPv6 PD feature in the Linksys Velop and routers — https://support.linksys.com/kb/article/448-en/?section_id=75
- Linksys EA6900 User Guide — https://downloads.linksys.com/downloads/userguide/1224699372213/MAN_EA6900_8220_01617A00_Userguide_EN.pdf
- OpenWrt Wiki: IPv6 configuration — https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt Wiki: Techdata: Linksys WRT3200ACM v1 — https://openwrt.org/toh/hwdata/linksys/linksys_wrt3200acm
- OpenWrt Wiki: Linksys WRT32X — https://openwrt.org/toh/linksys/wrt32x
- Microsoft Learn: Get-NetIPAddress (NetTCPIP) — https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: NL_PREFIX_ORIGIN enumeration — https://learn.microsoft.com/en-us/windows-hardware/drivers/network/nl-prefix-origin
- curl tool man page — https://curl.se/docs/manpage.html
- traceroute(8) Linux manual page — https://man7.org/linux/man-pages/man8/traceroute.8.html
- Local command help: `ping6 -h`, `ip -h`, and `curl --help all`

## Issues Found
- The stock Linksys Smart Wi-Fi IPv6 section was overstated. The original draft listed `Automatic Configuration - DHCPv6`, `SLAAC`, `Static IPv6 Address`, `6to4`, a `DHCP-PD` toggle, prefix-size requests, and LAN RA/DNS controls that do not match Linksys' documented Smart Wi-Fi IPv6 settings. I replaced that block with the documented `IPv6 Automatic`, `DUID`, and `6rd Tunnel` fields.
- The post treated `WRT32X` as a normal stock-firmware DHCPv6-PD example. Linksys' DHCPv6-PD support article explicitly excludes `WRT32X`, so I added that caveat while keeping `WRT32X` in the OpenWrt section because OpenWrt still supports the hardware.
- The Velop section used the wrong app/web navigation path and included unsupported claims about child-node RA propagation, all nodes serving the same `/64`, and default IPv6 firewall behavior. I replaced those statements with the documented Linksys app/web paths and the vendor's Bridge mode guidance for problematic DHCPv6-PD combinations.
- The OpenWrt CLI example restarted networking before the LAN `ip6assign` change was committed. I moved the restart to after all `uci` changes so the example applies coherently.
- The troubleshooting section referenced undocumented RA advertisement and RA interval controls in stock Linksys firmware. I replaced those with supported mode-selection, MTU, and model-specific guidance.

## Review Notes
- Linksys consumer IPv6 options vary by model and firmware. The revised post now stays within settings Linksys publicly documents instead of assuming advanced IPv6 toggles exist across all EA/WRT/Velop products.
- `traceroute6` remains acceptable in the diagnostics section; Linux traceroute documentation states it is equivalent to `traceroute -6`.
