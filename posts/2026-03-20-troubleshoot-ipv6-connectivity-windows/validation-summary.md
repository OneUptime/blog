# Validation Summary: How to Troubleshoot IPv6 Connectivity on Windows

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- IPv6 addressing and routing
- Windows networking
- PowerShell NetAdapter, NetTCPIP, DnsClient, and NetSecurity modules
- Windows command-line diagnostics: ipconfig, ping, tracert, pathping, and netsh
- DNS and Windows Firewall diagnostics

## Sources Consulted
- Microsoft Learn: Get-NetAdapterBinding - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding
- Microsoft Learn: Get-NetIPAddress, Get-NetRoute, New-NetRoute, Find-NetRoute, and Test-NetConnection - https://learn.microsoft.com/en-us/powershell/module/nettcpip/
- Microsoft Learn: Resolve-DnsName, Get-DnsClientServerAddress, Set-DnsClientServerAddress, and Clear-DnsClientCache - https://learn.microsoft.com/en-us/powershell/module/dnsclient/
- Microsoft Learn: Get-NetFirewallProfile, Get-NetFirewallRule, Get-NetFirewallAddressFilter, and Set-NetFirewallProfile - https://learn.microsoft.com/en-us/powershell/module/netsecurity/
- Microsoft Learn: ping, tracert, and pathping command documentation - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: Netsh.exe IPv6 command reference - https://learn.microsoft.com/en-us/windows/win32/winsock/netsh-exe
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 4193: Unique Local IPv6 Unicast Addresses - https://www.rfc-editor.org/rfc/rfc4193
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc3849
- IANA: IPv6 Global Unicast Address Space and IPv6 Special-Purpose Address Space registries - https://www.iana.org/assignments/ipv6-unicast-address-assignments/
- Google Public DNS setup documentation - https://developers.google.com/speed/public-dns/docs/using
- GitHub author profile - https://github.com/nawazdhandala

## Issues Found
- The tags listed "Window" instead of "Windows". Updated the tag to match the Windows technology covered by the post.
- The address-assignment comment described global IPv6 addresses as starting with "2xxx or fcxx". This was inaccurate because `fc00::/7` is Unique Local Address space, not globally reachable, and current assignable global unicast space is `2000::/3`. Changed the comment to check for a non-link-local address and distinguish global unicast from ULA.
- The default route example used `2001:db8::1` as a next hop. `2001:db8::/32` is reserved for documentation and should not be used as an operational gateway address. Replaced it with a link-local next-hop example and a note to substitute the router's real IPv6 next hop.
- The `Test-NetConnection` example tested TCP port 443 against `2001:4860:4860::8888`, which is a Google Public DNS address. Changed the test to port 53 so the port matches the DNS service at that target.
- The DNS server fix mixed an IPv6 DNS server with the IPv4 address `8.8.8.8` while describing an IPv6 DNS fix. Replaced `8.8.8.8` with Google's second IPv6 DNS server, `2001:4860:4860::8844`.

## Review Notes
Commands that change routes, DNS server settings, firewall profiles, registry values, or reset the networking stack generally require an elevated PowerShell or Command Prompt session. The firewall disable/enable example is technically valid for testing, but a production runbook should preserve and restore each profile's previous state rather than enabling all profiles unconditionally.
