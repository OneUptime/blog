# Validation Summary: How to Configure IPv6 on Windows DHCP Server

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Windows Server DHCP Server role
- DHCPv6 (stateful and stateless)
- PowerShell DhcpServer module cmdlets
- IPv6 SLAAC and Router Advertisements (M/O flags)
- DHCP Manager MMC snap-in (dhcpmgmt.msc)
- DHCPv6 DUID (DUID-LLT)

## Sources Consulted
- Microsoft Learn: DhcpServer PowerShell module reference (https://learn.microsoft.com/en-us/powershell/module/dhcpserver/)
- Microsoft Learn: Add-DhcpServerv6Scope, Set-DhcpServerv6Scope, Add-DhcpServerv6ExclusionRange, Set-DhcpServerv6OptionValue, Add-DhcpServerv6Reservation, Get-DhcpServerv6Lease, Get-DhcpServerv6ScopeStatistics
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6)
- RFC 3646 — DNS Configuration options for DHCPv6 (Option 23 DNS Recursive Name Server, Option 24 Domain Search List)
- RFC 4861 / RFC 4862 — Neighbor Discovery and SLAAC (M and O flag semantics in Router Advertisements)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)

## Issues Found
No technical issues found.

All PowerShell cmdlet names and parameters (including the camelCase `-PreferredLifeTime` and `-ValidLifeTime`) match the official DhcpServer module. DHCPv6 option IDs 23 and 24 correctly map to DNS Recursive Name Server and Domain Search List per RFC 3646. The M (Managed) and O (Other) Router Advertisement flag descriptions are accurate. The DUID example follows the DUID-LLT format (type 0001, hardware type 0001 for Ethernet, time field, link-layer address).

## Review Notes
- DHCPv6 Option 24 (Domain Search List) per RFC 3646 is wire-encoded as DNS labels; the `Set-DhcpServerv6OptionValue` cmdlet accepts a plain domain string and handles the encoding, so the example is correct as written.
- The example uses `2001:db8::/64` (implied by the `::` prefix); readers using their own infrastructure should substitute a routable global unicast prefix delegated by their ISP or assigned from ULA space.
- DHCPv6 reservations are keyed by DUID (per RFC 8415), not MAC address — the post correctly highlights this difference from DHCPv4.
