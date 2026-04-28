# Validation Summary: How to Understand Network Mobility (NEMO) Basic Support

## Status
validated

## Post Type
Conceptual guide / Tutorial

## Technologies Covered
- NEMO Basic Support (RFC 3963)
- Mobile IPv6 (RFC 6275, formerly RFC 3775)
- Mobile Router (MR) and Home Agent (HA) roles
- Mobile Network Prefix (MNP)
- UMIP (mip6d) configuration
- IPv6 routing / tunneling
- Nested mobility (RFC 4888)

## Sources Consulted
- RFC 3963 - Network Mobility (NEMO) Basic Support Protocol (https://www.rfc-editor.org/rfc/rfc3963)
- RFC 6275 - Mobility Support in IPv6 (https://www.rfc-editor.org/rfc/rfc6275)
- RFC 4888 - Network Mobility Route Optimization Problem Statement (https://www.rfc-editor.org/rfc/rfc4888)
- UMIP project documentation (https://www.umip.org/)
- iputils ping6 / traceroute6 manual pages

## Issues Found
No technical issues found. All conceptual claims align with RFC 3963:
- R flag (Mobile Router flag) added to the Binding Update header is correct (RFC 3963 §4.1).
- The Mobile Network Prefix option in BU is correctly described (RFC 3963 §4.2).
- Bidirectional tunneling between MR and HA is the defining mechanism of "Basic Support" (RFC 3963 §4.4).
- The NEMO vs MIPv6 comparison is accurate.
- Nested NEMO is correctly described as supported.

## Review Notes
- The IPv6 example addresses use illustrative placeholders such as `2001:db8:home::/48`, `2001:db8:home::MR`, `::laptop`, `::phone`. Strictly, "home", "MR", "laptop", "phone" are not valid hexadecimal segments, but the author uses them clearly as readability placeholders. Real deployments must use valid hex (e.g., `2001:db8::/48`). Left unchanged since the intent is pedagogical and consistent throughout the post.
- The UMIP `mip6d.conf` examples are simplified pseudo-config. Actual UMIP/NEMO-patch directive names and block structure vary across forks and versions (e.g., NEMO support is added by the `umip-nemo` patch and uses directives like `MnRouter`, `NEMO { MobileNetworkPrefix ... }`). The post's syntax is illustrative rather than directly copy-pasteable. A future revision could note this caveat.
- `ping6` is now deprecated in favor of `ping -6` in modern iputils, but `ping6` still works and is widely used in documentation. No change required.
- The mermaid diagram references `MR` as a target node before declaring it with a label; this is valid mermaid syntax (the node is implicitly created and later labeled).
