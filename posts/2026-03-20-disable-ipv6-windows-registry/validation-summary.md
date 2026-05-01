# Validation Summary: How to Disable IPv6 on Windows via Registry

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- IPv6
- Windows Registry
- PowerShell
- NetTCPIP / NetAdapter cmdlets

## Sources Consulted
- Microsoft Learn, "Guidance for configuring IPv6 in Windows for advanced users": https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn, `Set-ItemProperty`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty?view=powershell-7.5
- Microsoft Learn, `Get-ItemProperty`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-itemproperty?view=powershell-7.5
- Microsoft Learn, `Get-NetIPAddress`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `Get-NetAdapterBinding`: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding?view=windowsserver2025-ps
- Microsoft Support, "HomeGroup removed from Windows 10 (Version 1803)": https://support.microsoft.com/en-us/windows/homegroup-removed-from-windows-10-version-1803-07ca5db1-7bca-4d11-68a3-a31ff4a09979

## Issues Found
- The `DisabledComponents` bitmask table mapped several bits to the wrong features. I replaced it with the current Microsoft-documented mapping, including the missing `0x80` IP-TLS flag.
- The post claimed `0x70` disables only 6to4, ISATAP, and Teredo tunnels. Microsoft documents `0x01` as the value that disables all tunnel interfaces while keeping native IPv6 enabled, so I corrected the example and the summary.
- The verification section implied IPv6 could disappear completely and used adapter binding as direct proof. I updated it to note that Windows still keeps internal IPv6 loopback support (`::1`) and that `DisabledComponents` does not unbind `ms_tcpip6` from adapters.
- The summary used HomeGroup as a current example of a Windows feature that depends on IPv6. HomeGroup was removed from Windows 10 version 1803, so I replaced that outdated example with current Microsoft guidance to prefer `0x20` over disabling IPv6 and added the RRAS caveat Microsoft documents.
- I clarified that the PowerShell example must run in an elevated session and that `0xFF` disables IPv6 on interfaces rather than completely removing internal IPv6 support.

## Review Notes
- Microsoft explicitly recommends `0x20` ("Prefer IPv4 over IPv6") instead of disabling IPv6 when possible.
- Windows-specific registry and networking commands were validated against Microsoft documentation; they were not executed in this Linux workspace.
