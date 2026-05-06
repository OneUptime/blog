# Validation Summary: How to Compare GRE vs IPIP vs SIT Tunnels on Linux

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Linux networking
- iproute2
- GRE
- IPIP
- SIT
- IPv4
- IPv6

## Sources Consulted
- Local `iproute2` tooling: `ip tunnel help`, `man ip-tunnel`, and `man ip-link`
- Linux Kernel documentation on fallback tunnel devices: https://docs.kernel.org/6.1/admin-guide/sysctl/net.html
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- RFC 2890, Key and Sequence Number Extensions to GRE: https://www.rfc-editor.org/rfc/rfc2890
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003
- RFC 4213, Basic Transition Mechanisms for IPv6 Hosts and Routers: https://www.rfc-editor.org/rfc/rfc4213.html
- Local kernel module metadata: `modinfo ip_gre`, `modinfo ipip`, and `modinfo sit`

## Issues Found
- The description and introduction implied GRE, IPIP, and SIT are the primary Linux tunnel types. I changed that wording to "three common" tunnel types because current `iproute2` documentation lists additional tunnel modes.
- The GRE overhead entry listed a fixed 24-byte overhead. I corrected it to 24-36 bytes because GRE has a 4-byte base header and optional checksum, key, and sequence fields that increase the encapsulation overhead.
- The GRE and SIT examples used `gre0` and `sit0`, which Linux commonly reserves as fallback tunnel device names. I changed the examples to use non-fallback names and added `ip link set ... up` so the sample interfaces are operational after creation.
- The table and conclusion used "site-to-site VPN" wording for GRE. I changed that to "site-to-site routed tunnel" so the post does not imply GRE, IPIP, or SIT provide encryption or authentication on their own.

## Review Notes
- These tunnel types provide encapsulation, not encryption. If the tunnel is intended to function as a VPN, it should be paired with IPsec or replaced with a technology that includes confidentiality and authentication.
- The remaining `ip tunnel add` syntax in the post matches current Linux `iproute2` documentation.
