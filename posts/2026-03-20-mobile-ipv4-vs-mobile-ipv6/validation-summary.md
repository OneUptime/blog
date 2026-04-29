# Validation Summary: How to Understand the Differences Between Mobile IPv4 and Mobile IPv6

## Status
validated

## Post Type
Comparison / Reference guide

## Technologies Covered
- Mobile IPv4 (MIPv4, RFC 5944)
- Mobile IPv6 (MIPv6, RFC 6275)
- IPsec for MIPv6 signaling (RFC 3776 / RFC 4877)
- IPv6 SLAAC for Care-of Address assignment
- Return Routability procedure (HoTI/CoTI/HoT/CoT, Kbm)
- Type 2 Routing Header
- IP-in-IP tunneling
- NAT traversal for MIPv4 (RFC 3519)
- Linux `ip -6 addr show`

## Sources Consulted
- RFC 5944 — IP Mobility Support for IPv4, Revised: https://datatracker.ietf.org/doc/html/rfc5944
- RFC 6275 — Mobility Support in IPv6: https://datatracker.ietf.org/doc/html/rfc6275
- RFC 3776 — Using IPsec to Protect Mobile IPv6 Signaling: https://datatracker.ietf.org/doc/html/rfc3776
- RFC 4877 — Mobile IPv6 Operation with IKEv2 and the Revised IPsec Architecture: https://datatracker.ietf.org/doc/html/rfc4877
- RFC 4651 — A Taxonomy and Analysis of Enhancements to Mobile IPv6 Route Optimization: https://datatracker.ietf.org/doc/html/rfc4651
- RFC 3519 — Mobile IPv4 Traversal of NAT Devices: https://datatracker.ietf.org/doc/html/rfc3519

## Issues Found

1. **Incorrect RFC reference for MIPv4 Route Optimization.** The architecture comparison table cited "Optional (RFC 4651)" for MIPv4 Route Optimization. RFC 4651 is an Informational document covering enhancements to **Mobile IPv6** Route Optimization, not MIPv4. MIPv4 Route Optimization was specified only in expired Internet Drafts (e.g., draft-ietf-mobileip-optim) and was never standardized. Updated the table cell to "Not standardized (expired drafts)" for MIPv4 and added the correct attribution of RFC 4651 to MIPv6.

2. **Triangle routing diagram contradicted itself.** The original diagram showed both directions of traffic transiting the HA ("MN → HA → CN" and "MN ← HA ← CN") and labelled this "always triangular" with "all packets transit HA." Per RFC 5944 §1.7, triangle routing in MIPv4 means the **CN-to-MN** direction passes through the HA (intercept + tunnel) while **MN-to-CN** traffic is delivered directly via standard IP routing — that asymmetric path is what forms the triangle. Both directions transiting the HA describes reverse tunneling (RFC 3024), not triangle routing. Rewrote the diagram to accurately depict the asymmetric paths and noted reverse tunneling as the alternative.

3. **MIPv4 security description used MIPv6 terminology and the wrong default mechanism.** The post stated "BU authenticated via IPsec AH/ESP (optional in practice)." MIPv4 does not use Binding Updates — it uses Registration Requests/Replies. Per RFC 5944 §3.2, registration messages between MN and HA MUST be authenticated with the Mobile-Home Authentication Extension (HMAC-MD5 by default per §3.5.1), not IPsec. IPsec for MIPv4 is described in RFC 4877 but is not the standard mechanism. Updated the bullet list to use correct MIPv4 terminology, name the Mobile-Home Authentication Extension as the mandatory mechanism, list MN-FA/FA-HA extensions, correct the replay-protection description (Identification field — timestamp or nonce), and note IPsec as optional.

## Review Notes
- The Kbm formula `SHA1(HoT_token | CoT_token)` is correct per RFC 6275 §5.2.5 for binding establishment. Note that for binding deregistration (no care-of address present), Kbm is computed as `SHA1(home keygen token)` only. The post covers only the establishment case, which is acceptable for an introductory comparison.
- The MIPv4 Identification field can carry either a timestamp or a nonce per RFC 5944 §5.6; both are valid replay-protection styles. The fix above broadens the original "nonces" wording to capture both.
- RFC 3776 is correctly cited and is still referenced by RFC 6275; RFC 4877 updates (but does not obsolete) it for IKEv2 deployments.
- The `ip -6 addr show` example is plausible but Linux MIPv6 has been effectively unmaintained for many years (the in-tree umip/MIPL stack is largely abandoned). Readers should be aware that production MIPv6 today is mostly seen in mobility-aware mobile cores (PMIPv6 / 3GPP) rather than vanilla host-based MIPv6 on Linux.
- The conclusion's mention of MIPv4 in "3G/4G evolved packet core" is somewhat loose — the EPC primarily uses GTP and PMIPv6 (RFC 5213) for mobility rather than host-based MIPv4. This is a reasonable simplification for a comparison post and was left as-is.
