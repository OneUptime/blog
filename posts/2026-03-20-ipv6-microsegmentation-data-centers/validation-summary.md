# Validation Summary: How to Implement IPv6 Microsegmentation in Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Microsegmentation
- Linux `nftables`
- Kubernetes `NetworkPolicy`
- Calico `GlobalNetworkPolicy`
- Arista EOS IPv6 ACLs

## Sources Consulted
- Netfilter `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, packet-header matching: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes IPv4/IPv6 dual-stack networking: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Calico `GlobalNetworkPolicy` reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels and selector guidance: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/html/rfc4890
- Arista EOS ACL and route map documentation: https://www.arista.com/en/um-eos/eos-acls-and-route-maps

## Issues Found
- The `nftables` example matched ICMPv6 with `ip6 nexthdr icmpv6`, which the nftables documentation warns can miss IPv6 traffic when extension headers are present. I changed it to `meta l4proto ipv6-icmp accept`, which matches ICMPv6 more reliably for IPv6 filtering.
- The example prefixes `2001:db8:lb::/64` and `2001:db8:mgmt::/64` were not valid IPv6 text representations because IPv6 hextets may contain only hexadecimal digits. I replaced them with valid documentation prefixes under `2001:db8::/32`.
- The Calico selector `tenant == 'same-tenant-label'` did not implement generic same-tenant isolation; it only matched the literal label value `same-tenant-label`. I replaced it with a concrete tenant-specific policy example that correctly enforces intra-tenant ingress for `tenant-a`.
- The conclusion implied that IPv6 `/128` targeting replaces label- and tag-based policy. I revised that sentence to reflect the technically accurate position that address-based rules complement, rather than replace, label/tag-based controls.

## Review Notes
- The Kubernetes `NetworkPolicy` example is valid, but as Kubernetes documents note, enforcement depends on a network plugin that supports `NetworkPolicy`, and IPv6 use depends on IPv6 or dual-stack support in the cluster networking stack.
- The Arista EOS ACL example is syntactically consistent with current vendor documentation for named IPv6 ACLs and sequence-based permit/deny entries.
- I attempted local `nft -c` validation, but this environment could not complete netlink initialization, so the `nftables` review was completed against the official man page and nftables documentation instead.
