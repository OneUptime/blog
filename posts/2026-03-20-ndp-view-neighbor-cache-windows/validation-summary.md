# Validation Summary: How to View the IPv6 Neighbor Cache on Windows

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Windows PowerShell (NetTCPIP module: `Get-NetNeighbor`, `Remove-NetNeighbor`, `New-NetNeighbor`)
- `netsh interface ipv6` legacy command-line tool
- IPv6 Neighbor Discovery Protocol (NDP) / Neighbor Unreachability Detection (NUD)
- RFC 4861 (Neighbor Discovery for IP version 6)

## Sources Consulted
- Microsoft Docs: Get-NetNeighbor cmdlet (https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netneighbor)
- Microsoft Docs: Remove-NetNeighbor cmdlet (https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netneighbor)
- Microsoft Docs: New-NetNeighbor cmdlet (https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netneighbor)
- Microsoft Docs: netsh interface ipv6 commands
- RFC 4861 (Neighbor Discovery for IP version 6) Section 7.3.2 - Neighbor Cache Entries

## Issues Found
No technical issues found.

The PowerShell cmdlets, parameters, and netsh commands all conform to the official Microsoft documentation. The State property values (Unreachable, Incomplete, Probe, Delay, Stale, Reachable, Permanent) match what `Get-NetNeighbor` actually returns. The PowerShell backtick line continuation, MAC address format with hyphens, and `-PolicyStore ActiveStore` value are all correct.

## Review Notes
- Strictly speaking, RFC 4861 defines only five NUD states: INCOMPLETE, REACHABLE, STALE, DELAY, and PROBE. The Windows "Unreachable" and "Permanent" states are Windows-specific extensions (Unreachable corresponds to Linux's FAILED, Permanent denotes static entries). The post's comment "Windows NUD states correspond to RFC 4861" with the FAILED mapping is conceptually loose but does not affect the practical correctness of the commands or guidance.
- The `Get-NetNeighbor -IPAddress "2001:db8::1" -AddressFamily IPv6` example specifies both parameters; AddressFamily is technically inferable from the IP literal but specifying it explicitly is harmless.
- The cmdlets shown require an elevated PowerShell session for modification operations (`Remove-NetNeighbor`, `New-NetNeighbor`); the post does not explicitly call this out, but this is implicit in Windows administrative tasks.
