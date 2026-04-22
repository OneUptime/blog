# Validation Summary: How to Understand Segment Routing over IPv6 (SRv6)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Segment Routing over IPv6 (SRv6)
- IPv6 Segment Routing Header (SRH)
- SRv6 Segment Identifiers (SIDs)
- SRv6 endpoint behaviors
- MPLS and MPLS VPN labels
- SRv6 compressed SID encoding

## Sources Consulted
- RFC 8754, "IPv6 Segment Routing Header (SRH)": https://datatracker.ietf.org/doc/html/rfc8754
- RFC 8986, "Segment Routing over IPv6 (SRv6) Network Programming": https://datatracker.ietf.org/doc/html/rfc8986
- RFC 8402, "Segment Routing Architecture": https://datatracker.ietf.org/doc/rfc8402/
- RFC 9252, "BGP Overlay Services Based on Segment Routing over IPv6 (SRv6)": https://datatracker.ietf.org/doc/rfc9252/
- RFC 9800, "Compressed SRv6 Segment List Encoding": https://www.ietf.org/rfc/rfc9800

## Issues Found
- The SID example used `2001:db8:1:1::/48` as a locator for `2001:db8:1:1:e000::`. A `/48` would not include the fourth hextet as part of the locator, so the example was corrected to `/64`.
- The SID function example implied `e000` universally means `End.DT4`. RFC 8986 defines the function bits as opaque values mapped to local behaviors, so the wording now says it is an example function value mapped to `End.DT4`.
- The SID-format snippet was marked as `javascript` even though it is explanatory text, so it was changed to a `text` block.
- The SRH field name `Segment Left` was incorrect; RFC 8754 names the field `Segments Left`.
- The SRH Segment List ordering was unclear and risked implying that Segment List index 0 is processed first. The example now follows RFC 8754 ordering: index 0 is the final segment, and the highest index is the first segment.
- The packet-processing sequence diagram used an SRH list order inconsistent with RFC 8754 processing. It now shows the encoded SRH list in reverse policy order and keeps the Segment List unchanged while `Segments Left` and the IPv6 destination address advance.
- The MPLS/SRv6 comparison said SRv6 needs "no extra protocols" and that SIDs are globally routable. This was narrowed because SRv6 still relies on routing/control-plane signaling or configuration, and SIDs are routable when covered by advertised locator prefixes inside the SR domain.
- The endpoint behavior descriptions for `End.DX4`, `End.DX6`, `End.DT4`, and `End.DT6` were too loose. They now distinguish cross-connect behaviors from table-lookup behaviors.
- The "no hardware upgrade" claim was too absolute. It now says supported behaviors can be selected through SID functions and arguments.
- The observability statement said SIDs are visible to traceroute. It now more accurately says active SIDs and SRH contents are IPv6 header data inspectable by OAM tools inside the SR domain.
- The conclusion described SRv6 as an MPLS replacement without qualification. It now says SRv6 is an MPLS alternative or replacement.

## Review Notes
The post is a conceptual guide rather than a configuration tutorial. It does not include runnable code or CLI commands, so validation focused on protocol terminology, packet-processing examples, and architectural claims.
