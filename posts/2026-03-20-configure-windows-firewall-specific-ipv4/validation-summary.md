# Validation Summary: How to Configure Windows Firewall Rules for Specific IPv4 Addresses

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Windows Defender Firewall
- `netsh advfirewall firewall` (legacy CLI)
- PowerShell NetSecurity module (`New-NetFirewallRule`, `Set-NetFirewallRule`, `Remove-NetFirewallRule`, `Get-NetFirewallRule`, `Get-NetFirewallAddressFilter`)
- `Test-NetConnection` (NetTCPIP module)
- IPv4 addressing and CIDR notation

## Sources Consulted
- Microsoft Learn: `netsh advfirewall firewall` command reference — https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/dd734783(v=ws.10)
- Microsoft Learn: `New-NetFirewallRule` cmdlet reference — https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule
- Microsoft Learn: `Set-NetFirewallRule` cmdlet reference — https://learn.microsoft.com/en-us/powershell/module/netsecurity/set-netfirewallrule
- Microsoft Learn: `Get-NetFirewallAddressFilter` cmdlet reference — https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewalladdressfilter
- Microsoft Learn: `Test-NetConnection` cmdlet reference — https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft Learn: Windows Defender Firewall documentation

## Issues Found
No technical issues found. All commands, cmdlet parameters, line-continuation syntax (`^` in cmd, backtick in PowerShell), and CIDR usage are correct and current.

## Review Notes
- The example labelled "management subnet" uses `10.0.0.0/8`, which is the entire RFC 1918 10/8 block (~16M addresses). It is a syntactically valid scope and works as written, but in real-world deployments a narrower subnet (e.g., `10.10.0.0/24`) would typically be more appropriate for a "management" network. This is a stylistic concern, not a technical error, so it was left unchanged.
- `netsh advfirewall` still works on current Windows versions but Microsoft recommends the `NetSecurity` PowerShell module for new automation. The post already covers both, which is appropriate.
- The `Get-NetFirewallRule | Get-NetFirewallAddressFilter | Where-Object {...}` pipeline returns address-filter objects (not the parent rule names), so users searching for which rule contains a given IP may need to inspect via `$_.PSPath` or use `Get-NetFirewallRule -AssociatedNetFirewallAddressFilter`. The example as written is correct for finding matching filter objects.
- The tag "Window" appears to be a typo for "Windows" but tags are out of scope per the review instructions (no stylistic changes).
