# Validation Summary: How to Configure a Windows DHCP Server for IPv4 Scope

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Windows Server (DHCP Server role)
- PowerShell (DhcpServer module)
- Active Directory (DHCP authorization)
- DHCP protocol / IPv4 options (RFC 2132)
- DHCP Manager GUI (MMC snap-in)

## Sources Consulted
- Microsoft Learn — DhcpServer PowerShell module reference: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/
- Microsoft Learn — `Add-DhcpServerv4Scope`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4scope
- Microsoft Learn — `Set-DhcpServerv4OptionValue`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv4optionvalue
- Microsoft Learn — `Add-DhcpServerInDC`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverindc
- Microsoft Learn — `Add-DhcpServerv4ExclusionRange`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4exclusionrange
- Microsoft Learn — `Install-WindowsFeature`: https://learn.microsoft.com/en-us/powershell/module/servermanager/install-windowsfeature
- RFC 2132 — DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132 (Option 3 Router, Option 6 DNS, Option 15 Domain Name)

## Issues Found
No technical issues found.

All PowerShell cmdlets, parameters, and DHCP option numbers are correct:
- `Install-WindowsFeature DHCP -IncludeManagementTools` is the correct command for installing the DHCP role with its management tools.
- `Add-DhcpServerInDC -DnsName -IPAddress` is the correct cmdlet for authorizing the DHCP server in Active Directory.
- `Add-DhcpServerv4Scope` parameters (`-Name`, `-StartRange`, `-EndRange`, `-SubnetMask`, `-State`, `-LeaseDuration`) match the official cmdlet signature.
- DHCP option IDs are accurate per RFC 2132: 3 (Router), 6 (Domain Name Server), 15 (Domain Name).
- `Set-DhcpServerv4OptionValue` syntax including the array form for option 6 (`-Value @("8.8.8.8", "1.1.1.1")`) is correct.
- `Add-DhcpServerv4ExclusionRange`, `Get-DhcpServerv4Scope`, `Get-DhcpServerv4OptionValue`, and `Get-DhcpServerv4Lease` are all valid DhcpServer module cmdlets.
- The GUI navigation path (Server Manager → Tools → DHCP → IPv4 → New Scope) accurately reflects the DHCP MMC console workflow.

## Review Notes
- The post uses 8.8.8.8 and 1.1.1.1 (Google + Cloudflare public DNS) as example DNS servers, which is fine for an example but in a real corporate environment with the `corp.example.com` domain shown, internal DNS servers (typically the AD domain controllers) would normally be used.
- The "Window" tag appears to be a typo for "Windows" — minor metadata issue, not a technical correctness problem in the post body, so left untouched per instructions.
- The post does not mention that on Windows Server Core or modern versions, `Install-WindowsFeature` is an alias of `Add-WindowsFeature`; both work equivalently.
- The lease duration of 1 day is short but valid; the default in DHCP Manager is 8 days. This is a stylistic/operational choice, not an error.
