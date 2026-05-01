# Validation Summary: How to Disable IPv6 on Windows via PowerShell

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- IPv6
- PowerShell
- NetAdapter PowerShell module
- Windows registry

## Sources Consulted
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: Disable-NetAdapterBinding - https://learn.microsoft.com/en-us/powershell/module/netadapter/disable-netadapterbinding?view=windowsserver2025-ps
- Microsoft Learn: Enable-NetAdapterBinding - https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapterbinding?view=windowsserver2025-ps
- Microsoft Learn: Get-NetAdapterBinding - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding?view=windowsserver2025-ps
- Microsoft Learn: Get-NetAdapter - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: Get-NetIPAddress - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: New-ItemProperty - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-itemproperty?view=powershell-7.5
- Microsoft Learn: Set-ItemProperty - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty?view=powershell-7.5
- Microsoft Learn: ping - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping

## Issues Found
- The post described `DisabledComponents = 0xFF` as a complete IPv6 disable. I corrected that wording to a broader disable after restart that also affects IPv6 tunnel interfaces, because Microsoft documents that IPv6 cannot be completely disabled and loopback remains available.
- The post treated `-Name "*"` and `Get-NetAdapter` as operating on all adapters. I corrected those references to all visible adapters, because the NetAdapter cmdlets default to visible adapters unless `-IncludeHidden` is specified.
- The verification step used `ping -6 ::1` as proof that IPv6 was down. I corrected this to note that `ping ::1` should still work, because Microsoft explicitly documents that `::1` remains reachable even after setting `DisabledComponents`.
- The “Disable IPv6 Completely” script name and surrounding wording overstated the result. I renamed that section and function so the code matches documented Windows behavior.

## Review Notes
- The commands in the post require an elevated PowerShell session to modify adapter bindings and write under `HKLM`.
- Microsoft recommends preferring IPv4 over IPv6 in prefix policy (`DisabledComponents = 0x20`) instead of disabling IPv6 entirely when the goal is application preference rather than full interface unbinding.
