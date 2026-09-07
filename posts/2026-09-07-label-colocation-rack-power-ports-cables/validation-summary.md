# Validation Summary: How to Label Rack Units, Power Feeds, Ports, and Cables Before a Colocation Move

## Status
validated

## Post Type
Technical operations guide. The post contains concrete rack, power, port, and cable implementation procedures, so it qualifies for technical review despite having no executable code.

## Technologies Covered
- Colocation rack layouts and asset inventory
- Rack PDUs, redundant power supplies, and A/B power feeds
- Ethernet interfaces, patch panels, and fiber cabling
- Cable identifiers, fiber polarity, barcodes, and QR labels
- ANSI/TIA-606-D telecommunications administration
- NIST SP 800-53 Rev. 5 component inventory
- Provider cross-connects and LOA/CFA records

## Sources Consulted
- NIST SP 800-53 Rev. 5, CM-8: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf
- NIST publication page linked by the post: https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0
- TIA Fiber Optics Technology Consortium overview of ANSI/TIA-606-D: https://www.tiafotc.org/tia-standards-update/tia-606-d/
- TIA announcement of TIA-606-E ballot/public review: https://tiaonline.org/standardannouncement/tia-issues-a-ballot-and-public-review-notification-for-tia-606-e-administration-standard-for-telecommunications-infrastructure/
- Schneider Electric, Planning Effective Power and Data Cable Management in IT Racks: https://www.se.com/us/en/download/document/SPD_VAVR-9G4NDJ_EN/
- Equinix Customer Installation Guidelines: https://docs.equinix.com/colocation/colo-customer-install-guidelines/
- Equinix Create Cross Connect Order: https://docs.equinix.com/cross-connect/cross-connect-api/createcrossconnectorder/
- Equinix Create a Digital Letter of Authorization: https://docs.equinix.com/cross-connect/digital-loa/xc-loa-create/
- Dell PowerEdge PSU removal/replacement guidance: https://www.dell.com/support/kbdoc/en-us/000141313/poweredge-psu-how-to-remove-or-replace-a-power-supply-unit
- Dell PowerEdge Power Settings: https://www.dell.com/support/kbdoc/en-us/000202926/poweredge-power-settings
- Cisco Nexus 9324C-SE1U hardware overview and port numbering: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/hw/n9324c-se1u/nxos/cisco-nexus-9324c-se1u-nx-os-mode-switch-hardware-installation-guide/m_overview1.pdf

## Issues Found
1. The permanent device identifier embedded its current site, cage, and rack, conflicting with stable identification through a move. Changed the example to `SRV042` and explicitly required globally unique asset IDs with location stored separately. This is an operational correction consistent with inventory continuity; NIST does not mandate this particular ID format.
2. Reading PDU outlet data was presented as sufficient physical verification, and the cord-removal test omitted explicit checks of remaining capacity and restoration between tests. Added physical tracing, corroborating telemetry, provider confirmation of upstream feeds, healthy redundancy/capacity checks, and restoration before the next cord test. Outlet identity does not prove independent upstream feeds, and redundant PSU hardware alone does not establish the active redundancy configuration.
3. Unconditional left-to-right/top-to-bottom numbering could conflict with equipment labels. Cisco documents odd-numbered upper ports and even-numbered lower ports on the cited switch. Required preserving manufacturer numbering and limited the proposed scheme to ports without existing numbers.

## Review Notes
- The text blocks are illustrative inventory records, not configuration files or executable examples. No command, API, syntax, or runtime tests apply. Device/interface names and drive slot notation must match the actual hardware; no universal slot naming convention is implied.
- The remaining recommendations on human-readable identifiers, endpoint records, reconciliation, photography, and material selection are reasonable operational practices. They are not presented as verbatim standards requirements. Physical implementation still requires checking actual hardware, optics compatibility, label specifications, and cable bend-radius limits.
- NIST CM-8 supports accurate inventories, avoiding duplicate accounting, accountability, and recording physical location. The Schneider Electric document landing page supports the discussion of downtime, cooling, safety, and moves/adds/changes; its complete white paper was not inspected.
- The NIST and Equinix links resolve to the intended resources. The APC link redirects to the correct Schneider Electric document. The Accuris standard listing returned HTTP 403 to the review tool; its subject was corroborated through TIA's official consortium overview. The licensed full standard was not inspected, so this review does not certify clause-level TIA compliance.
- TIA's June 2025 announcement concerns a ballot/public review for revision E, not proof of final publication. The post does not claim D is the latest edition and correctly asks readers to confirm the applicable edition; no speculative edition update was made.
- Cross-connect endpoint and LOA record guidance agrees with Equinix documentation. Provider-specific fields and permissions should follow the actual service order.
