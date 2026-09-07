# Validation Summary: How to Write an Executable Colocation Remote-Hands Runbook

## Status

validated

## Post Type

Technical operations guide. The post contains concrete hardware identification, maintenance, verification, and recovery procedures, so it qualifies for technical review despite having no executable software code.

## Technologies Covered

- Colocation remote-hands services and Equinix Smart Hands
- Server and drive identification and replacement planning
- Rack, cable, port, and PDU outlet identification
- Fiber connectivity checks and optical-level measurements
- ESD controls and electrical safety boundaries
- Change management, contingency planning, verification, and rollback

## Sources Consulted

- [Equinix Smart Hands order types](https://docs.equinix.com/smart-hands/ordering/order-types/) — service categories, maintenance versus outage power cycles, audits, console access, and connectivity checks.
- [Equinix Smart Hands overview](https://docs.equinix.com/smart-hands/) — supported physical work, inventory and photographic evidence, scheduling, and turnaround factors.
- [Equinix inbound shipment requirements](https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/) — receiving orders, permissions, handling instructions, and after-hours conditions.
- [NIST contingency planning publication page](https://www.nist.gov/publications/contingency-planning-guide-federal-information-systems-including-updates-through) and [SP 800-34 Rev. 1 publication record](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) — reference identity, revision date, and contingency-planning scope.
- [Dell PowerEdge XE9680 drive indicator codes](https://www.dell.com/support/manuals/en-in/poweredge-xe9680/xe9680_ism_pub/drive-indicator-codes?guid=guid-d173f709-9ac6-44fe-9989-21e46a2a84c8&lang=en-us) — hardware-dependent LED colors and blink patterns.
- [OSHA 29 CFR 1910.333](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.333) — qualified-person requirements for work on exposed energized parts. Relevant text was available through the official search result; a subsequent direct page request returned a retrieval error.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The recommendations for identity checks, hold points, stop conditions, evidence, and recovery are operational guidance, not claims that Equinix or NIST mandates this exact runbook format.
- Equinix lists all the cited service categories. Its Power Cycle Equipment entry routes service-impacting issues through a Trouble Ticket; planned, non-service-impacting work uses Equipment Maintenance. The post correctly directs readers to the provider catalog rather than prescribing one order type for every power cycle.
- The fenced text is an illustrative human procedure, not code or configuration. No CLI commands, APIs, dependencies, or software-version claims require execution testing.
- The sample asset identifiers and slot label are illustrative. Amber LED behavior is hardware-dependent: a real runbook must specify the target model's documented color and blink pattern. The example requires reporting and approval and explicitly prohibits drive removal at that step.
- Physical indicators are appropriately separated from application, routing, replication, and monitoring verification. A link light alone does not establish service health.
- Backups, traffic draining, firmware compatibility, and replacement readiness are prerequisites to select for the actual maintenance task. Their completion cannot be verified from this generic article.
- Electrical qualification requirements depend on the work and jurisdiction; the article appropriately defers to facility policy. The OSHA source supports exposed energized-work restrictions, not a claim that every ordinary plug connection requires an electrician.
- The four official documentation links resolve to the intended resources. NIST identifies the cited guide as Revision 1, updated November 11, 2010; the article makes no claim that it is a new publication or a device-specific maintenance manual.
- Billing increments and after-hours charges remain provider- and contract-dependent. The article recommends checking the applicable terms and does not assert universal rates or increments.
- Review was documentation-based; no live equipment operations or facility-specific runbook execution were performed.
