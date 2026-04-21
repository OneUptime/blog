# Validation Summary: How to Configure Split-Horizon DNS with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 DNS and AAAA records
- Split-horizon DNS
- BIND 9 views and zone files
- Unbound views and local data
- CoreDNS view, file, forward, and Kubernetes plugins
- Kubernetes CoreDNS ConfigMap patterns
- `dig`

## Sources Consulted
- BIND 9 Configuration Reference: https://bind9.readthedocs.io/en/v9.18.45/reference.html
- BIND 9 `dig` manual page: https://bind9.readthedocs.io/en/v9.18.18/manpages.html
- Unbound `unbound.conf(5)` documentation: https://www.nlnetlabs.nl/documentation/unbound/unbound.conf/
- Unbound Tags and Views documentation: https://unbound.docs.nlnetlabs.nl/en/latest/topics/filtering/tags-views.html
- CoreDNS view plugin documentation: https://coredns.io/plugins/view/
- CoreDNS file plugin documentation: https://coredns.io/plugins/file/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- Several IPv6 examples used invalid literals such as `2001:db8:internal::/48` and `2001:db8:external::1`. IPv6 hextets must be hexadecimal, so I replaced them with valid documentation-prefix examples such as `2001:db8:1::/48` and `2001:db8:2::1`.
- The internal DNS answers used `fd00::10` style addresses. I changed these to a concrete ULA-style /48, `fd12:3456:789a::/48`, so the examples align better with RFC 4193's locally assigned ULA structure.
- The BIND examples used `type master`; current BIND documentation uses `type primary`. I updated the zone type and added explicit `allow-recursion` and `allow-query-cache` ACLs for the internal view.
- The BIND zone files only listed AAAA records, which would not be complete authoritative zone files. I added `$TTL`, SOA, NS, and nameserver AAAA records to both internal and external zone examples.
- The Unbound example used a global `stub-zone`, which does not provide per-client split-horizon answers by itself. I replaced it with Unbound views selected by `access-control-view` and view-specific `local-data`.
- The CoreDNS examples used invalid view syntax for the external case (`view external`) and split one `expr` directive across lines. I removed the bare external view, kept the fallback server block without a view condition, and made the internal view expressions valid single-line expressions.
- The Kubernetes CoreDNS example described `service.namespace.svc.cluster.local` while configuring `example.com`. I adjusted the comments to describe app names under `example.com`.
- The CoreDNS forward example used an unbracketed IPv6 upstream. I changed it to `[2606:4700:4700::1111]:53`, matching the documented CoreDNS IPv6 endpoint syntax.
- The code fence labels for BIND and Unbound snippets implied unrelated formats. I changed them to plain text fences.

## Review Notes
The examples intentionally use `2001:db8::/32`, which RFC 3849 reserves for documentation and is not routable in production. Replace it with your delegated public IPv6 prefix, and generate your own RFC 4193 ULA /48 rather than reusing the illustrative `fd12:3456:789a::/48` value.

Local `named-checkzone`, `named-checkconf`, `unbound-checkconf`, and `coredns` binaries were not installed in this environment, so those snippets were validated against official documentation rather than executed. The local `dig -h` output was available and confirmed the documented `-b address[#port]` source-address option.
