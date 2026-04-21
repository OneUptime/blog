# Validation Summary: How to Understand SRv6 in Data Center Fabrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SRv6
- BGP
- EVPN
- FRRouting
- Linux iproute2
- ethtool
- IPv6 data center Clos fabrics

## Sources Consulted
- RFC 8986, Segment Routing over IPv6 (SRv6) Network Programming: https://www.ietf.org/rfc/rfc8986.html
- RFC 9252, BGP Overlay Services Based on Segment Routing over IPv6 (SRv6): https://www.ietf.org/rfc/rfc9252.html
- RFC 8754, IPv6 Segment Routing Header (SRH): https://www.ietf.org/rfc/rfc8754.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Zebra/SRv6 locator documentation: https://docs.frrouting.org/en/latest/zebra.html
- iproute2 route syntax from local `ip -6 route help`
- ethtool syntax from local `ethtool -h`
- iputils ping syntax from local `ping -6 -h` and `ping6 -h`

## Issues Found
- Several examples used invalid IPv6 addresses such as `5f00:spine::`, `fd00:red::a`, and `fd00:l1-s1::spine1`. I replaced them with valid documentation and ULA addresses, primarily under `2001:db8::/32` and `fd00::/8`.
- The fabric diagram was fenced as `yaml` even though it is plain text. I changed the fence to `text`.
- The FRR configuration used EVPN-VXLAN commands (`advertise-all-vni`, `advertise-svi-ip`) under a section describing SRv6 transport. I replaced it with documented FRR L3VPN/SRv6 configuration elements: SRv6 locator setup, BGP `segment-routing srv6`, VPN route import/export, and explicit SRv6 SID export.
- The EVPN control-plane example called the SID an "SRv6 L3 VPN SID" and showed bracketed Linux `segs` syntax. I updated the terminology to "SRv6 L3 Service SID" and used the `ip route` syntax shown by iproute2.
- The traffic-engineering example claimed a route change ensured only VRF Red traffic used a specific spine. A route to the locator affects traffic matching that route or policy, so I changed the comment to reflect that scope.
- The ECMP section incorrectly described SRv6 ECMP hashing as an outer IPv6 5-tuple. RFC 8986 requires the outer IPv6 source, destination, and flow label to be included, so I corrected the explanation.
- The ECMP verification example checked RX queue counters on one interface even though the example discusses outbound traffic across two spine links. I changed it to inspect TX counters on both example interfaces.
- Monitoring examples still referenced the old locator space. I updated them to match the corrected locator plan.

## Review Notes
FRR's documented SRv6 backend is for L3VPN and global IPv4/IPv6 services, while the EVPN SRv6 control-plane behavior is standardized in RFC 9252 and implementation-specific by network operating system. The commands remain illustrative and require real interface names, allocated locator prefixes, and matching NOS support before production use.
