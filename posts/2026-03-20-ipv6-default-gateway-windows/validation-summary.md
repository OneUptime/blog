# Validation Summary: How to Configure IPv6 Default Gateway on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- IPv6
- Router Advertisement (RA) / Neighbor Discovery
- `netsh`
- PowerShell `NetTCPIP` cmdlets

## Sources Consulted
- Microsoft Learn: `netsh interface` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `New-NetRoute` https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetRoute` https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPInterface` https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `Test-NetConnection` https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration https://www.rfc-editor.org/rfc/rfc4862

## Issues Found
- The post said to check whether the gateway was set by DHCP or RA. For IPv6 hosts, the default router is learned automatically via Router Advertisement, not DHCPv6, so I renamed that section and corrected the commands and notes to reflect RA-based learning and manual static routes.
- The PowerShell removal step would remove every IPv6 default route on the machine. I scoped it to the selected interface so the example only removes the route being replaced on that adapter.
- The reset section implied that disabling and re-enabling the adapter was enough after `netsh interface ipv6 reset`. Microsoft documents that the reset restores defaults after a system restart, so I removed the adapter bounce commands and added the restart requirement.
- The "IPv6 disabled" fix used `netsh interface ipv6 set global disabled=no`, which is not a valid documented `netsh` option. I replaced it with the supported Windows guidance: re-enable the IPv6 binding or reset the `DisabledComponents` registry value to `0` and restart.
- I normalized the `netsh` address and route commands to the documented parameter form and clarified that the verification example is tracing the route to an IPv6-capable host.

## Review Notes
- The examples use documentation-prefix addresses from `2001:db8::/32`, which is correct for instructional material but not reachable on a real network.
- On many Windows networks, automatically learned IPv6 default routes use a link-local next hop even when the interface also has a global unicast address.
- The tag list contains `Window` rather than `Windows`; this is editorial rather than a technical accuracy issue, so it was left unchanged.
