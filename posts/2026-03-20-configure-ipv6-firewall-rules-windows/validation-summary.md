# Validation Summary: How to Configure IPv6 Firewall Rules on Windows

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Windows Defender Firewall (Windows Firewall with Advanced Security)
- PowerShell `NetSecurity` module cmdlets (`New-NetFirewallRule`, `Get-NetFirewallRule`, `Get-NetFirewallAddressFilter`, `Disable-NetFirewallRule`, `Remove-NetFirewallRule`)
- `netsh advfirewall firewall` CLI
- IPv6 addressing and subnetting (RFC 4291, RFC 3849)
- ICMPv6 / Neighbor Discovery Protocol (RFC 4443, RFC 4861)
- `wf.msc` (Windows Firewall MMC snap-in)

## Sources Consulted
- Microsoft Learn — `New-NetFirewallRule`: https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule
- Microsoft Learn — `Get-NetFirewallRule`: https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallrule
- Microsoft Learn — `Get-NetFirewallAddressFilter`: https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewalladdressfilter
- Microsoft Learn — `netsh advfirewall firewall`: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-advfirewall-firewall
- Microsoft Learn — `findstr` command reference
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- RFC 4443 — Internet Control Message Protocol (ICMPv6)
- RFC 4861 — Neighbor Discovery for IP version 6 (defines NDP types 133–137)
- IANA ICMPv6 Type Numbers registry

## Issues Found
1. **Invalid IPv6 address `2001:db8:blocked::/48`** — The string "blocked" contains the characters `l`, `o`, and `k`, which are not valid hexadecimal digits (IPv6 only allows `0-9` and `a-f`). I changed the example to `2001:db8:bad::/48`, which uses only valid hex digits and is still within the RFC 3849 documentation prefix `2001:db8::/32`. Both the `-RemoteAddress` value and the `-DisplayName` reference were updated.
2. **Incorrect `findstr` alternation syntax** — The original `findstr /i "ipv6\|::"` used a grep/sed-style `\|` alternation, which `findstr` does not support. In `findstr`, multiple search tokens separated by spaces are treated as OR by default. I changed it to `findstr /i "ipv6 ::"`, which correctly matches lines containing either substring.

## Review Notes
- The PowerShell `New-NetFirewallRule` parameter syntax (`-Name`, `-DisplayName`, `-Direction`, `-Protocol`, `-LocalPort`, `-RemoteAddress`, `-Action`, `-Enabled`) and the use of `-IcmpType` with comma-separated type numbers are all correct per Microsoft documentation.
- The ICMPv6 type numbers (133 Router Solicitation, 134 Router Advertisement, 135 Neighbor Solicitation, 136 Neighbor Advertisement, 137 Redirect) are correct per RFC 4861 and the IANA ICMPv6 registry. The advice to allow these types for IPv6 NDP to function is accurate.
- The DisplayName string `"Block 2001:db8::bad:actor"` contains the non-hex word "actor", but a DisplayName is just a free-text label and does not need to be a valid address; the actual `-RemoteAddress` value `2001:db8::bad:ac70` is valid. Left as-is.
- The "Manage Rules via GUI" code block is tagged as ```sql even though it contains plain text instructions, not SQL. This is a minor cosmetic issue (not technically incorrect) and was left unchanged per the instruction to avoid stylistic changes.
- `-Enabled True` is accepted by `New-NetFirewallRule`; new rules are enabled by default, so the parameter is redundant but not incorrect.
