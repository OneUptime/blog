# Validation Summary: How to Configure IPv6 on Arista EOS Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- Arista EOS
- IPv6
- BGP
- BGP unnumbered
- IPv6 ACLs
- eAPI
- Python `requests`

## Sources Consulted
- Arista EOS IPv6 documentation: https://www.arista.com/en/um-eos/eos-ipv6
- Arista EOS Border Gateway Protocol (BGP) documentation: https://www.arista.com/en/um-eos/eos-border-gateway-protocol-bgp
- Arista EOS ACLs and Route Maps documentation: https://www.arista.com/en/um-eos/eos-acls-and-route-maps
- Arista eAPI solution brief: https://www.arista.com/assets/data/pdf/Whitepapers/Arista_eAPI_FINAL.pdf

## Issues Found
- The loopback comment incorrectly implied an IPv6 loopback address would serve as the BGP router ID. Arista documents BGP router ID as an IPv4-style identifier, so the comment was changed to describe the loopback accurately.
- The IPv6 `network 2001:db8::/48` example did not match any prefix configured earlier in the post, so it would not be advertised by BGP unless that exact route existed in the local RIB. It was changed to `network 2001:db8::1/128`, which matches the configured loopback.
- The static IPv6 BGP neighbor address did not align with the routed interface subnet used earlier in the post. It was updated from `2001:db8:0:1::2` to `2001:db8:1:1::2` so the example is internally consistent.
- The BGP unnumbered example used `remote-as external`, which is not how Arista documents EOS interface-neighbor unnumbered configuration in the reviewed material. It was changed to an explicit remote AS and updated to use `neighbor SPINE auto-local-addr`, which Arista documents for carrying IPv4 NLRI over IPv6 transport.
- The IPv4 unnumbered example used `neighbor SPINE next-hop-unchanged`, which does not provide the documented IPv4 next-hop behavior needed for IPv4 NLRI over IPv6 transport. That line was removed and replaced by `auto-local-addr` at the peer-group level.
- The IPv6 ACL example used invalid IPv6 ACL syntax: `icmp` should be `icmpv6`, and `established` is not the documented IPv6 ACL keyword in EOS. The ACL was corrected to documented syntax.
- The verification command `show bgp ipv6 unicast summary` was replaced with Arista’s documented `show ipv6 bgp summary`.
- The verification command `show bgp ipv6 unicast neighbors Ethernet1` was replaced with the documented `show ipv6 bgp peers`.
- The eAPI section did not mention that `management api http-commands` must be enabled before `/command-api` can be used. A short note was added for correctness.

## Review Notes
- Step 3 is best understood as an alternative interface model for BGP unnumbered, not an additive step on top of the numbered interface example in Step 1.
- The Python eAPI example is valid, but `verify=False` suppresses TLS certificate validation and is appropriate mainly for labs or environments using self-signed certificates.
