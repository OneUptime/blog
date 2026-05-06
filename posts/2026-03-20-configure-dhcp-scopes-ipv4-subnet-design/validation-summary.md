# Validation Summary: How to Configure DHCP Scopes with Proper IPv4 Subnet Design

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv4
- IPv4 subnetting
- ISC DHCP
- Windows DHCP Server
- PowerShell

## Sources Consulted
- Microsoft Learn, `Add-DhcpServerv4Scope`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4scope?view=windowsserver2025-ps
- Microsoft Learn, `Set-DhcpServerv4OptionValue`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv4optionvalue?view=windowsserver2025-ps
- Microsoft Learn, DHCP deployment and scope planning guidance: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-deploy-wps
- Microsoft Learn, Windows Server DHCP quickstart: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/quickstart-install-configure-dhcp-server
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP end-of-life notice: https://kb.isc.org/docs/isc-dhcp-eol-dates
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132

## Issues Found
- The Windows DHCP example created a scope with a start range of `192.168.10.50` and end range of `192.168.10.200`, then added an exclusion for `192.168.10.1` through `192.168.10.49`. Microsoft’s DHCP guidance defines exclusions as addresses carved out from within the scope’s address range, so the example did not match the stated allocation plan. I changed the scope to cover the full usable subnet, added exclusions for both the static block and spare block, and activated the scope after exclusions were added so the effective lease pool remains `192.168.10.50` through `192.168.10.200`.
- The ISC DHCP section labeled router, DNS, and domain options as “Required options.” ISC’s documentation states that DHCP options do not need to be exhaustively specified and should be set as needed by clients. I changed the wording to “Common client options.”
- The key takeaway claiming DHCP without router and DNS options “breaks connectivity” was too broad. DHCP can still assign an address without those options; what is typically lost is off-subnet routing and name resolution. I corrected that explanation.
- The post presented ISC DHCP without noting that ISC has declared it end-of-life. I updated the section heading and added a short note so the example is accurately framed as legacy ISC DHCP configuration.

## Review Notes
- The ISC DHCP syntax shown in the post remains valid per ISC’s published 4.4 manual pages, but ISC recommends Kea for new deployments because ISC DHCP is no longer maintained.
- DHCP option numbering in the post is correct: router is option 3, DNS servers are option 6, and NTP servers are option 42 per RFC 2132.
- No local execution validation was possible in this workspace because neither `dhcpd` nor PowerShell is installed.
