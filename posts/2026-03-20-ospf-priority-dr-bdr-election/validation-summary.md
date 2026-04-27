# Validation Summary: How to Configure OSPF Priority to Control DR/BDR Election

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- Cisco IOS configuration
- DR (Designated Router) / BDR (Backup Designated Router) election
- Multi-access (broadcast) network OSPF behavior

## Sources Consulted
- RFC 2328 - OSPF Version 2 (https://datatracker.ietf.org/doc/html/rfc2328) - Sections 7.3 (adjacencies), 9.4 (Router Priority), and 13.4 (DR/BDR election)
- Cisco IOS IP Routing: OSPF Command Reference - `ip ospf priority` command (range 0-255, default 1)
- Cisco IOS Command Reference - `show ip ospf interface`, `show ip ospf neighbor`, `clear ip ospf process`
- Cisco OSPF Design Guide - DR/BDR election behavior on broadcast networks

## Issues Found
- **Step 2 prose/example mismatch**: The introductory line read "Set the priority to 100 on the router you want to be DR, and 50 on the BDR" while the code example used priorities of 200 (DR) and 100 (BDR). Updated the prose to "Set the priority to 200 on the router you want to be DR, and 100 on the BDR" to match the example.

## Review Notes
- All technical claims verified against RFC 2328 and Cisco documentation:
  - The N*(N-1)/2 adjacency-count formula and the role of DR/BDR in reducing it are correct.
  - DR generates Network LSAs (Type 2) for the segment - correct.
  - Default OSPF priority is 1; priority 0 disables DR/BDR eligibility - correct.
  - Tie-breaker is highest Router ID when priorities are equal - correct.
  - Non-preemptive election behavior is accurate; `clear ip ospf process` and interface bounce are valid ways to trigger re-election.
  - A priority-0 router still forms full adjacency with DR and BDR - correct per RFC 2328 Section 7.3.
- The `^^^^^^^^^^...` annotation line under the `show ip ospf interface` output is not literal Cisco output but is used here as a tutorial highlight; this is acceptable in a how-to context.
- The valid range for `ip ospf priority` is 0-255; all values shown (1, 100, 200) are within range.
