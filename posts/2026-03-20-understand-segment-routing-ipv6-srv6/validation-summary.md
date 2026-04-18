# Validation Summary: How to Understand Segment Routing over IPv6 (SRv6) - Understand

## Status
validated

## Post Type
Reference / Conceptual guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- IPv6 Segment Routing Header (SRH)
- SRv6 Network Programming (RFC 8986)
- SRv6 SID allocation (RFC 9602, 5F00::/16)
- MPLS (comparison)
- L3VPN, Service Chaining, 5G Network Slicing (use cases)

## Sources Consulted
- RFC 8986 — "Segment Routing over IPv6 (SRv6) Network Programming" (https://www.rfc-editor.org/rfc/rfc8986)
- RFC 9602 — "Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture" (https://www.rfc-editor.org/rfc/rfc9602)
- RFC 8754 — "IPv6 Segment Routing Header (SRH)" (https://www.rfc-editor.org/rfc/rfc8754)
- IANA IPv6 Special-Purpose Address Registry (5F00::/16 allocation)
- IANA IPv6 Routing Types registry (Routing Type 4 = SRH)

## Issues Found
1. **End.B6 table row was technically inaccurate.** RFC 8986 does not define a bare "End.B6" function — the formal name is `End.B6.Encaps` (and `End.B6.Encaps.Red`). The description "Insert SRH and forward" was also wrong: End.B6.Encaps performs H.Encaps (push a new outer IPv6 header with its own SRH containing the bound SR Policy's segment list); it does not do SRH insertion. "End.B6" with insertion semantics existed in early drafts but was removed before publication of RFC 8986.
   - **Fix:** Updated the table entry to `End.B6.Encaps` with description "Endpoint bound to an SRv6 policy with encapsulation (push new outer IPv6 header + SRH)".

## Review Notes
- All other RFC 8986 endpoint function names in the table (End, End.X, End.T, End.DX6, End.DT6, End.DT4, End.DT46) are correctly named.
- The SRH field layout (Next Header / Hdr Ext Len / Routing Type / Segments Left / Last Entry / Flags / Tag, followed by 128-bit Segment List entries) matches RFC 8754 exactly.
- The Segment List ordering convention is correct: Segment List[0] is the last segment (ultimate destination), encoded in reverse order of traversal.
- The forwarding walkthrough (R1 → R2 → R3 with Segments Left decrement and IPv6 destination update) is consistent with RFC 8754/8986 processing rules.
- The 5F00::/16 allocation per RFC 9602 is correct. RFC 9602 is Informational (published October 2024) and documents the IANA allocation made in April 2024.
- Completeness note (not an error): RFC 8986 also defines End.DX4, End.DX2, End.DX2V, End.DT2U, End.DT2M, End.B6.Encaps.Red, and End.BM, which the post does not list. This is an omission by design for an introductory reference, not a technical inaccuracy.
- Minor stylistic note (not changed): the SID diagram is fenced as ```javascript but contains ASCII art — this affects rendering only, not correctness.
- The VRF table ID "254" in the forwarding example is a Linux convention (254 is the `main` table) used as illustrative; not a protocol requirement.
