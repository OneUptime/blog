# Validation Summary: How to Block an IPv4 Address in Windows Defender Firewall

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Defender Firewall / Windows Firewall with Advanced Security
- IPv4 firewall rules
- `netsh advfirewall`
- PowerShell `NetSecurity` cmdlets

## Sources Consulted
- Microsoft Learn, `netsh advfirewall`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-advfirewall
- Microsoft Learn, `New-NetFirewallRule`: https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2025-ps
- Microsoft Learn, `Remove-NetFirewallRule`: https://learn.microsoft.com/en-us/powershell/module/netsecurity/remove-netfirewallrule?view=windowsserver2025-ps
- Microsoft Learn, Windows Firewall tools: https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/tools
- Microsoft Learn, Windows Firewall dynamic keywords: https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/dynamic-keywords
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The post omitted the required privilege level for changing firewall configuration. I added a note that Command Prompt or PowerShell must be run as Administrator, matching Microsoft’s requirement for administrative rights to change Windows Firewall settings.
- The verification example used `203.0.113.100` as the test target. That address is in `203.0.113.0/24`, which RFC 5737 reserves for documentation, so a live connectivity test against it is not a valid firewall verification method. I changed the example to use a placeholder for the real reachable IP that was actually blocked and added a note explaining why.
- The verification text implied that a local `ping`/`tracert` test was the general validation method. That only validates the outbound block from the local machine. I clarified that inbound validation should be tested from the blocked host back to the local machine.
- The conclusion recommended a "Windows Firewall address set," which is not the current documented Windows Firewall feature name. I corrected this to Windows Firewall dynamic keywords, which Microsoft documents for managing reusable remote address sets.

## Review Notes
- The `netsh advfirewall` and PowerShell `NetSecurity` examples are current and technically valid on currently documented Windows releases.
- The post uses example IPv4 documentation space correctly in the rule-creation examples; the problem was only using that documentation-only address for live verification.
