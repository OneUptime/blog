# Validation Summary: How to Understand RIPng for IPv6 Routing

## Status
validated

## Post Type
Technical guide / networking protocol reference

## Technologies Covered
- RIPng
- IPv6 routing
- RIPv2
- UDP
- IPsec

## Sources Consulted
- RFC 2080: RIPng for IPv6 - https://datatracker.ietf.org/doc/html/rfc2080
- RFC 2453: RIP Version 2 - https://datatracker.ietf.org/doc/html/rfc2453
- RFC 2082: RIP-2 MD5 Authentication - https://www.rfc-editor.org/rfc/rfc2082

## Issues Found
- The RIPng timer table called the 120-second timer a hold-down timer. RFC 2080 describes this as the garbage-collection timer, so the table was corrected.
- The RIPv2/RIPng comparison listed RIPng as having 25 routes per message. RFC 2080 defines RIPng RTE capacity as MTU-dependent, so the RIPng value was corrected to "MTU-dependent."
- The operation diagram said RIPng broadcasts the full table every 30 seconds. RFC 2080 sends regular updates as multicast Response messages to FF02::9, so the wording was corrected to "Multicasts."
- The post said routes not updated for 180 seconds are removed from the routing table. RFC 2080 marks such routes expired/unreachable first and removes them after the 120-second garbage-collection timer expires, so the sentence was corrected.
- The RIPng message structure block was labeled as YAML even though it is an ASCII protocol diagram. The fence was changed to `text`.

## Review Notes
The remaining RIPng claims are consistent with RFC 2080 at a guide level. One caveat for future refinement: RFC 2080 models the metric as a route cost from 1 to 15, with hop count being the usual result when each network cost is 1.
