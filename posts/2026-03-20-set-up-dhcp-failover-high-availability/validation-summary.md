# Validation Summary: How to Set Up DHCP Failover for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DHCPv4 failover
- ISC dhcpd / ISC DHCP
- iptables
- Windows Server DHCP
- PowerShell DhcpServer module

## Sources Consulted
- ISC Knowledge Base: A Basic Guide to Configuring DHCP Failover - https://kb.isc.org/docs/aa-00502
- ISC DHCP 4.4 Manual Pages: dhcpd.conf - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP Server has reached EOL - https://www.isc.org/blogs/isc-dhcp-eol/
- Microsoft Learn: DHCP failover overview - https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-failover
- Microsoft Learn: Manage DHCP failover relationships in Windows Server - https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/manage-dhcp-failover-relationships
- Microsoft Learn: Add-DhcpServerv4Failover cmdlet - https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4failover
- IANA Service Name and Transport Protocol Port Number Registry - https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- Local iptables v1.8.10 help output (`iptables --help`)

## Issues Found
- ISC DHCP is end-of-life upstream. Added a short note under the ISC dhcpd section so readers understand the examples apply best to existing ISC dhcpd deployments and should evaluate maintained alternatives for new deployments.
- The Windows PowerShell example used `-Mode LoadBalance`, but `Add-DhcpServerv4Failover` does not have a `-Mode` parameter in the creation cmdlet. Removed that parameter; load-balance mode is the default and `-LoadBalancePercent 50` is valid.
- The key takeaway said `split 0` makes the secondary a hot standby. ISC documentation says `split 0` makes the secondary responsible for all clients, while `split 256` makes the primary responsible for all clients. Updated the takeaway accordingly.
- The firewall example only showed the primary server's peer address while describing communication between both servers. Clarified that the secondary should use the same rules with the primary's address as the peer.

## Review Notes
The ISC examples are syntactically consistent with ISC dhcpd failover configuration rules: `mclt` and `split` are present only on the primary, the secondary omits them, and the failover peer is referenced inside the pool. Windows DHCP failover supports DHCPv4 scopes only; the post's PowerShell example correctly uses the v4 cmdlets.
