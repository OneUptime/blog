# Validation Summary: How to Understand the Benchmarking Address Space (2001:2::/48)

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- IPv6 special-purpose addressing
- RFC 5180 and RFC 2544 benchmarking methodology
- `iperf3`
- Linux `ip` and `ip6tables`
- Python `ipaddress`

## Sources Consulted
- RFC 5180: IPv6 Benchmarking Methodology for Network Interconnect Devices: https://www.rfc-editor.org/rfc/rfc5180
- RFC 5180 verified errata 1752: https://www.rfc-editor.org/errata/eid1752
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 2544: Benchmarking Methodology for Network Interconnect Devices: https://www.rfc-editor.org/rfc/rfc2544.html
- Python Standard Library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- `iperf3` official documentation, Invoking iperf3: https://software.es.net/iperf/invoking.html
- `ip-address(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip6tables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip6tables.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The `iperf3` example assigned `/48` interface addresses. RFC 5180 says DUT interface prefix lengths must be `/126` or `<= /64`, so I changed the example to `/64`.
- The post implied that simple `iperf3` commands implement RFC 5180 / RFC 2544 benchmarking. I corrected the wording and methodology section to state that RFC 5180 reuses RFC 2544 procedures and that `iperf3` is only being shown for basic lab traffic tests.
- The methodology example used `iperf3 -l/--length` as if it set Ethernet frame sizes. In `iperf3`, `-l` sets the read/write buffer length, not the wire frame size, so I removed that incorrect example and replaced it with the RFC-recommended Ethernet frame-size list.
- The Python example called `list(BENCH_BLOCK.hosts())` on a `/48`, which would attempt to materialize an impractically large IPv6 host set. I rewrote it to generate pairs by indexing into the two `/49` halves of the benchmarking block.
- The conclusion referred to `2001:2::/48` as an “address family.” I corrected that to “prefix.”

## Review Notes
- RFC 5180's published text still contains a verified erratum for the benchmarking prefix in Section 8. The post already used the corrected value, `2001:2::/48`, which matches the IANA registry and the verified errata.
- The `ip6tables` examples are still valid, but many modern Linux systems use the nftables backend or prefer native `nft` syntax.
