# Validation Summary: How to Understand Mobile IPv6 Binding Update Messages

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Mobile IPv6 (MIPv6) — RFC 6275
- Binding Update (BU) and Binding Acknowledgement (BA) messages
- Mobility Header (MH Type 5 and 6)
- Home Address Destination Option
- Alternate Care-of Address mobility option
- IPsec protection between Mobile Node and Home Agent
- UMIP (`mip6d`) Linux Mobile IPv6 implementation
- Python pseudocode illustrating BU sending and refresh logic

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://www.rfc-editor.org/rfc/rfc6275)
  - §6.1.7 Binding Update Message (flags A, H, L, K; lifetime in 4-second units)
  - §6.1.8 Binding Acknowledgement Message (Status Codes)
  - §11.7.1 Sending Binding Updates to the Home Agent (lifetime refresh guidance)
  - §5.2.6 Sequence Numbers (16-bit, wraps modulo 2^16)
- RFC 3776 — Using IPsec to Protect Mobile IPv6 Signaling between Mobile Nodes and Home Agents
- UMIP project documentation for `mip6d`

## Issues Found
1. **Incorrect Binding Acknowledgement Status Code label** — The post listed `133 = Not home subnet`, but per RFC 6275 §6.1.8, code `132` is "Not home subnet" and code `133` is "Not home agent for this mobile node". Updated the list to include both 132 and 133 with their correct meanings.
2. **Incorrect RFC section reference for refresh-at-half-lifetime guidance** — The Python comment cited "RFC 6275 §9.5.1", but that section is "Authentication of Binding Updates". The guidance about refreshing the binding before the granted lifetime expires is discussed in §11.7.1 ("Sending Binding Updates to the Home Agent"). Updated the citation accordingly.

## Review Notes
- The remaining flag descriptions (A, H, L, K), the MH Types (5 for BU, 6 for BA), the Lifetime encoding (4-second units), the Sequence Number 16-bit wrap behavior, the use of the Home Address Destination Option for MN→HA traffic, and the deregistration via Lifetime=0 all match RFC 6275.
- The `mip6d -n` invocation in the bash block is illustrative; the upstream UMIP `mip6d` daemon's CLI flags are limited (`-c`, `-d`, `-V`), so the example output is best understood as pseudocode for a "view bindings" operation rather than a real flag of the daemon. The comment header ("Example output") makes this acceptable, but readers using stock UMIP should consult its tools/IPC mechanisms directly.
- The Python code is explicitly framed as pseudocode (no real `BindingUpdate`/`IPv6Packet` library is being used), which is appropriate.
- The Mermaid flowchart accurately captures the high-level lifecycle: movement detection → CoA acquisition → BU to HA → optional Return Routability and BU to CN.
