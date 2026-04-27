# Validation Summary: How to Prevent OSPF from Advertising Specific Interfaces with Passive Interface

## Status
validated

## Post Type
Tutorial / Configuration guide (Cisco IOS OSPF)

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- Cisco IOS / IOS XE configuration
- `passive-interface` and `passive-interface default` commands
- OSPF Hello packet behavior
- OSPF show commands (`show ip ospf interface brief`, `show ip ospf interface <intf>`, `show ip route`)

## Sources Consulted
- [Cisco: What Does the show ip ospf interface Command Reveal](https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13689-17.html)
- [Cisco IOS XE 17.x - Default Passive Interfaces configuration guide](https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iri-default-passive-interface.html)
- [Cisco Community: Understanding `passive-interface default` in OSPF](https://community.cisco.com/t5/networking-knowledge-base/understanding-passive-interface-default-command-in-ospf/ta-p/3120648)
- Cisco Learning Network discussion: passive interface and loopback behavior
- Cisco Press: Implementing OSPF for IPv4 — example output for `show ip ospf interface brief`
- Cisco IOS `show ip route` command reference (output formatting for prefix vs. table queries)
- RFC 2328 (OSPF v2) for general OSPF Hello / DR election semantics

## Issues Found
1. **Incorrect State annotation in `show ip ospf interface brief` example.** The post showed the State of a passive multi-access interface as `WAIT` and annotated it `WAIT = passive`. This is misleading: WAIT is a transient OSPF interface state used during DR election, not a stable indicator of passive. After the wait timer expires on a multi-access segment with no other OSPF speakers, the router elects itself DR. The example was changed to show `State: DR` with `Nbrs F/C: 0/0`, and the annotation was updated to point at the `0/0` neighbors as the hint that the interface is passive.

2. **Incorrect command/output combination for verifying remote learning.** The post used `show ip route 192.168.1.0/24` and showed a single-line table-format output (`O 192.168.1.0/24 [110/2] via 10.0.0.1`). When you query a specific prefix with `show ip route <prefix>`, Cisco IOS produces a multi-line `Routing entry for ...` block, not the single-line table format. The single-line format only appears in the table view (`show ip route` or `show ip route ospf`). The command was changed to `show ip route ospf | include 192.168.1`, which legitimately produces the single-line output shown.

## Review Notes
- The detailed `show ip ospf interface GigabitEthernet1/0` excerpt with `No Hellos (Passive interface)` is correct verbatim Cisco IOS output.
- `passive-interface default`, `no passive-interface <interface>`, and the wildcard `network 0.0.0.0 255.255.255.255 area 0` are all valid Cisco IOS OSPF syntax.
- Setting `passive-interface Loopback0` is technically a no-op — Cisco OSPF never sends Hellos out loopbacks regardless. The post calls this "good practice", which is reasonable for documentation/consistency, but readers should know it has no functional effect.
- "OSPF does not send or receive Hello packets" is a slight simplification: hellos arriving on a passive interface are physically received by the interface but ignored by the OSPF process. This is the standard simplification used in Cisco docs and is acceptable.
- The post does not specify an IOS version. The behavior described matches modern Cisco IOS / IOS XE; very old IOS images may differ in show-output formatting.
- Pairing passive-interface with OSPF authentication (mentioned in the conclusion) is sound defense-in-depth advice and aligns with Cisco security guidance.
