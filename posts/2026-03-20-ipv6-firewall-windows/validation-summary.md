# Validation Summary: How to Configure IPv6 Firewall Rules on Windows Firewall

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Defender Firewall
- Windows PowerShell `NetSecurity` module
- `netsh advfirewall`
- IPv6
- ICMPv6
- Group Policy

## Sources Consulted
- Microsoft Learn: `New-NetFirewallRule` (NetSecurity) https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetFirewallRule` (NetSecurity) https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallrule?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetFirewallAddressFilter` (NetSecurity) https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewalladdressfilter?view=windowsserver2025-ps
- Microsoft Learn: `Set-NetFirewallProfile` (NetSecurity) https://learn.microsoft.com/en-us/powershell/module/netsecurity/set-netfirewallprofile?view=windowsserver2025-ps
- Microsoft Learn: `netsh advfirewall` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-advfirewall
- Microsoft Learn: Configure rules with Group Policy https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/configure
- Microsoft Learn: Windows Firewall rules https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/rules
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) https://www.rfc-editor.org/rfc/rfc4861
- RFC 8201: Path MTU Discovery for IP version 6 https://www.rfc-editor.org/rfc/rfc8201

## Issues Found
- The post used invalid IPv6 examples such as `fd00:mgmt::/48`. I replaced them with a syntactically valid ULA prefix, `fd00:1234:5678::/48`, in the PowerShell, `netsh`, and Group Policy examples.
- The HTTPS PowerShell example used `-AddressFamily IPv6`, which isn't a supported `New-NetFirewallRule` parameter. I replaced it with IPv6 address scoping using `-LocalAddress "::/0"` and `-RemoteAddress "::/0"`, which is supported by the cmdlet documentation.
- The “current rules” and audit/check PowerShell examples used the default policy store, which returns the persistent store rather than the effective active policy. I updated them to use `-PolicyStore ActiveStore` where the post was describing current or effective rules.
- The `netsh` example claiming to “Block all inbound IPv6 except allowed” was incorrect because explicit block rules take precedence over conflicting allow rules in Windows Firewall. I replaced it with a rule that blocks a specific IPv6 prefix instead.
- The default profile comments implied profile settings were IPv6-specific. I corrected the wording because `Get-NetFirewallProfile` and `Set-NetFirewallProfile` operate on firewall profiles generally, not separately for IPv4 vs IPv6.
- The Group Policy path omitted the `Policies` node used when editing a domain GPO in Group Policy Management. I corrected the path to match Microsoft’s documented navigation.

## Review Notes
- The ICMPv6 section is accurate after correction, but on real systems the required ICMPv6 traffic is commonly already covered by built-in Core Networking rules, so duplicating those rules may be unnecessary.
- The `netsh advfirewall` tooling remains documented and supported, but Microsoft’s current guidance also emphasizes PowerShell and policy-based management for many administrative workflows.
