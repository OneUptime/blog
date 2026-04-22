# Validation Summary: How to Set Up a DHCP Server on Windows Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows Server
- DHCP Server role
- DHCP Server PowerShell module
- Active Directory DHCP authorization
- IPv4 DHCP scopes, exclusions, reservations, leases, export, and import

## Sources Consulted
- Microsoft Learn: Quickstart: Install and configure DHCP Server: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/quickstart-install-configure-dhcp-server
- Microsoft Learn: Add-DhcpServerInDC: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverindc
- Microsoft Learn: Add-DhcpServerv4Scope: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4scope
- Microsoft Learn: Set-DhcpServerv4OptionValue: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv4optionvalue
- Microsoft Learn: Add-DhcpServerv4ExclusionRange: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4exclusionrange
- Microsoft Learn: Add-DhcpServerv4Reservation: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4reservation
- Microsoft Learn: Get-DhcpServerv4Lease: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4lease
- Microsoft Learn: Export-DhcpServer: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/export-dhcpserver
- Microsoft Learn: Import-DhcpServer: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/import-dhcpserver
- Microsoft Learn troubleshooting: You cannot add a DHCP reservation that is outside of the scope distribution range in Windows Server: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/cant-add-dhcp-reservation
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The reservation example used `192.168.1.50`, which is outside the configured scope distribution range of `192.168.1.100` to `192.168.1.200`. Microsoft documents that current Windows Server versions do not allow reservations outside the configured distribution range. Changed the reservation IP to `192.168.1.110`, which is within the distribution range and within the existing exclusion range.
- The specific-lease lookup combined `-ScopeId` and `-IPAddress` with `Get-DhcpServerv4Lease`. Microsoft documents `-IPAddress` as a separate parameter set that does not include `-ScopeId`. Removed `-ScopeId` from that command.

## Review Notes
The remaining commands match the documented DHCP Server PowerShell cmdlets. The examples assume an elevated PowerShell session on Windows Server, and `Add-DhcpServerInDC` applies only when the DHCP server is used in an Active Directory domain environment.
