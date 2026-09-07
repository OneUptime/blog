# Validation Summary: How to Audit Colocation Physical Access and Tenant Isolation

## Status
validated

## Post Type
Technical audit guide. Although there are no executable examples, the post contains technical implementation details about physical access controls, network management isolation, cross-connect verification, and audit-log correlation, so it received a technical review.

## Technologies Covered
- Colocation physical security, cages, cabinets, badges, biometrics, and visitor access
- Cross-connects, demarcation panels, fiber cabling, and letters of authorization
- Baseboard management controllers (BMCs), management VLANs, console access, and PDU management
- Access logs, surveillance evidence, clock synchronization, and record retention
- Media transport, sanitization, equipment custody, and remote-hands services
- NIST SP 800-53 Rev. 5 and SP 800-171 Rev. 3
- Equinix Smart Hands and shipment procedures

## Sources Consulted
- NIST SP 800-53 Rev. 5 publication page: https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0
- NIST SP 800-53 Rev. 5 control catalog: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf — physical authorization and enforcement, lockable casings, transmission protection, monitoring, visitor records, delivery/removal, media protection, and audit evidence.
- NIST SP 800-171 Rev. 3: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171r3/NIST.SP.800-171r3.html — CUI applicability and physical protection requirements.
- Equinix Smart Hands reports: https://docs.equinix.com/smart-hands/sh-reports/ — available operational and security reporting.
- Equinix inbound shipments: https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/ — orders, tracking details, loading-dock handling, collection, and designated unpacking areas.
- Equinix demarcations: https://docs.equinix.com/cross-connect/installation/xc-demarcations/ — provider demarcation and customer patching responsibilities.
- Equinix digital letters of authorization: https://docs.equinix.com/cross-connect/digital-loa/xc-loa-create/ — authorization of connections between parties.
- NSA/CISA, Harden Baseboard Management Controllers: https://media.defense.gov/2023/Jun/14/2003241405/-1/-1/0/CSI_HARDEN_BMCS.PDF — privileged BMC capabilities and network isolation.
- CISA, Enhanced Visibility and Hardening Guidance for Communications Infrastructure: https://www.cisa.gov/resources-tools/resources/enhanced-visibility-and-hardening-guidance-communications-infrastructure — management network separation and access restrictions.

## Issues Found
- The delivery walkthrough placed cage delivery before unpacking, which could imply bringing packaging into the colocation space. Equinix explicitly directs customers to unpack in a designated area and prohibits boxes, paper, and cardboard in colocation space. Changed the sequence to unpacking in the designated area before cage delivery. No other technical issues found.

## Review Notes
- Confirmed physical control references: PE-2, PE-3 (including PE-3(4)), PE-4, PE-6, PE-8, and PE-16. Media transport and sanitization are addressed by MP-5 and MP-6. Audit review, timestamps, protection, retention, and clock synchronization are addressed by AU-6, AU-8, AU-9, AU-11, and SC-45.
- NIST publications are control and requirement references, not blanket facility certifications. SP 800-171 Rev. 3 concerns CUI in nonfederal systems; contractual applicability must be established.
- The shared-management-VLAN warning is appropriate in the tenant-isolation context. Actual separation depends on endpoint reachability and access enforcement, not a VLAN name alone.
- Equinix documents exceptions for unannounced shipments; an order is still required. Its procedures and report availability should not be generalized to every provider.
- All four official-documentation links resolved to the intended resources. The author link is an attribution link, not technical evidence.
- This was a documentation review, not an inspection of a live facility or its contractual evidence. Scenario and inspection instructions are audit recommendations; effectiveness must be demonstrated at the actual site.
- No code, commands, configuration syntax, or executable tests were present. Changes were limited to the delivery-sequence correction and the two validation deliverables.
