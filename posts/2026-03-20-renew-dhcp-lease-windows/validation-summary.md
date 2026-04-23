# Validation Summary: How to Renew a DHCP Lease on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- DHCP
- Command Prompt (`ipconfig`, `netsh`, `findstr`)
- PowerShell (`Get-NetIPInterface`, `Get-NetIPAddress`, `Get-WinEvent`)
- Windows Event Viewer / DHCP client event logs

## Sources Consulted
- Microsoft Learn: `ipconfig` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `netsh interface` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `findstr` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Learn: `Get-NetIPInterface` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Get-WinEvent` - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.6
- Microsoft Learn: Troubleshoot problems on the DHCP client - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/troubleshoot-problems-dhcp-client
- Microsoft Learn: Netsh Commands for Network Trace - https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-R2-and-2012/jj129382(v=ws.11)
- Microsoft Support: Fix network connection issues in Windows - https://support.microsoft.com/en-au/windows/fix-network-connection-issues-in-windows-166a28c4-14c1-bdb1-473c-09c1571455d8

## Issues Found
- The description implied DHCP renewal always gets a new IP address. I changed it to say Windows requests fresh DHCP network settings, which may renew the same address or receive a different one.
- The PowerShell example filtered adapters by `Status -eq "Up"` instead of whether DHCP is enabled. I changed it to use `Get-NetIPInterface -AddressFamily IPv4 -Dhcp Enabled -ConnectionState Connected`, which better matches the behavior of `ipconfig /release` and `ipconfig /renew`.
- The GUI method stated that disabling and re-enabling an adapter always requests a new lease. I corrected this to apply when the adapter is configured for DHCP.
- The `netsh` example used incorrect syntax (`admin=disable` / `admin=enable`) and incorrectly described the action as disabling and re-enabling DHCP. I corrected the syntax to `admin=DISABLED` / `admin=ENABLED`, added `name=`, and clarified that it resets the adapter.
- The DNS section implied `ipconfig /flushdns` should be run after lease renewal. Microsoft documents `flushdns` as a DNS troubleshooting step, so I changed the wording to make it conditional on DNS troubleshooting.
- The `findstr` example used unsupported alternation syntax (`\|`). I replaced it with space-separated search strings, which is how `findstr` matches multiple patterns.
- The event log example queried the `System` log with hard-coded event IDs that do not match Microsoft’s DHCP client troubleshooting guidance. I replaced it with `Get-WinEvent` against the DHCP client Admin and Operational logs.

## Review Notes
- The post is now technically sound for current Windows 10/11 and supported Windows Server command references.
- The commands shown are primarily for DHCPv4. If the post is expanded in the future, it could mention `ipconfig /release6` and `ipconfig /renew6` for DHCPv6.
- The `netsh` method is an indirect workaround because it resets the interface rather than directly issuing a DHCP renew.
