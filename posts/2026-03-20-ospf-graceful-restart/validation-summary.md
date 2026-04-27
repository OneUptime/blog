# Validation Summary: How to Configure OSPF Graceful Restart

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OSPFv2 Graceful Restart (RFC 3623)
- Cisco IOS / NX-OS-style OSPF configuration
- FRRouting (FRR) ospfd
- Grace-LSA (Type-9 Opaque LSA)
- Non-Stop Forwarding (NSF)

## Sources Consulted
- [RFC 3623 - Graceful OSPF Restart](https://datatracker.ietf.org/doc/html/rfc3623)
- [FRRouting OSPFd documentation](https://docs.frrouting.org/en/latest/ospfd.html)
- Cisco IOS / NX-OS OSPF NSF / Graceful Restart configuration references

## Issues Found
1. **Incorrect claim about grace-period vs Dead interval.** The original text said: "Maximum grace-period should not exceed the Dead interval to avoid confusion." This is backwards — RFC 3623 explicitly states the grace-period should not exceed LSRefreshTime (1800 seconds), not the Dead interval. The entire purpose of Graceful Restart is for the helper to maintain the adjacency *despite* missed Hellos, so the grace-period typically exceeds the Dead interval. Rewrote the bullet to reflect the actual RFC 3623 guidance and the correct relationship between grace-period and Dead interval.

2. **Invalid FRR command.** The post included `graceful-restart helper lsa-check-disable` as a way to disable strict LSA checking in FRR. This is not a valid FRR command. In FRR, strict-LSA-checking is opt-in (default off), enabled with `graceful-restart helper strict-lsa-checking`. Replaced the example with the correct opt-in command and clarified the comment to describe enabling stricter helper behavior rather than disabling something that isn't on by default.

## Review Notes
- The Cisco IOS step uses `graceful-restart` / `graceful-restart grace-period` / `graceful-restart helper strict-lsa-checking` syntax. This is the syntax used on Cisco NX-OS (and on some IOS XR / IOS XE platforms). On classic Cisco IOS, the equivalent is the `nsf ietf` family of commands (`nsf ietf`, `nsf ietf restart-interval`, `nsf ietf helper [disable | strict-lsa-checking]`). The post's commands are valid on at least one Cisco platform, so this was left as-is, but readers on classic IOS should map the syntax to `nsf ietf` equivalents.
- The default grace-period of 120 seconds matches RFC 3623's suggested default and Cisco IOS classic NSF IETF default; some platforms (e.g., NX-OS) default to 60 seconds. Worth being aware of platform-specific defaults.
- The claim that the Grace-LSA is a Type-9 (link-local scope) Opaque LSA is correct per RFC 3623.
- All `show` command examples (`show ip ospf | include graceful`, `show ip ospf neighbor detail`, `show ip ospf database | include Grace`) are valid Cisco IOS forms.
