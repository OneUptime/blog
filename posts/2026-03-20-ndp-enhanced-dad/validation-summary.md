# Validation Summary: How to Use Enhanced DAD for IPv6

## Status
validated

## Post Type
Tutorial / Guide (operational how-to for IPv6 Enhanced DAD)

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Duplicate Address Detection (DAD)
- Enhanced DAD (RFC 7527)
- Nonce option (RFC 3971)
- Linux IPv6 sysctls (`dad_transmits`, `accept_dad`, `enhanced_dad`)
- `iproute2` (`ip`, `ip monitor`)
- `tcpdump` BPF filters
- Cisco IOS-XE IPv6 ND configuration
- Juniper Junos IPv6 neighbors CLI
- Python Scapy (`scapy.layers.inet6`, `ICMPv6ND_NS`, `ICMPv6NDOptNonce`)

## Sources Consulted
- RFC 7527 — Enhanced Duplicate Address Detection: https://datatracker.ietf.org/doc/html/rfc7527
- RFC 3971 §5.3.2 — Nonce option (length requirements): https://datatracker.ietf.org/doc/html/rfc3971#section-5.3.2
- Linux kernel `ip-sysctl.txt` (enhanced_dad): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux kernel commit `adc176c54799` "ipv6 addrconf: Implemented enhanced DAD (RFC7527)" — merged in 4.10
- Cisco IOS IPv6 Command Reference (`ipv6 nd dad attempts`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/
- Scapy API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html

## Issues Found

1. **Wrong sysctl named for Enhanced DAD control** — The post claimed "Enhanced DAD is controlled by the `ndisc_notify` setting." This is incorrect. `ndisc_notify` controls whether the kernel sends an unsolicited Neighbor Advertisement on link-up / MAC change; it has nothing to do with Enhanced DAD. The correct sysctl is `net.ipv6.conf.<iface>.enhanced_dad` (default: TRUE), per the kernel `ip-sysctl.txt` documentation. Fixed the comment and added a `sysctl net.ipv6.conf.eth0.enhanced_dad` example to the "Check current DAD settings" block, and updated the follow-up comment to "Enhanced DAD is enabled when dad_transmits >= 1 and enhanced_dad = 1."

2. **Cisco IOS-XE: incorrect command to disable DAD** — The post used `no ipv6 nd dad attempts` under a "Disable DAD" comment. The `no` form of this command reverts to the default value (1 attempt), which does not disable DAD. Per the Cisco IOS IPv6 Command Reference, the correct way to disable DAD is `ipv6 nd dad attempts 0`. Fixed.

## Review Notes

- **Linux kernel version**: The "4.10+" claim is correct. The `enhanced_dad` sysctl and the in-kernel nonce-bearing DAD implementation landed together in 4.10 (Erik Nordmark's patch, Feb 2017). There was no earlier upstream Enhanced DAD support, so older kernels will not emit nonces.
- **Nonce length**: `os.urandom(6)` matches what the Linux kernel emits and is RFC-interoperable. Strictly, RFC 3971 §5.3.2 requires the nonce option total length to be a multiple of 8 octets, so a 6-byte nonce yields a 10-byte option that should be padded for full alignment. In practice every implementation I'm aware of (kernel + Cisco + Junos) uses 6-byte nonces and this is what's seen on the wire, so the example is fine for testing/learning purposes.
- **tcpdump filter** `'icmp6 and (ip6[40] == 135)'` — works only when there are no IPv6 extension headers preceding ICMPv6. For most lab DAD traffic this is true. A more robust modern alternative would be `'icmp6 and icmp6[0] == 135'`, but the post's filter is acceptable.
- **Junos**: The "17.3+" claim for Enhanced DAD support could not be tied to a specific Juniper KB article; it's plausible since Junos has supported IPv6 NDP for far longer, but the exact Enhanced-DAD-with-nonce introduction version is not authoritatively documented in publicly indexed sources I could verify. Left as-is; the example commands themselves are syntactically valid Junos CLI.
- **Cisco IOS-XE default behavior**: "Enhanced DAD is on by default" is consistent with current IOS-XE behavior on supported platforms.
