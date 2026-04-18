# Validation Summary: How to View IPv6 Configuration with ipconfig on Windows

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Windows `ipconfig` command (cmd.exe)
- IPv6 addressing (global, temporary/privacy, link-local, zone IDs)
- DHCPv6 and SLAAC
- `netsh interface ipv6`
- PowerShell `NetTCPIP` cmdlets: `Get-NetIPConfiguration`, `Get-NetIPAddress`, `Get-NetAdapter`, `Get-DnsClientServerAddress`

## Sources Consulted
- Microsoft Learn — ipconfig command reference (https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig)
- Microsoft Learn — Get-NetIPAddress (https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress)
- Microsoft Learn — Get-NetIPConfiguration (https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipconfiguration)
- RFC 4941 — Privacy Extensions for Stateless Address Autoconfiguration in IPv6 (obsoleted by RFC 8981, but still a valid historical reference)
- RFC 4007 — IPv6 Scoped Address Architecture (zone IDs / `%` notation)
- Microsoft Q&A and NetworkAcademy.IO articles on Windows DHCPv6/SLAAC behavior

## Issues Found
1. The Troubleshooting section described `ipconfig /release6` / `/renew6` as forcing "SLAAC re-negotiation". These commands manage DHCPv6 leases only; SLAAC-derived addresses are not released or renewed by them. Updated the inline comment to accurately describe DHCPv6 lease management and added a note that SLAAC addresses are not affected.
2. The Summary previously stated the same commands "re-acquire DHCPv6 or SLAAC addresses". Reworded to clarify that these commands operate on the DHCPv6 lease and do not affect SLAAC-derived addresses.

## Review Notes
- The RFC 4941 citation for privacy extensions is technically still valid but has been obsoleted by RFC 8981 (February 2021). Either reference is acceptable; the post was left unchanged here since RFC 4941 remains widely referenced.
- The PowerShell filtering examples are correct: `SuffixOrigin -eq "Random"` correctly identifies temporary (privacy) addresses, and `AddressState -eq "Preferred"` correctly identifies preferred addresses.
- The example output uses `2001:db8::/32`, which is the documentation prefix per RFC 3849 — appropriate for examples.
- The `%N` zone ID on the IPv6 default gateway correctly refers to the local interface index, not the remote router's interface.
- Tag "Window" is likely intended to be "Windows", but this is a stylistic/metadata issue rather than a technical error.
