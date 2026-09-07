# Validation Summary: How to Verify Colocation Resilience and SLAs

## Status
validated

## Post Type
Technical infrastructure verification guide. The post contains concrete power-path, cooling, failure-testing, and SLA-calculation details, so it qualifies for technical review despite having no executable code.

## Technologies Covered
- Colocation facilities and high availability
- UPS systems, generators, A/B power distribution, and rack PDUs
- Cooling, containment, and environmental monitoring
- Fire detection, suppression, and water-event protection
- Uptime Institute Tier classifications and certifications
- SLA availability calculations, service credits, and error budgets
- Carrier diversity, operational testing, and geographic recovery

## Sources Consulted
- Uptime Institute Tier Classification System: https://uptimeinstitute.com/tiers
- Uptime Institute Tier Certification overview: https://uptimeinstitute.com/tier-certification
- Uptime Institute Tier Certification of Constructed Facility: https://uptimeinstitute.com/tier-certification/construction
- NFPA 75, 2024 edition landing page: https://link.nfpa.org/all-publications/75/2024
- NFPA 75, publicly indexed 2020 contents, used to corroborate the broad subject coverage: https://link.nfpa.org/all-publications/75/2020
- NIST SP 800-53 Rev. 5 publication page: https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0
- NIST SP 800-53 Rev. 5 text, especially PE-11, PE-13, PE-14, PE-15, CP-7, and CP-8: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf
- Equinix power documentation, including redundant circuit pairs and usable circuit limits: https://docs.equinix.com/colocation/about/colo-power/
- Historical Equinix agreement filed with the SEC, Exhibit C, illustrating service-specific outage definitions, credits, and termination provisions: https://www.sec.gov/Archives/edgar/data/1108524/000119312506055150/dex108.htm

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged.
- Verified that Tier III means concurrent maintainability and Tier IV adds fault tolerance. The post correctly distinguishes design, constructed-facility, and operational certification scopes without assigning guaranteed uptime percentages to Tiers.
- The power and cooling guidance appropriately examines shared dependencies, maintenance states, failure states, and load capacity. Component counts alone do not establish end-to-end resilience. Actual rack performance still requires site-specific evidence and approved testing.
- NIST PE-14 supports maintaining and monitoring environmental conditions; PE-11, PE-13, and PE-15 address emergency power, fire protection, and water damage. CP-7 and CP-8 support alternate-site and telecommunications contingency planning.
- Independently checked the arithmetic: 30 × 24 × 60 × (1 - 0.9999) = 4.32 minutes. The availability target is expressed as a fraction in this calculation. The post correctly qualifies this as a simple model subject to the actual contract.
- The historical SLA was consulted only as an example of contract structure, not as evidence of current Equinix commercial terms. No specific provider commitment is asserted in the post.
- The four official documentation links point to the intended organizations and resources. NFPA LiNK returned an application shell for the 2024 edition, so full clause-level verification of that edition was unavailable. Publicly indexed NFPA contents corroborate the broad scope described; the post makes no edition-specific clause or suppression-agent claims.
- Fire-protection compliance depends on the adopted code, installed design, insurer requirements, and authority having jurisdiction, as the post states. This review does not certify an actual facility or verify any provider certificate.
- There are no executable examples, CLI commands, API calls, or configuration files to run. No facility failure tests were performed during this editorial review.
