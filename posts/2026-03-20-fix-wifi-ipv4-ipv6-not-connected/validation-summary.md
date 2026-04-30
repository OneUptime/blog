# Validation Summary: How to Fix IPv4 and IPv6 Both Showing 'Not Connected' on WiFi

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Windows Wi-Fi networking
- IPv4
- IPv6
- DHCP
- `netsh`
- `ipconfig`
- PowerShell NetAdapter cmdlets
- Windows services

## Sources Consulted
- Microsoft Learn: `netsh wlan` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-wlan
- Microsoft Learn: `ipconfig` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `netsh interface` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `netsh winsock` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-winsock
- Microsoft Learn: `netsh advfirewall` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-advfirewall
- Microsoft Learn: `sc.exe query` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-query
- Microsoft Learn: `Get-NetAdapterBinding` cmdlet reference https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding?view=windowsserver2025-ps
- Microsoft Learn: `Enable-NetAdapterBinding` cmdlet reference https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapterbinding?view=windowsserver2025-ps
- Microsoft Learn: `Disable-NetAdapter` cmdlet reference https://learn.microsoft.com/en-us/powershell/module/netadapter/disable-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `Enable-NetAdapter` cmdlet reference https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `Get-PnpDevice` cmdlet reference https://learn.microsoft.com/en-us/powershell/module/pnpdevice/get-pnpdevice?view=windowsserver2025-ps
- Microsoft Learn: DHCP overview https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-top
- Microsoft Learn: DHCP basics https://learn.microsoft.com/en-us/windows-server/troubleshoot/dynamic-host-configuration-protocol-basics
- Microsoft Learn: Automatic private IP addressing (APIPA) https://learn.microsoft.com/en-us/windows-server/troubleshoot/how-to-use-automatic-tcpip-addressing-without-a-dh
- Microsoft Learn: IPv6 link-local addresses https://learn.microsoft.com/en-us/windows/win32/winsock/link-local-and-site-local-addresses-2

## Issues Found
- The opening explanation incorrectly claimed that both statuses mean the adapter is already associated at Layer 2 and has no IP address at all. I changed this to say Windows has not established usable IP connectivity, because Windows can also self-assign IPv4 APIPA addresses and IPv6 link-local addresses, and the status alone does not prove successful Wi-Fi association.
- The reset commands used outdated or undocumented syntax: `netsh winsock reset catalog`, `netsh int ip reset reset.log`, and `netsh int ipv6 reset resetlog.log`. I replaced them with the current documented forms `netsh winsock reset`, `netsh interface ipv4 reset`, and `netsh interface ipv6 reset`.
- The adapter restart commands used shorthand syntax that does not match current Microsoft command documentation. I changed them to `netsh interface set interface name="Wi-Fi" admin=DISABLED` and `admin=ENABLED`.
- The service check block used inline `REM` comments after `sc query` commands, which is not valid `cmd` syntax. I moved those comments to separate lines and added the missing `net start Netprofm` line so the “start any stopped services” instruction matches the listed services.
- The PowerShell example in Step 6 did not actually uninstall/reinstall the adapter, and `Get-PnpDevice -FriendlyName "*Wireless*"` is not valid as written because `-FriendlyName` does not support wildcards in the documented syntax. I changed the step to “Restart or Reinstall WiFi Adapter” and replaced the PowerShell example with documented `Disable-NetAdapter` and `Enable-NetAdapter` commands.
- The static-IP test used older `netsh interface ip` syntax. I updated it to the current documented `netsh interface ipv4 set address` and `set dnsservers` forms, and I added the commands to return the adapter to DHCP after the test so the temporary diagnostic step does not leave the machine on a static configuration.
- The conclusion contained an invalid shell example, `ipconfig /release && /renew`, and repeated the earlier overstatement about “no IP address.” I corrected both.

## Review Notes
- The post is now technically sound for current Windows 10/11 style command-line tooling.
- The interface alias `Wi-Fi` is common on English-language Windows systems, but the actual adapter name can differ by locale or user customization.
- `netsh advfirewall reset` is a valid command, but it resets Windows Defender Firewall with Advanced Security policies to their defaults. A future revision could call out that side effect more explicitly.
