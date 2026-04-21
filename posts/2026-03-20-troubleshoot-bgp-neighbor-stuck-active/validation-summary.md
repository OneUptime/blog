# Validation Summary: How to Troubleshoot BGP Neighbor State Stuck in Active

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- BGP
- Cisco IOS / IOS XE CLI
- TCP port 179
- BGP MD5 authentication
- iBGP loopback peering
- eBGP multihop

## Sources Consulted
- RFC 4271: A Border Gateway Protocol 4 (BGP-4) - https://www.ietf.org/rfc/rfc4271
- IANA Service Name and Transport Protocol Port Number Registry - https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=179
- Cisco: Troubleshoot Border Gateway Protocol Basic Issues - https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/218027-troubleshoot-border-gateway-protocol-bas.html
- Cisco: Troubleshoot BGP Neighborship Connection Issues - https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13752-24.html
- Cisco: Configure MD5 Authentication Between BGP Peers - https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/112188-configure-md5-bgp-00.html
- Cisco IOS Debug Command Reference: debug ip bgp - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i1.html
- Cisco IOS IP Routing: BGP Command Reference - https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco: Understand the Extended Ping and Extended Traceroute Commands - https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13730-ext-ping-trace.html

## Issues Found
- The Active-state description was too narrow because RFC 4271 describes Active as trying to acquire a peer by listening for and accepting TCP connections, with retries handled by the FSM. Updated the wording to include both inbound listening and retry behavior.
- The port 179 troubleshooting step said a failed telnet with successful ping means a firewall is blocking BGP. Cisco documentation distinguishes ACL/firewall loss from connection refused or remote control-plane/listener issues, so the text now lists those possibilities instead of making one absolute diagnosis.
- The AS-number section described AS mismatch as a direct cause of Active state. RFC 4271 treats an unacceptable AS in the OPEN message as a Bad Peer AS error after TCP can already be established, so the wording now says it keeps the neighbor from reaching Established.
- The MD5 authentication section said the peer drops the SYN. Cisco documents BGP MD5 as generating and checking an MD5 digest on every TCP segment, with missing or invalid digest messages such as `%TCP-6-BADAUTH`, so the wording now describes the failed TCP session more generally.
- The conclusion called AS mismatch part of a TCP connectivity problem. Updated it to say Active usually means the session cannot complete TCP setup or the initial BGP OPEN exchange.

## Review Notes
The examples and commands are Cisco IOS/IOS XE oriented. Other platforms use different command syntax, and BGP debug commands can be noisy on production devices.
