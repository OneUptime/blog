# Validation Summary: How to Create Availability Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Site Reliability Engineering (SRE)
- Service Level Indicators (SLIs)
- Service Level Objectives (SLOs)
- Service Level Agreements (SLAs)
- Error budgets
- Availability and durability metrics
- Synthetic monitoring and Real User Monitoring (RUM)

## Sources Consulted
- Google SRE Book, "Service Level Objectives": https://sre.google/sre-book/service-level-objectives/
- Google SRE Workbook, "Implementing SLOs": https://sre.google/workbook/implementing-slos/
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/
- AWS Well-Architected Framework, Reliability Pillar, "Availability": https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html
- AWS S3 User Guide, "Data protection in Amazon S3": https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html
- Microsoft Azure Well-Architected Framework, "Architecture strategies for defining reliability targets": https://learn.microsoft.com/en-us/azure/well-architected/reliability/metrics

## Issues Found
- The dependency example described 99.9% as the "max achievable" availability for a flow that also listed several other required dependencies. A hard dependency with 99.9% availability is an upper bound without fallback, but a serial flow with multiple required dependencies can have lower composed availability. Changed the prose to note that total availability may be lower once all required dependencies are included, and changed the Mermaid label from "Max achievable without fallback" to "Upper bound without fallback."

## Review Notes
The downtime table, error budget calculations, SLI/SLO/SLA terminology, use of 2xx/4xx as successful HTTP availability events, distinction between availability and durability, and burn-rate alerting guidance are consistent with the consulted SRE and cloud reliability references. The post is conceptual and contains no executable code, CLI commands, or configuration snippets to run.
