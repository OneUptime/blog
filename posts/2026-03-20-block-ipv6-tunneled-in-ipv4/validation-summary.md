# Validation Summary: How to Block IPv6 Tunneled in IPv4 When Not Deploying IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 transition mechanisms
- IPv4 packet filtering
- `iptables`
- `nftables`
- Cisco IOS ACLs
- Windows `netsh`
- PowerShell `NetAdapter` cmdlets
- `tcpdump`
- `tshark`

## Sources Consulted
- RFC 7123, "Security Implications of IPv6 on IPv4 Networks" - https://www.rfc-editor.org/rfc/rfc7123.html
- RFC 5214, "Intra-Site Automatic Tunnel Addressing Protocol (ISATAP)" - https://www.rfc-editor.org/rfc/rfc5214
- RFC 3056, "Connection of IPv6 Domains via IPv4 Clouds" - https://www.rfc-editor.org/rfc/rfc3056
- RFC 4380, "Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs)" - https://www.rfc-editor.org/rfc/rfc4380
- RFC 5969, "IPv6 Rapid Deployment on IPv4 Infrastructures (6rd) -- Protocol Specification" - https://www.rfc-editor.org/rfc/rfc5969
- RFC 2784, "Generic Routing Encapsulation (GRE)" - https://www.rfc-editor.org/rfc/rfc2784
- RFC 7526, "Deprecating the Anycast Prefix for 6to4 Relay Routers" - https://www.rfc-editor.org/rfc/rfc7526.html
- Microsoft Learn, `netsh interface` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, `Get-NetAdapter` - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn, `Disable-NetAdapter` - https://learn.microsoft.com/en-us/powershell/module/netadapter/disable-netadapter?view=windowsserver2025-ps
- Cisco, "Configure IP Access Lists" - https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
- `iptables(8)` local man page
- `iptables-save(8)` local man page
- `iptables-extensions(8)` local man page
- `nft(8)` local man page and official nftables documentation - https://netfilter.org/projects/nftables/manpage.html
- `ip link` local help output

## Issues Found
- The ISATAP row identified `239.0.0.x` multicast as its marker. That is associated with 6over4-style multicast filtering, not ISATAP. I changed the identifier to the ISATAP router / `isatap.<localdomain>` to match RFC 5214 and RFC 7123.
- The `iptables-save > /etc/iptables/rules.v4` example was presented as generic persistence. I kept the command but clarified that this file path is a Debian/Ubuntu pattern used with `iptables-persistent`; `iptables-save` itself only writes to stdout or a specified file.
- The post used a Microsoft-specific Teredo hostname as if it were the protocol identifier, and the `iptables` section used a hostname-based block example that is not reliable as written because `iptables` resolves hostnames only once when the rule is added. I generalized the table entry to the Teredo server role, replaced the hostname-based command with an explanatory note, and added the missing forwarded source-port 3544 drop rule so the stateless example is more complete.
- The `nftables` chain-creation commands were not shell-safe as written and the section was missing equivalent `forward` rules for Teredo and GRE. I quoted the base-chain commands using the form documented by nftables and added the missing `forward` rules.
- The Cisco IOS ACL only matched Teredo destination port 3544 and 6to4 destination addresses, which is incomplete for a stateless ACL applied in both directions. I added reverse-direction Teredo and 6to4 deny entries.
- The network verification step used `ping 192.88.99.1`, which tests ICMP reachability and does not directly validate protocol 41 filtering. I replaced it with a protocol-41-specific `tshark` example.

## Review Notes
- RFC 7526 deprecates the `192.88.99.0/24` 6to4 anycast prefix. The post already notes 6to4 deprecation, and blocking that prefix remains reasonable in an IPv4-only enterprise environment.
- RFC 7123 frames this kind of tunnel blocking as an enterprise-network mitigation and generally a temporary control until IPv6 is properly deployed and filtered natively.
- Current Windows still documents `netsh` controls for Teredo, ISATAP, and 6to4, but specific Teredo server hostnames can vary over time; UDP port 3544 blocking is the durable control.
