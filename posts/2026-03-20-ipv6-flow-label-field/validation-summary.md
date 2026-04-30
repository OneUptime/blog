# Validation Summary: How to Use the IPv6 Flow Label Field

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 Flow Label
- RFC 6437
- RFC 8200
- Python `socket` programming
- Linux IPv6 networking sysctls
- ECMP
- `tcpdump` / libpcap filters

## Sources Consulted
- RFC 6437, *IPv6 Flow Label Specification*: https://datatracker.ietf.org/doc/html/rfc6437
- RFC 8200, *Internet Protocol, Version 6 (IPv6) Specification*: https://datatracker.ietf.org/doc/rfc8200/
- RFC 6438, *Using the IPv6 Flow Label for Equal Cost Multipath Routing and Link Aggregation in Tunnels*: https://datatracker.ietf.org/doc/html/rfc6438
- Python standard library docs, `socket`: https://docs.python.org/3/library/socket.html
- Linux kernel documentation, `ip-sysctl`: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `pcap-filter(7)` syntax reference: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html

## Issues Found
- The introduction said the Flow Label was defined in RFC 6437. I corrected this to reflect that RFC 8200 defines the IPv6 header field and RFC 6437 specifies its usage.
- The RFC 6437 requirements summary overstated several rules. I changed `MUST` to `SHOULD` for source consistency, replaced the incorrect `Flow Label != 0 implies consistent 5-tuple` claim with RFC-aligned wording about the 3-tuple classifier and typical 5-tuple stateless flow definition, and clarified the exception for forwarding nodes changing non-zero labels only for compelling operational security reasons.
- The Python flow-label generator claimed to use an HMAC-based approach but actually concatenated a secret and hashed with SHA-256. I updated the code to use `hmac.digest()` and adjusted the explanation so it accurately describes a secret-keyed hash.
- The Python socket section had a helper that did not set any Flow Label and returned the wrong type. I replaced it with a single example that uses Python's documented `AF_INET6` 4-tuple `(host, port, flowinfo, scope_id)` and masks the low 20 bits for the Flow Label.
- The Linux ECMP configuration example used `net.ipv6.flowlabel_state_ranges`, which does not control ECMP hashing. I replaced it with the relevant current Linux settings: `fib_multipath_hash_policy`, `fib_multipath_hash_fields`, and `auto_flowlabels`.
- The `tcpdump` capture filter used `ip6[1:3]`, which is invalid in libpcap because packet accessor sizes must be 1, 2, or 4 bytes. I replaced it with a valid equivalent filter that checks the Flow Label bits using `ip6[1]` and `ip6[2:2]`.
- I also tightened the `tcpdump` grep example and example output so they match how `flowlabel` is typically displayed.

## Review Notes
- The Python example is accurate at the API level because Python documents the IPv6 address tuple as `(host, port, flowinfo, scope_id)`. Practical handling of non-zero flow labels is still platform-dependent, so behavior should be verified on the target OS and kernel.
- On current Linux kernels, IPv6 ECMP already includes the Flow Label in the default Layer 3 multipath hash policy. The custom hash example is useful when operators want explicit field control rather than the default behavior.
