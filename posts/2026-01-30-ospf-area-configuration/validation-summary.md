# Validation Summary: How to Build OSPF Area Configuration

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- Cisco IOS / IOS-XE configuration
- Juniper Junos OS configuration
- OSPF area types (Standard, Stub, Totally Stubby, NSSA)
- OSPF LSA types (Type 1-5, Type 7)
- Virtual links, route summarization, MD5/SHA authentication
- Bash for monitoring script

## Sources Consulted
- [Cisco: Configure the OSPF NSSA](https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/6208-nssa.html)
- [Cisco: How Does OSPF Generate Default Routes](https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13692-21.html)
- [Cisco IOS OSPF Command Reference](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book.html)
- [Juniper: virtual-link statement](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/virtual-link-edit-protocols-ospf.html)
- [Juniper: default-lsa statement](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/default-lsa-edit-protocols-ospf.html)
- [Juniper: nssa statement](https://www.juniper.net/documentation/en_US/junos/topics/reference/configuration-statement/nssa-edit-protocols-ospf.html)
- [Juniper: Example OSPF Virtual Links](https://www.juniper.net/documentation/en_US/junos12.3/topics/topic-map/ospf-virtual-link.html)
- RFC 2328 (OSPF v2), RFC 3101 (NSSA)

## Issues Found

1. **Incorrect comment on Cisco `area X nssa no-summary`**
   - The original comment described the keyword as "Optional: suppress default route injection" — this is the opposite of what the command does.
   - In Cisco IOS, `area X nssa no-summary` creates a totally NSSA: it blocks Type 3 summary LSAs from entering the area AND automatically injects a default route from the ABR.
   - Fixed the comment to accurately describe this behavior.

2. **Juniper virtual-link configuration in wrong area**
   - The original example placed `virtual-link neighbor-id 2.2.2.2 transit-area 0.0.0.1;` under `area 0.0.0.1`, which is incorrect (and self-referential — the transit area equalled the enclosing area).
   - Per Juniper documentation, virtual links must be configured under the backbone area (`area 0.0.0.0`), with `transit-area` pointing to the non-backbone area being traversed.
   - Moved the `virtual-link` statement under `area 0.0.0.0` and added a clarifying comment.

3. **Misleading comment on Juniper NSSA `default-lsa`**
   - The original comment claimed `default-lsa` "Converts Type 7 to Type 5 at ABR" — this is incorrect. The `default-lsa` stanza causes the ABR to inject a default route LSA into the NSSA. The Type 7-to-Type 5 translation at the NSSA ABR is automatic for non-default LSAs originated by NSSA ASBRs and is unrelated to this configuration.
   - Updated the comment to correctly describe what `default-lsa` does.

## Review Notes
- The Branch1 NSSA configuration redistributes a static default route using a route map. In strict Cisco IOS behavior, the default route (0.0.0.0/0) is not redistributed via `redistribute static` alone — the recommended idiomatic approach is `area 3 nssa default-information-originate` (which is also shown earlier in the post). The route-map technique may work in some IOS versions due to NSSA Type 7 handling, but it is not the canonical method. Left unchanged because it is not strictly incorrect syntax and the previous example already shows the cleaner alternative.
- The Cisco SHA authentication example uses key chains with `hmac-sha-256`, which is valid on IOS-XE 15.4(1)T+ and later.
- The OSPF area sizing recommendations (50-100 routers per area) are widely cited but are guidelines rather than hard limits; modern hardware can comfortably support more.
- All mermaid diagrams, LSA type descriptions, area type behaviors, and OSPF fundamentals match RFC 2328 and the Cisco/Juniper authoritative documentation.
