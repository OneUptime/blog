# Validation Summary: How to Fix 'Default Gateway Is Not Available' on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows 10
- Windows 11
- Windows networking
- TCP/IP
- DHCP
- PowerShell
- `netsh`
- `ipconfig`

## Sources Consulted
- Microsoft Support: Fix Wi-Fi connection issues in Windows https://support.microsoft.com/en-us/windows/fix-wi-fi-connection-issues-in-windows-9424a1f7-6a3b-65a6-4d78-7f07eee84d2c
- Microsoft Support: Fix Ethernet connection problems in Windows https://support.microsoft.com/en-us/windows/fix-ethernet-connection-problems-in-windows-2311254e-cab8-42d6-90f3-cb0b9f63645f
- Microsoft Support: Change TCP/IP settings https://support.microsoft.com/en-gb/windows/change-tcp-ip-settings-bd0a07af-15f5-cd6a-363f-ca2b6f391ace
- Microsoft Learn: `msdt` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msdt
- Microsoft Learn: Launch Windows Settings (`ms-settings:` URI scheme) https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings
- Microsoft Learn: `ipconfig` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `netsh winsock` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-winsock
- Microsoft Learn: `netsh interface` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `Disable-NetAdapterPowerManagement` https://learn.microsoft.com/en-us/powershell/module/netadapter/disable-netadapterpowermanagement?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetAdapter` https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `New-NetIPAddress` https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2022-ps
- Microsoft Learn: `Remove-NetIPAddress` https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Remove-NetRoute` https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Set-DnsClientServerAddress` https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress

## Issues Found
- The post used `msdt.exe -id NetworkDiagnosticsNetworkAdapter` as the primary troubleshooter launch command. `msdt` is deprecated, and current Microsoft guidance for Windows 11 is to use the Network and Internet troubleshooter in the Get Help app. I replaced the legacy invocation with `start ms-settings:troubleshoot` and corrected the Windows 10/11 guidance.
- The PowerShell example used `Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled`, but that parameter is not documented on `Set-NetAdapterPowerManagement`. I replaced it with the documented `Disable-NetAdapterPowerManagement -Name "Ethernet"`.
- The reset step implied `ipconfig /release` and `ipconfig /renew` were always applicable. Microsoft documents those options for adapters configured to obtain an IP address automatically, so I added that DHCP caveat and reordered the explanation to match the command purpose more accurately.
- The static-IP cleanup example removed all address families from the adapter. I narrowed the example to IPv4 with `-AddressFamily IPv4` and also made the `New-NetIPAddress` example explicitly IPv4.
- The driver check example used `Get-NetAdapter | Select-Object Name, DriverVersion, DriverDate`, which is not the documented way Microsoft surfaces driver date/version in `Get-NetAdapter` help. I replaced it with `Get-NetAdapter -Name "*" | Format-Table -View Driver`.
- The conclusion claimed that a successful `ping [gateway-ip]` proves internet routing is restored. Microsoft support guidance only treats that as proof that the PC can reach the local router. I corrected the claim accordingly.

## Review Notes
- The remaining commands and examples are technically valid after the fixes above.
- The post now reflects the current split between Windows 11 troubleshooting via Get Help and Windows 10 troubleshooting via Settings.
