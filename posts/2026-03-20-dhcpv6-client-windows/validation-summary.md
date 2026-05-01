# Validation Summary: How to Configure a DHCPv6 Client on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows IPv6 networking
- DHCPv6
- IPv6 Router Advertisements
- PowerShell NetTCPIP and DnsClient cmdlets
- `netsh`
- `ipconfig`
- Wireshark

## Sources Consulted
- Microsoft Learn, `netsh interface` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, `ipconfig` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn, `Set-NetIPInterface` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn, `Get-NetIPInterface` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn, `Get-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `Remove-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `Get-NetIPConfiguration` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipconfiguration?view=windowsserver2025-ps
- Microsoft Learn, `Set-DnsClientServerAddress` - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://datatracker.ietf.org/doc/html/rfc8415
- Wireshark Display Filter Reference: DHCPv6 - https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- IANA Service Name and Port Number Registry (DHCPv6 ports 546 and 547) - https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=dhcpv6

## Issues Found
- The introduction and prerequisites implied that enabling IPv6 is enough for Windows to start stateful DHCPv6. RFC 4861 and RFC 8415 make router advertisements part of the decision path, so I corrected the explanation and added router advertisements to the prerequisites.
- The `netsh interface ipv6 set interface "Ethernet" dhcp=enabled` example was not a valid IPv6 `netsh` setting. I replaced it with the documented `routerdiscovery=enabled`, `managedaddress=enabled`, and `otherstateful=enabled` settings, and made the DNS example use the documented `name=` syntax.
- The PowerShell configuration example used a broad `Remove-NetIPAddress` call while claiming it only removed static IPv6 addresses. I changed it to remove only manually assigned IPv6 addresses by filtering `Get-NetIPAddress` on `PrefixOrigin Manual`.
- The "View DHCP Lease Information" section did not actually show lease details. I retitled it to DHCPv6-related configuration and switched `Get-NetIPConfiguration` to the detailed view so the example better matches what it returns.
- The troubleshooting section claimed `netsh interface ipv6 show route` could test whether a router is advertising DHCPv6. Routes do not verify DHCPv6-related RA state, so I replaced that with `Get-NetIPInterface` properties that expose router discovery and the managed/other stateful flags.
- The release and verification wording overstated where Windows exposes DHCPv6 lease details. I narrowed those lines to configuration and client details instead of explicit lease information.

## Review Notes
- The corrected post is accurate for Windows 10/11 and Windows Server 2016+ as a client-side guide.
- Even with the client configured correctly, IPv6 default gateway information comes from router advertisements rather than DHCPv6.
