# Validation Summary: How to Configure a DHCPv6 Server on Windows Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Server DHCP Server role
- DHCPv6
- IPv6
- PowerShell `DhcpServer` module
- Active Directory authorization
- Windows Event Viewer / `Get-WinEvent`

## Sources Consulted
- Microsoft Learn: Deploy DHCP Using Windows PowerShell - https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-deploy-wps
- Microsoft Learn: Add-DhcpServerInDC - https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverindc?view=windowsserver2022-ps
- Microsoft Learn: Add-DhcpServerv6Scope - https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv6scope?view=windowsserver2025-ps
- Microsoft Learn: Set-DhcpServerv6OptionValue - https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv6optionvalue?view=windowsserver2025-ps
- Microsoft Learn: Get-DhcpServerv6OptionValue - https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv6optionvalue?view=windowsserver2025-ps
- Microsoft Learn: Add-DhcpServerv6Reservation - https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv6reservation?view=windowsserver2025-ps
- Microsoft Learn: DHCP failover in Windows Server - https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-failover
- Microsoft Learn: DHCP server events in Windows Server - https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-server-events
- Microsoft Learn (Previous Versions): Add method of the PS_DhcpServerv6Scope class - https://learn.microsoft.com/en-us/previous-versions/windows/desktop/dhcpserverpsprov/add-ps-dhcpserverv6scope
- RFC 3646: DNS Configuration options for Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc3646

## Issues Found
- The PowerShell installation flow skipped DHCP post-install security-group setup. I added `netsh dhcp add securitygroups` and `Restart-Service -Name DHCPServer` before marking post-install configuration complete, because Microsoft documents those steps when using PowerShell instead of the GUI post-install wizard.
- Active Directory authorization was presented as mandatory for all deployments. I changed the GUI, PowerShell, troubleshooting, and best-practice wording so authorization is clearly conditional on the DHCP server being domain-joined.
- The DHCPv6 option examples used `-ScopeId`, which is not the correct parameter for the DHCPv6 option cmdlets. I replaced it with `-Prefix` for both `Set-DhcpServerv6OptionValue` and `Get-DhcpServerv6OptionValue`.
- The GUI scope lifetime defaults were incorrect. I corrected them to Preferred = 8 days, T1 = 4 days, T2 = 6.4 days, and Valid = 12 days, which matches Microsoft's DHCPv6 scope documentation.
- The DHCPv6 reservation example used a nonstandard DUID presentation. I normalized it to the hyphenated hexadecimal format shown in Microsoft examples for `Add-DhcpServerv6Reservation`.
- The failover section was technically misleading because Windows Server DHCP failover does not support IPv6 scopes. I renamed the section to high availability, clarified Microsoft's stateless/stateful guidance, and replaced the broken exclusion example with a non-overlapping split-scope example.
- The troubleshooting example used the wrong event log name. I corrected it to `Microsoft-Windows-DHCP Server Events/Operational`.

## Review Notes
- DHCPv6 does not provide default gateway information to clients; IPv6 default routers are still learned through Router Advertisements. The post did not claim otherwise, so no edit was required.
- The split-scope exclusion example is an implementation inference based on Microsoft's documented recommendation to use split scope for stateful DHCPv6 together with the documented behavior of `Add-DhcpServerv6ExclusionRange`; Microsoft does not publish a single canonical exclusion layout for DHCPv6 high availability.
