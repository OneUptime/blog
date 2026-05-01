# Validation Summary: How to Configure Dual-Stack IPv4/IPv6 on Windows Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Server networking
- IPv4
- IPv6
- PowerShell
- NetTCPIP cmdlets
- Windows Firewall / NetSecurity
- Windows networking command-line tools

## Sources Consulted
- Microsoft Learn: New-NetIPAddress — https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: New-NetRoute — https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute?view=windowsserver2025-ps
- Microsoft Learn: Set-DnsClientServerAddress — https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: Test-NetConnection — https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps
- Microsoft Learn: New-NetFirewallRule — https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2025-ps
- Microsoft Learn: ping — https://learn.microsoft.com/en-gb/windows-server/administration/windows-commands/ping
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users — https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: Dual-Stack Sockets for IPv6 Winsock Applications — https://learn.microsoft.com/en-us/windows/win32/winsock/dual-stack-sockets
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The verification examples used `ping -4` and `ping -6`, but Microsoft documents the Windows `ping` switches as `/4` and `/6`. I updated both commands to the documented Windows syntax.
- The IPv6 preference example did not mention that `DisabledComponents` changes require a restart to take effect, and it did not explicitly create the registry value as `REG_DWORD`. I updated the example to use `New-ItemProperty -PropertyType DWord -Force` and added the restart note.
- The conclusion stated that applications receive connections on both protocols "without modification." Microsoft’s Winsock documentation is narrower: applications need separate IPv4/IPv6 listeners or a dual-stack socket configuration to accept both kinds of connections. I corrected that statement.

## Review Notes
- The sample IPv6 addresses use the documentation prefix `2001:db8::/32`, which is appropriate for examples, but readers must replace the sample addresses, gateway, and DNS settings with values valid for their own network.
