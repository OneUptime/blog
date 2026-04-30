# Validation Summary: How to Use Flow Labels for ECMP Hashing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Flow Label
- ECMP routing
- Linux kernel networking sysctls
- `iproute2` / `ip -6 route`
- Python
- Cisco IOS XR CEF load balancing
- Juniper Junos load-balancing hash configuration

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 6437, IPv6 Flow Label Specification: https://www.rfc-editor.org/rfc/rfc6437
- RFC 6438, Using the IPv6 Flow Label for Equal Cost Multipath Routing and Link Aggregation in Tunnels: https://www.rfc-editor.org/rfc/rfc6438
- Cisco ASR 9000 IOS XR CEF documentation: https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/25xx/ip-addresses/configuration/guide/b-ip-addresses-cg-asr9000-25xx/Implementing-cisco-express-forwarding.html
- Cisco ASR 9000 IOS XR command reference for `cef load-balancing fields`: https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/ip-addresses/command/reference/b-ip-addresses-cr-asr9000/b-ipaddr-cr-asr9k_chapter_011.html
- Juniper `hash-key` forwarding-options reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/hash-key-edit-forwarding-options.html
- Juniper `enhanced-hash-key` forwarding-options reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/enhanced-hash-key-edit-forwarding-options.html

## Issues Found
- The Linux section used `net.ipv6.flowlabel_state_ranges` as if it controlled ECMP hashing. It does not; it manages flow-label allocation ranges. I replaced it with the documented IPv6 multipath hashing sysctls: `net.ipv6.fib_multipath_hash_policy` and `net.ipv6.fib_multipath_hash_fields`.
- The Linux route example used invalid IPv6 placeholder addresses such as `2001:db8:server::/48` and `2001:db8:transit1::1`. I replaced them with syntactically valid documentation-prefix addresses.
- The Linux verification command was tightened from `ip -6 route show <prefix>` to `ip -6 route show match <prefix>` to align with `ip route` selector syntax.
- The ECMP Python example claimed to fall back to a 5-tuple hash when `flow_label=0`, but the original code actually hashed only source and destination addresses. I updated the function signature and implementation so the fallback really uses ports and protocol.
- The ECMP Python example also used invalid IPv6 sample addresses (`client` and `server` labels embedded in the address). I replaced them with valid IPv6 documentation-prefix addresses.
- The Cisco IOS-XR section used commands that do not match the current documented IOS XR CEF flow-label configuration. I replaced them with the documented `cef load-balancing fields ipv6 flow-label` command and narrowed the wording to supported platforms.
- The Junos section used an invalid statement, `set forwarding-options hash-key family inet6 flow-label`. I corrected it to the documented `layer-3 ipv6-flow-label` hierarchy.
- The flow-label generation section described an “RFC 6437 recommended” rotating-secret algorithm, but RFC 6437 does not mandate that exact method. I corrected the wording to “RFC 6437-compatible” and kept the example as an implementation pattern rather than an RFC-mandated algorithm.
- The flow-label generation example labeled `flow_label % 3` as ECMP path selection, which overstates what the code is actually demonstrating. I reframed it as bucket distribution for generated labels.
- The introduction and conclusion were adjusted so they describe ECMP hashing as using source/destination plus flow label, which matches RFC 6438 guidance and avoids implying that routers should hash on the flow label alone.

## Review Notes
- Linux currently documents IPv6 `fib_multipath_hash_policy=0` as Layer 3 hashing that includes source address, destination address, and flow label. The post now uses the custom policy only to make the chosen fields explicit.
- Junos load-balancing configuration is platform-dependent. Juniper documents both `hash-key` and `enhanced-hash-key`, and some newer platforms include the IPv6 flow label in the enhanced hash by default.
- Cisco IOS XR flow-label hashing support is documented for specific supported platforms and line cards rather than as a universal behavior across every IOS XR device family.
