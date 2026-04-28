# Validation Summary: How to Use netsh interface ipv6 Commands on Windows

## Status
validated

## Post Type
Reference / Command Cheat Sheet

## Technologies Covered
- Windows `netsh` command-line utility
- `netsh interface ipv6` context (addresses, routes, DNS, neighbors, global settings)
- `netsh interface teredo`, `netsh interface 6to4`, `netsh interface isatap` transition technology contexts
- IPv6 protocol concepts (router discovery, privacy extensions, DHCPv6, neighbor cache)

## Sources Consulted
- Microsoft Learn — Netsh Commands for Interface (IPv4 and IPv6): https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-r2-and-2008/cc770948(v=ws.10)
- Microsoft Learn — Netsh commands for Interface IPv6: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc740203(v=ws.10)
- Microsoft Learn — netsh interface (Windows Commands): https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- MicrosoftDocs windowsserverdocs — netsh-interface.md (GitHub)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (use of `2001:db8::/32`)
- RFC 4861 — Neighbor Discovery for IP version 6

## Issues Found
1. **Invalid IPv6 literals in route example.** The original "Add a specific route" example used `2001:db8:remote::/48` and a nexthop of `2001:db8::gateway`. Neither is a valid IPv6 address — IPv6 hextets must consist only of hexadecimal digits, and "remote" / "gateway" contain non-hex characters. Anyone copy-pasting the command would get a parse error from netsh. Replaced with valid documentation-prefix addresses: `2001:db8:1::/48` and nexthop `2001:db8::1`.

2. **Invalid `dhcp=` parameter on `set interface`.** The original post showed:
   ```
   netsh interface ipv6 set interface "Ethernet" dhcp=enabled
   netsh interface ipv6 set interface "Ethernet" dhcp=disabled
   ```
   `netsh interface ipv6 set interface` does not accept a `dhcp` parameter on modern Windows. Per Microsoft documentation, valid parameters include `forwarding`, `advertise`, `mtu`, `siteid`, `metric`, `firewall`, `siteprefixlength`, `routerdiscovery`, `managedaddress`, `otherstateful`, etc., but no `dhcp=` toggle. Removed the two invalid commands and replaced with a valid `mtu=1500` example to keep the section's parameter coverage.

## Review Notes
- The DNS subcommand naming on modern Windows is canonically plural (`add dnsservers`, `delete dnsservers`, `set dnsservers`, `show dnsservers`). The post mixes the legacy singular form (`add dnsserver`, `delete dnsserver`) with the plural for `set`/`show`. Both forms still work on current Windows builds because netsh accepts the singular as a legacy alias, so this was not corrected, but a future revision could standardize on the plural form.
- The `netsh interface ipv6` context, while still functional on Windows 10/11/Server 2022+, is considered legacy. Microsoft's recommended modern approach is the PowerShell `NetTCPIP` module (`Get-NetIPAddress`, `New-NetIPAddress`, `New-NetRoute`, `Set-DnsClientServerAddress`, etc.), which the post correctly notes in the summary.
- The `add address ... type=unicast` example is technically valid but the comment "Add an address with lifetime" is slightly misleading — `type=unicast` sets the address type, not a lifetime. The lifetime parameters are `validlifetime=` and `preferredlifetime=`. Left as-is since the command itself is valid; only the descriptive comment is imprecise.
- `netsh interface ipv6 reset` does require an administrative restart for the changes to fully take effect, as the post correctly warns.
