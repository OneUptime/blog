# Validation Summary: How to Stock and Track Spare Parts at a Colocation Facility for Fast Repairs

## Status
validated

## Post Type
Technical operations guide. The post contains quantitative inventory planning and implementation details for hardware storage, asset tracking, remote-hands replacement, and replenishment, so it qualifies for technical review despite having no executable code.

## Technologies Covered
- Colocation facilities and remote-hands services
- Server hardware, field-replaceable components, and spare-parts compatibility
- Inventory management, lead-time demand, safety stock, and Poisson probabilities
- Asset identification, barcode tracking, and custody records
- Electrostatic discharge (ESD) protection and hardware storage
- Media sanitization and secure RMA/disposal workflows

## Sources Consulted
- NIST SP 800-53 Rev. 5 publication: https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0
- NIST SP 800-53 Rev. 5, CM-8 and CM-8(1), inventory fields and installation/removal updates: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf
- NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization: https://csrc.nist.gov/pubs/sp/800/88/r2/final
- NIST Engineering Statistics Handbook, Poisson distribution and cumulative probability formula: https://itl.nist.gov/div898/handbook/eda/section3/eda366j.htm
- Oracle Inventory Help, Reorder Point Planning, lead-time demand plus safety stock and inclusion of planned receipts: https://docs.oracle.com/cd/A60725_05/html/comnls/us/inv/roplan.htm
- Seagate, Hard disk drive reliability and MTBF / AFR: https://www.seagate.com/support/kb/hard-disk-drive-reliability-and-mtbf-afr-174791en/
- Dell, equipment safety and ESD handling guidance: https://i.dell.com/sites/doccontent/shared-content/solutions/en/Documents/clientsafety_english_us.pdf
- Equinix inbound shipments, storage limits, and packaging restrictions: https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/
- Equinix Smart Hands order types and equipment-maintenance services: https://docs.equinix.com/smart-hands/ordering/order-types/

## Issues Found
- The lead-time demand formula used the ambiguous term “annual failure rate.” A per-device failure rate alone does not yield the fleet replacement count. Changed the input to expected replacements per year across the installed hardware family, consistent with the four-replacements-per-year example.
- The 98 percent no-stockout statement did not explicitly identify its time horizon or starting inventory. Clarified that three usable drives cover demand over one three-month lead-time interval with approximately 98 percent probability under the stated model; this is not an annual guarantee.
- The replenishment trigger referred only to “stock,” leaving outstanding replenishment and unmet demand unaccounted for. Defined inventory position and specified triggering at or below the reorder point to avoid missed thresholds or duplicate ordering based solely on physical stock.
- The packaging guidance lacked the cited provider's restriction on combustible packaging inside the colocation area. Added Equinix's prohibition on boxes, paper, and cardboard there and required facility-approved protective storage.

## Review Notes
- Independently recalculated the Poisson example: with mean 1, P(demand <= 2) = 0.9196986 and P(demand <= 3) = 0.9810118. Both original rounded percentages are correct; expected demand of 4 × 0.25 = 1 is also correct.
- The independence/stationarity and common-mode failure caveats are appropriate. Stocking levels remain conditional on actual demand, usable compatibility, replenishment time, and the ordering policy.
- CM-8 supports the listed inventory specifications and accountability guidance; CM-8(1) supports updates during installations and removals. The additional spare-pool fields are the author's operational recommendations.
- SP 800-88 Rev. 2 was published in September 2025 and supersedes Rev. 1. The post's revision and link are correct. An RMA does not replace the organization's media-release and sanitization process.
- All four official-documentation links resolve to the intended resources. The author-profile link is attribution rather than technical evidence.
- Compatibility, battery handling, test intervals, and remote-hands authorization depend on the specific equipment and facility. The post appropriately directs readers to manufacturer guidance and service scope rather than prescribing universal procedures.
- Physical counts and hardware tests require actual inspection or execution, even when workflow software schedules and records them. No facility hardware or service contract was available for operational testing.
- No executable code, CLI commands, APIs, or configuration files require runtime testing. The fenced text blocks are planning formulas and probability statements.
