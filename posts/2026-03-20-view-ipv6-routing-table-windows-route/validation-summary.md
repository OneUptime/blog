# Validation Summary: How to View IPv6 Routing Table on Windows with route print

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Windows `route` command (route print, route print -6)
- Windows `netsh` command (interface ipv6 show interfaces)
- Windows `pathping` command (-6 flag)
- PowerShell NetTCPIP module cmdlets: `Get-NetRoute`, `Find-NetRoute`, `New-NetRoute`, `Remove-NetRoute`
- IPv6 addressing and routing concepts

## Sources Consulted
- Microsoft Learn: route command reference (https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008)
- Microsoft Learn: Get-NetRoute (https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute)
- Microsoft Learn: Find-NetRoute (https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute)
- Microsoft Learn: New-NetRoute (https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute)
- Microsoft Learn: Remove-NetRoute (https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute)
- Microsoft Learn: netsh interface ipv6 commands (https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface-ipv6)
- RFC 4291 (IP Version 6 Addressing Architecture)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — 2001:db8::/32)

## Issues Found
- The "Add a specific route" PowerShell example used `-DestinationPrefix "2001:db8:remote::/48"` and `-NextHop "2001:db8::gateway"`. These contain the non-hex literals "remote" and "gateway", which are invalid in IPv6 addresses (only 0-9 and a-f are allowed). `New-NetRoute` would reject them. Replaced with valid documentation-range addresses: `2001:db8:1::/48` and `2001:db8::1`.

## Review Notes
- All other commands and flags verified against Microsoft documentation: `route print`, `route print -6`, `pathping -6`, and the NetTCPIP cmdlets are current and correctly invoked.
- The Protocol enumeration values listed (NetMgmt, RouterAdvertisement, Dhcp, Local, Other) match the documented values for the `Get-NetRoute` Protocol property.
- The sample `route print -6` output is representative and uses valid documentation-range addresses (2001:db8::/32 per RFC 3849, fe80::/64 link-local, ff00::/8 multicast, ::1/128 loopback).
- Tag list contains a minor typo "Window" instead of "Windows", but tags are out of scope for technical correctness review and were left unchanged.
