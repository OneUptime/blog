# Validation Summary: How to View the ARP Table on Windows

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Windows `arp` command (Command Prompt)
- PowerShell `Get-NetNeighbor` cmdlet (NetTCPIP module)
- Windows ARP / Neighbor Discovery cache
- Python `subprocess` module for invoking `arp -a`

## Sources Consulted
- Microsoft Learn: `arp` command reference — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/arp
- Microsoft Learn: `Get-NetNeighbor` cmdlet — https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netneighbor
- RFC 4861 (Neighbor Discovery for IP Version 6) — https://datatracker.ietf.org/doc/html/rfc4861
- Windows `arp /?` built-in help output

## Issues Found
1. **Incorrect `arp -a -N 0.0.0.0` example.** The post claimed this command shows all interfaces. Per Microsoft's `arp` reference, `-N if_addr` filters entries to the local interface with the given IP; `0.0.0.0` is not a valid interface IP and would not broaden scope. Also, `arp -a` alone already displays entries for all interfaces. Replaced the example with two correct variants: `arp -a -N <interface_ip>` (filter by local interface) and `arp -a -v` (verbose mode, includes invalid and loopback entries). Also clarified the `arp -a 192.168.1.100` comment — that form filters to a specific remote IP, not a local interface.
2. **Inaccurate ARP cache timeout.** The post stated the default expiry is "~2 minutes for dynamic entries." That figure corresponds to the legacy pre-Vista `ArpCacheLife` behavior. Modern Windows (Vista and later) uses RFC 4861 neighbor discovery with a randomized `ReachableTime` typically in the 15–45 second range. Updated the takeaway accordingly.

## Review Notes
- The `Get-NetNeighbor` State table lists five common states but omits `Probe`, `Delay`, and `Maximum` (which is a testing sentinel per Microsoft docs). Not incorrect for a tutorial — the listed states are the ones most commonly observed in practice — but could be expanded in future revisions.
- Windows does automatically populate broadcast (e.g., `192.168.1.255`) and link-local multicast (e.g., `224.0.0.22`) entries as `static` in `arp -a` output; this matches observed Windows behavior, though I could not locate a single authoritative Microsoft page stating this explicitly.
- The Python snippet's `len(parts) == 3` check works for the typical Windows `arp -a` output format, but will silently skip the interface header line (which is intended behavior here).
