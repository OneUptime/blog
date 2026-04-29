# Validation Summary: How to Understand IPv6 Transition Technologies on Windows (Teredo, ISATAP, 6to4)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows IPv6 transition technologies
- Teredo
- ISATAP
- 6to4
- IP-HTTPS
- DirectAccess
- `netsh`
- PowerShell networking cmdlets

## Sources Consulted
- Microsoft Learn: `netsh interface` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: Teredo overview: https://learn.microsoft.com/en-us/windows/win32/teredo/portal
- Microsoft Learn: Teredo components: https://learn.microsoft.com/en-us/windows/win32/teredo/teredo-components
- Microsoft Learn: `Set-NetIsatapConfiguration`: https://learn.microsoft.com/en-us/powershell/module/networktransition/set-netisatapconfiguration?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPInterface`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: DirectAccess connectivity from behind a NAT device: https://learn.microsoft.com/en-us/windows-server/remote/remote-access/directaccess/tlg-cluster-nlb/STEP-6-Test-DirectAccess-Client-Connectivity-from-Behind-a-NAT-Device
- RFC 4380, Teredo: https://www.rfc-editor.org/rfc/rfc4380
- RFC 5214, ISATAP: https://www.rfc-editor.org/rfc/rfc5214
- RFC 3056, 6to4: https://www.rfc-editor.org/rfc/rfc3056.html
- RFC 7526, Deprecating the Anycast Prefix for 6to4 Relay Routers: https://www.rfc-editor.org/rfc/rfc7526.html

## Issues Found
- The Teredo diagram showed the Teredo server as the direct path to the IPv6 Internet. I updated it to distinguish the Teredo server's setup role from the Teredo relay's packet-forwarding role, which matches Microsoft documentation and RFC 4380.
- The ISATAP router example implied only an IPv4 address was valid and omitted the documented `name=` form. I updated it to say "router name or IPv4 address" and used `name=192.168.1.1`, matching current `netsh` syntax.
- The 6to4 section said RFC 7526 deprecated 6to4 outright. I corrected this to reflect that RFC 7526 deprecated the anycast relay mechanism and recommends 6to4 be disabled by default, but does not deprecate the base unicast 6to4 mechanism.
- The PowerShell example for listing tunnel interfaces used `Get-NetAdapter`, which by default only returns visible adapters. I replaced it with `Get-NetIPInterface -AddressFamily IPv6`, which includes virtual interfaces.
- The summary used an invalid slash-combined `netsh` command. I replaced it with the three real commands.

## Review Notes
- The `netsh` contexts used in the post (`teredo`, `isatap`, `6to4`, and `httpstunnel`) are still documented by Microsoft for current supported Windows releases as of April 29, 2026.
- Teredo, ISATAP, and 6to4 are legacy transition mechanisms. The post's recommendation to disable them on networks with native IPv6 remains reasonable.
