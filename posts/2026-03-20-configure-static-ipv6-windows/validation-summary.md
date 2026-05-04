# Validation Summary: How to Configure Static IPv6 Addresses on Windows

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Windows IPv6 networking
- PowerShell NetTCPIP module cmdlets: `New-NetIPAddress`, `Get-NetIPAddress`, `Remove-NetIPAddress`, `Get-NetIPConfiguration`, `Get-NetRoute`, `Remove-NetRoute`, `Test-NetConnection`
- PowerShell NetAdapter module: `Get-NetAdapter`
- `netsh interface ipv6` subcommands: `add address`, `add route`, `add dnsserver`, `show addresses`, `show routes`
- Windows GUI network configuration (`ncpa.cpl` → IPv6 Properties)
- IPv6 address types: documentation prefix (`2001:db8::/32`, RFC 3849) and Unique Local Addresses (`fd00::/8`, RFC 4193)
- Google Public DNS over IPv6 (`2001:4860:4860::8888`, `2001:4860:4860::8844`)
- `ping -6` for IPv6 connectivity testing

## Sources Consulted
- Microsoft `New-NetIPAddress` reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress
- Microsoft `Get-NetIPAddress` reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress
- Microsoft `Remove-NetIPAddress` reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress
- Microsoft `Remove-NetRoute` reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute
- Microsoft `Get-NetIPConfiguration` reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipconfiguration
- Microsoft `Test-NetConnection` reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft `Get-NetAdapter` reference: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter
- Microsoft `netsh interface ipv6` documentation: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface-ipv6
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- RFC 4193 — Unique Local IPv6 Unicast Addresses (`fc00::/7`, with `fd00::/8` for locally-assigned)
- Google Public DNS for IPv6: https://developers.google.com/speed/public-dns/docs/using

## Issues Found
No technical issues found.

Specific verifications:
- **`New-NetIPAddress` with IPv6**: Cmdlet supports IPv6 directly when the supplied address is an IPv6 address; `-PrefixLength 64` and `-DefaultGateway "2001:db8::1"` are correct.
- **`PrefixOrigin` values**: `Manual`, `Dhcp`, `WellKnown`, `RouterAdvertisement` are valid; filtering on `Manual` correctly selects user-configured addresses.
- **`netsh interface ipv6 add address`** positional syntax: `[interface=] [address=]/[prefix]` — correct.
- **`netsh interface ipv6 add route`** positional syntax: `[prefix=] [interface=] [nexthop=]` — correct, `::/0` is the default IPv6 route.
- **`netsh interface ipv6 add dnsserver`** syntax: `[name=] [address=] [index=]` — correct, `index=1`/`index=2` set primary/secondary order.
- **Documentation prefix `2001:db8::/32`** is the IETF-reserved documentation range (RFC 3849) — appropriate for examples.
- **ULA range**: `fd00::/8` is part of the locally-assigned ULA space (`fc00::/7` with the L bit set), per RFC 4193. `fd00:db8::10` is a syntactically valid ULA.
- **Google Public DNS IPv6 addresses** `2001:4860:4860::8888` and `2001:4860:4860::8844` are correct.
- **`ping -6`** flag is the documented way to force IPv6 in Windows `ping`.
- **`Test-NetConnection -ComputerName ... -Port 443`** is correct usage to test TCP reachability.

## Review Notes
- The GUI section uses a ```` ```sql ```` code fence for what is plain step-by-step text. This is a minor markdown rendering issue (incorrect syntax highlighter selection), not a technical error in any command, so it was left unchanged per the instruction to avoid stylistic edits.
- The summary mentions `Set-DnsClientServerAddress` for setting DNS, but no example using that cmdlet appears in the body. The cmdlet name and intent are correct; this is a minor inconsistency rather than a technical error.
- The "ULA address" example uses `-PrefixLength 48`, which is unusual for an interface address (a /64 is more typical for hosts on a single subnet within a /48 ULA allocation). The command is technically valid; readers configuring real ULA hosts would normally use `/64` for the interface address while reserving `/48` for the site allocation.
- `Test-NetConnection -ComputerName "2001:4860:4860::8888" -Port 443` will attempt a TCP connection on port 443 to Google Public DNS. Google Public DNS does serve DoH at `dns.google` (which resolves to those IPs) on port 443, so the test is meaningful, though end users may also see a generic ICMP-based reachability result depending on the cmdlet's fallback behavior.
- The post tags include "Window" (singular); this is a typo in the metadata, not a technical inaccuracy in the content.
