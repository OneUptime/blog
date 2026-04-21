# Validation Summary: How to Understand Teredo Tunneling Through NAT

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6
- Teredo tunneling
- IPv4 NAT / NAPT
- UDP encapsulation
- Teredo servers, relays, and clients
- Windows `netsh interface teredo`
- IPv6 transition technology security

## Sources Consulted
- RFC 4380, Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs): https://datatracker.ietf.org/doc/html/rfc4380
- RFC 5991, Teredo Security Updates: https://datatracker.ietf.org/doc/html/rfc5991
- RFC 6081, Teredo Extensions: https://datatracker.ietf.org/doc/rfc6081/
- RFC 6169, Security Concerns with IP Tunneling: https://www.rfc-editor.org/rfc/rfc6169
- RFC 7123, Security Implications of IPv6 on IPv4 Networks: https://www.rfc-editor.org/rfc/rfc7123
- RFC 9099, Operational Security Considerations for IPv6 Networks: https://www.ietf.org/rfc/rfc9099.html
- RFC 9601, Propagating Explicit Congestion Notification across IP Tunnel Headers Separated by a Shim: https://www.rfc-editor.org/rfc/rfc9601
- Microsoft Learn, Teredo Components: https://learn.microsoft.com/en-us/windows/win32/teredo/teredo-components
- Microsoft Learn, Teredo Addresses: https://learn.microsoft.com/en-us/windows/win32/teredo/teredo-addresses
- Microsoft Learn, Receiving Unsolicited Traffic Over Teredo: https://learn.microsoft.com/en-us/windows/win32/teredo/receiving-unsolicited-traffic-over-teredo
- Microsoft Learn, netsh interface command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, Deprecated features for Windows client: https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features

## Issues Found
- The post described the Teredo server as assigning the client's Teredo IPv6 address. RFC 4380 and Microsoft documentation describe the server as assisting address configuration while the client configures the Teredo address from the advertised prefix and learned mapped IP/port. Updated the workflow, packet-flow diagram, component table, and summary.
- The client example labeled the NAT external address as the client's public IPv4 address. Updated the label to "Mapped IPv4" to match Teredo terminology.
- The Teredo address diagram described the flags as simple NAT flags and used a zero flags example. RFC 5991 updates RFC 4380 by randomizing unused flags bits and deprecating exposure of the cone bit. Updated the diagram and example to show flags as cone-bit plus RFC 5991 random bits.
- The packet-flow section implied normal data can flow through the Teredo server. RFC 4380 states the server is used for qualification, bubbles, and relay discovery, while relays carry data traffic. Updated the workflow and summary to distinguish server and relay roles.
- The firewall-bypass example contradicted itself by saying all outbound ports except 80/443 were blocked while UDP 3544 was allowed. Reworded it to describe a firewall that blocks most outbound ports but allows UDP 3544 or unrestricted outbound UDP.
- The security wording said IPv6 traffic bypasses the IPv4 firewall entirely. Updated it to the more precise claim that tunneled IPv6 bypasses IPv4-only firewall policy controls when those controls do not inspect the UDP payload.
- The inbound-connectivity section omitted the Windows host firewall caveat. Added that reachability through Teredo is subject to host firewall policy.
- The enterprise-control section incorrectly said Teredo auto-discovers servers. Updated it to state that clients use configured/default servers and discover relays through protocol behavior and IPv6 routing.
- The deprecation section overstated Windows version behavior and IETF positioning. Replaced it with Microsoft-documented Windows 10 version 1803-and-later default disablement and IETF operational-security guidance to block Teredo where it bypasses IPv4-only security policy.
- The sample `netsh interface teredo show state` output had malformed `Network` and `NAT` labels and omitted the `State` line being discussed. Corrected the sample output format.

## Review Notes
The post is technically relevant and validated after corrections. RFC 4380 remains a Proposed Standard and has later updates, including RFC 5991, RFC 6081, and RFC 9601; the practical deprecation language in the post now refers to Windows deprecation/default disablement and operational security guidance rather than implying the Teredo RFC itself has been moved to Historic.
