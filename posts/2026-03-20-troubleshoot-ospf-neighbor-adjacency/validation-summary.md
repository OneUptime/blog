# Validation Summary: How to Troubleshoot OSPF Neighbor Adjacency Failures

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- Cisco IOS CLI commands
- OSPF neighbor adjacency state machine (Down, Init, 2-Way, ExStart, Exchange, Loading, Full)
- OSPF authentication (plain text and cryptographic/MD5)
- OSPF network types (BROADCAST, POINT-TO-POINT, POINT-TO-MULTIPOINT, NON-BROADCAST)
- MTU and subnet mask validation

## Sources Consulted
- RFC 2328 (OSPF Version 2) — https://www.rfc-editor.org/rfc/rfc2328
- Cisco OSPF Command Reference — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book.html
- Cisco Troubleshooting OSPF — https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13699-23.html
- Cisco "Why Are OSPF Neighbors Stuck in Exstart/Exchange State?" — https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13684-12.html
- Cisco IOS Configuration Fundamentals: Output Modifier (include/exclude) behavior is case-sensitive regex

## Issues Found

1. **Step 3 (line 63):** The pipe filter `| include area` would not match the actual output line "Internet Address ..., Area 0, Attached via Interface Enable" because Cisco IOS output filters use case-sensitive regex. Changed to `| include Area` so the filter actually matches the relevant output.

2. **Step 6 (line 110):** The command `show ip interface brief | include Gig0/0` would not match output lines because modern Cisco IOS renders the full interface name "GigabitEthernet0/0" and "Gig0/0" is not a substring of that. Changed to `| include GigabitEthernet0/0` so the filter works as intended.

3. **Step 7 (line 123):** The pipe filter `| include network type` would not match the actual output line "Network Type BROADCAST, Cost: 1" due to case sensitivity. Changed to `| include Network Type` so it correctly surfaces the network type line.

## Review Notes

- The OSPF state machine progression (Down → Init → 2-Way → ExStart → Exchange → Loading → Full) aligns with RFC 2328 section 10.1.
- The characterization of EXSTART being stuck due to MTU mismatch is a well-documented Cisco behavior.
- The `ip ospf mtu-ignore` command is correctly flagged as a workaround — best practice remains matching MTUs on both ends.
- `debug ip ospf hello`, `debug ip ospf adj`, and `no debug all` are all valid IOS commands.
- The default Hello/Dead timer values (10/40 seconds) shown are correct for BROADCAST and POINT-TO-POINT network types; NBMA and POINT-TO-MULTIPOINT default to 30/120 seconds, which is not mentioned but not incorrect either since the post focuses on the common case.
- The `stateDiagram-v2` mermaid state name "2-Way" renders correctly in current mermaid versions; no change needed.
- In `show ip ospf neighbor` output, the column "2WAY/DROTHER" is a valid state/role combination for non-DR/BDR routers on a multi-access segment, which matches the text.
