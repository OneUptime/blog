# Validation Summary: How to Create DHCP Reservations for Specific IPv4 Addresses on Windows Server

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Windows Server DHCP role
- PowerShell DhcpServer module (`Add-DhcpServerv4Reservation`, `Get-DhcpServerv4Reservation`, `Remove-DhcpServerv4Reservation`)
- DHCP Manager MMC snap-in
- Windows command-line utilities (`ipconfig`, `getmac`, `findstr`)
- Linux `ip` utility (iproute2)
- CSV import via `Import-Csv`

## Sources Consulted
- Microsoft Learn — Add-DhcpServerv4Reservation: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4reservation
- Microsoft Learn — Get-DhcpServerv4Reservation: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4reservation
- Microsoft Learn — Remove-DhcpServerv4Reservation: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/remove-dhcpserverv4reservation
- Microsoft Learn — DhcpServer PowerShell module overview
- Microsoft Learn — `ipconfig` command reference
- Microsoft Learn — `getmac` command reference
- iproute2 / `ip-link(8)` man page

## Issues Found
No technical issues found.

- All PowerShell cmdlet names and parameters (`-ScopeId`, `-IPAddress`, `-ClientId`, `-Name`, `-Description`) match the official DhcpServer module documentation.
- The MAC/ClientId hyphenated format (`00-1A-2B-3C-4D-5E`) is accepted by `Add-DhcpServerv4Reservation`.
- `Import-Csv` pipeline pattern is idiomatic and correct.
- `Get-DhcpServerv4Reservation | Where-Object {$_.ClientId -eq ...}` correctly filters by the ClientId property exposed on the returned objects.
- `ipconfig /release` and `ipconfig /renew` are correct Windows client commands.
- `getmac /v` and `ipconfig /all | findstr "Physical"` are valid ways to obtain a MAC address on Windows.
- `ip link show` is the correct iproute2 command for listing interfaces (and their MACs) on Linux.
- The DHCP Manager MMC GUI workflow (Reservations → New Reservation → fill fields → Add) matches the standard Windows Server DHCP console flow.

## Review Notes
- The post notes "no hyphens in GUI" for the MAC address. Modern DHCP Manager builds typically accept MAC addresses with or without hyphens (they are normalized internally), but typing without separators is the safest universal advice and avoids confusion on older Windows Server versions, so the guidance is reasonable.
- `ipconfig /release` followed by `/renew` will briefly disconnect the client from the network; for production hosts, scheduling this during a maintenance window is advisable. Not a correctness issue.
- The post does not mention that the DhcpServer PowerShell module must be available (installed with the DHCP Server role or RSAT). Users running these cmdlets from a workstation will need RSAT — Tools Server Manager / `Install-WindowsFeature RSAT-DHCP`. Worth noting in a future revision but not a technical error.
