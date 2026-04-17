# Validation Summary: DORA Compliance and Monitoring: A Guide for Engineering Teams

## Status
validated

## Post Type
Guide / compliance-focused strategic article

## Technologies Covered
- EU Digital Operational Resilience Act (DORA) — Regulation (EU) 2022/2554
- Monitoring / observability stack components (infrastructure monitoring, APM, log management, incident management, status pages, synthetic monitoring, error tracking)
- OpenTelemetry (mentioned for APM and distributed tracing instrumentation)
- Deployment targets: Kubernetes, Docker, bare metal
- Vendor examples: Datadog, New Relic, Splunk, PagerDuty, Atlassian Statuspage, Pingdom, Sentry
- OneUptime (self-hosted, open-source unified platform)

## Sources Consulted
- Regulation (EU) 2022/2554 (DORA) — [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng)
- DORA Article 8 (Identification) — [digital-operational-resilience-act.com/Article_8](https://www.digital-operational-resilience-act.com/Article_8.html)
- DORA Article 14 (Communication) — [digital-operational-resilience-act.com/Article_14](https://www.digital-operational-resilience-act.com/Article_14.html)
- EBA Joint Technical Standards on major incident reporting — [EBA](https://www.eba.europa.eu/activities/single-rulebook/regulatory-activities/operational-resilience/joint-technical-standards-major-incident-reporting)
- ESA Final report on the draft RTS and ITS on incident reporting (JC 2024-33) — [ESMA](https://www.esma.europa.eu/sites/default/files/2024-07/JC_2024-33_-_Final_report_on_the_draft_RTS_and_ITS_on_incident_reporting.pdf)

## Issues Found
- **Incorrect DORA article attribution.** The post attributed the quote "identify, classify and adequately document all ICT-supported business functions, roles and responsibilities" to Article 9. This language is actually from Article 8 ("Identification"). Article 9 of DORA is titled "Protection and prevention" and covers a different topic (security controls such as encryption, authentication, network segmentation). Changed the reference from "Article 9" to "Article 8" and aligned the phrasing ("ICT supported", no hyphen) with the regulation text.

## Review Notes
- DORA effective/application date of 17 January 2025 is accurately characterized as "in effect since January 2025".
- Article 18 is correctly described as covering incident classification. Strictly, the reporting obligation itself is in Article 19, and the specific 4h / 72h / 1 month timelines are set out in the Commission Delegated Regulation / RTS (JC 2024-33, later adopted as Regulation (EU) 2025/302). The post's shorthand attributing the framework to Article 18 is acceptable for a non-legal guide, but readers implementing this should cite Article 19 + the RTS when documenting their compliance program.
- The 4 hours (after major classification) / 72 hours (intermediate) / 1 month (final) timelines match the ESA RTS. Note that DORA also adds a "no later than 24 hours from becoming aware" outer bound on the initial notification, which this post omits — factually correct as far as it goes, but incomplete if used as implementation guidance.
- Article 14 reference for stakeholder communication plans is accurate (Article 14 — Communication).
- Articles 24–27 (digital operational resilience testing, including TLPT) and Articles 28–30 (third-party risk) are correctly scoped.
- Cost estimates for commercial tooling are illustrative order-of-magnitude figures; they vary widely by scale and contract and were not independently verified beyond reasonableness.
- No code, CLI commands, or configuration snippets are present in the post, so implementation correctness was not applicable beyond the regulatory/architectural claims above.
