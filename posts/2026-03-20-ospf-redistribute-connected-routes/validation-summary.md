# Validation Summary: How to Redistribute Connected Routes into OSPF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- FRR (Free Range Routing) and its `vtysh` CLI
- Cisco IOS / IOS XE
- Route redistribution
- OSPF Type 5 (AS-External) LSAs
- OSPF External metric types (E1 / E2)
- IP prefix-lists and route-maps

## Sources Consulted
- FRR OSPFd Reference: https://docs.frrouting.org/en/latest/ospfd.html
- FRR Filtering (access-list / prefix-list): https://docs.frrouting.org/en/latest/filter.html
- FRR Route Maps: https://docs.frrouting.org/en/latest/routemap.html
- Cisco — Redistribute Connected Networks into OSPF with Subnet Keyword: https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/113339-ospf-connected-net.html
- Cisco — OSPF Type-5 Route Calculation: https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/118799-configure-ospf-00.html
- Cisco IOS OSPF Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-s1.html
- RFC 2328 (OSPF Version 2), §16.4 — External path calculations

## Issues Found

**Issue 1: Misuse of `show ip ospf border-routers` to verify local ASBR status.**

The original "Verifying Redistribution" section had:
```
# On the redistributing router, confirm OSPF sees it
vtysh -c "show ip ospf border-routers"
```

`show ip ospf border-routers` lists ABRs/ASBRs learned via Type-3 (Summary) and Type-4 (Summary ASBR) LSAs. A router never originates a Type-4 LSA about itself, so running this command on the redistributing router does **not** confirm the local router's ASBR status — it only shows other border routers it has learned about.

**Fix:** Replaced with `show ip ospf | grep -i "autonomous system boundary"` to confirm local ASBR status on the redistributing router, and added a separate command annotated for use on a remote router to verify the redistributing router is being seen externally as an ASBR.

## Review Notes

- All FRR syntax verified against the official FRR docs:
  - `ospf router-id A.B.C.D` (inside `router ospf`) — correct.
  - `redistribute connected [route-map NAME] [metric M] [metric-type 1|2]` — correct.
  - `ip prefix-list NAME seq N permit|deny any` — `any` shorthand is documented and accepted.
  - `route-map NAME permit 10` + `match ip address prefix-list NAME` — correct.
- Cisco IOS `redistribute connected subnets` is still required on classic IOS (12.x / 15.x) for non-classful prefixes. In modern IOS XE, `subnets` is applied by default and is hidden from running-config. The post's wording ("subnets is required to include non-classful routes") remains accurate for IOS / IOS-XE-classic-mode and is still considered best-practice phrasing for portability — left unchanged.
- Default external metric (20) and default metric-type (E2) for redistributed routes are correct.
- E1 vs E2 cost behavior is correctly described (E1 cost accumulates with internal path cost to ASBR; E2 cost stays constant; default is E2). Matches RFC 2328 §16.4.
- Type 5 (AS-External) LSA description is correct. Note (not added to post): in NSSA areas these become Type 7 LSAs and are translated to Type 5 by the NSSA ABR — out of scope for this post.
