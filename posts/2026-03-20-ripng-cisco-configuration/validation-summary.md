# Validation Summary: How to Configure RIPng on Cisco Routers

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Cisco IOS / IOS XE
- RIPng / IPv6 RIP
- IPv6 unicast routing
- Cisco router interface configuration
- Route redistribution

## Sources Consulted
- Cisco IOS IPv6 Command Reference: `ipv6 rip default-information`, `ipv6 rip enable`, and `ipv6 router rip` - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco IOS IPv6 Command Reference: `timers (IPv6 RIP)` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s6.html
- Cisco IOS IPv6 Command Reference: `split-horizon (IPv6 RIP)` - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_17.pdf
- Cisco IOS IPv6 Command Reference: `show ipv6 rip` - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_16.html
- Cisco IOS XE IPv6 RIP configuration guide: RIPng configuration and verification examples - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_rip/configuration/xe-3s/asr1000/ip6-rip-xe.html
- Cisco IOS IPv6 route redistribution guide - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_rip/configuration/15-mt/irr-15-mt-book/ip6-rip-route-redist.html
- RFC 2080: RIPng for IPv6 - https://datatracker.ietf.org/doc/html/rfc2080
- GitHub author profile link - https://github.com/nawazdhandala

## Issues Found
- The default-route example used the IPv4-style router configuration command `default-information originate` and included an invalid `always` keyword. Cisco IOS RIPng default-route origination is configured per interface with `ipv6 rip <name> default-information {only | originate} [metric <value>]`, and it advertises the default route from that interface. Updated the snippet to use interface configuration mode and replaced the invalid `always` example with the valid `only` option.
- The timer example used keyword-style syntax (`timers update 30 holddown 120 invalid 180 flush 240`). Cisco IOS IPv6 RIP uses positional timer values: `timers <update> <timeout> <holddown> <garbage-collection>`. Updated the command to `timers 30 180 120 240` and corrected the terminology.
- The split horizon example used an invalid per-interface command (`no ipv6 rip <name> split-horizon`). Cisco IOS IPv6 RIP split horizon is configured in RIP router configuration mode with `split-horizon` / `no split-horizon`. Updated the example accordingly.
- The sample `show ipv6 rip` output combined timer fields in a way that did not match Cisco IOS output. Updated it to show the timeout and holddown/garbage-collection lines separately.

## Review Notes
The core RIPng activation model, `ipv6 unicast-routing`, per-interface `ipv6 rip <name> enable`, passive-interface configuration, verification commands, administrative distance, UDP port 521 / FF02::9 multicast group, route redistribution examples, and 15-hop practical limit are consistent with Cisco documentation and RFC 2080. Some defaults such as maximum paths can vary by platform and IOS/IOS XE release, but the examples remain technically plausible.
