# Validation Summary: How to Configure IPv6 MTU on Windows Interfaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- IPv6
- MTU and PMTU
- PowerShell (`Get-NetIPInterface`, `Set-NetIPInterface`, `Get-NetAdapter`)
- `netsh`
- Windows `ping`
- WireGuard
- OpenVPN

## Sources Consulted
- Microsoft Learn: Get-NetIPInterface — https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: Set-NetIPInterface — https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: Get-NetAdapter — https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: netsh interface — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: ping — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Learn: MSFT_NetIPInterface class — https://learn.microsoft.com/en-us/windows/win32/fwp/wmi/nettcpipprov/msft-netipinterface
- Microsoft Learn: MSFT_NetAdapter class — https://learn.microsoft.com/en-us/windows/win32/fwp/wmi/netadaptercimprov/msft-netadapter
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- WireGuard for Windows: Network Configuration Quirks — https://git.zx2c4.com/wireguard-windows/about/docs/netquirk.md
- wg-quick(8) manual page — https://www.man7.org/linux/man-pages/man8/wg-quick.8.html
- OpenVPN 2.6 Manual — https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/

## Issues Found
- The `Set-NetIPInterface` examples used `-NlMtu`, but the documented parameter name is `-NlMtuBytes`. I updated all PowerShell MTU-setting commands to use the correct parameter.
- The post used `netsh interface ipv6 show interface "Ethernet"`, which is not the documented syntax in current Microsoft Learn. I replaced it with `netsh interface ipv6 show interfaces interface="Ethernet" level=verbose`.
- The adapter-inspection example selected `LinkLayerAddress`, which was not a documented `Get-NetAdapter` property in the Microsoft sources reviewed. I replaced it with documented properties while preserving the intent of showing MTU-related adapter details.
- The PMTU test example used `ping -6 -l 1452 -f` and described IPv4 header math. On current Windows documentation, `/f` is IPv4-only, and a 1452-byte IPv6 ICMP payload corresponds to `1500 - 40 IPv6 - 8 ICMPv6`. I corrected both the command syntax and the explanation.
- The introduction described tunnel adapter MTU behavior in a way that was less directly supported by the documentation. I reworded it to the documented behavior that `NlMtu` defaults to the link's natural MTU unless overridden.
- The built-in VPN example used `$vpnAdapter.ifIndex` and did not include hidden adapters. I corrected it to use the documented `InterfaceIndex` property, added `-IncludeHidden`, and updated the MTU-setting parameter name.

## Review Notes
- The post is valid as a Windows networking guide after the fixes above.
- Tunnel/interface aliases can vary between systems and VPN products, so readers may still need to substitute their local adapter names when running the example commands.
