# Validation Summary: How to Measure Platform Toil Through Support Tickets, Interruptions, and Manual Approvals

## Status
validated

## Post Type
Technical guide / measurement framework

## Technologies Covered
- Google Site Reliability Engineering (SRE) toil model
- Operational-load and interruption measurement
- Platform engineering and internal developer platforms
- Developer self-service workflows and automated guardrails
- Support-ticket and manual-approval workflow instrumentation
- Demand-normalized metrics and Pareto analysis

## Sources Consulted
- Google SRE Workbook: Eliminating Toil — https://sre.google/workbook/eliminating-toil/
- Google SRE Book: Eliminating Toil — https://sre.google/sre-book/eliminating-toil/
- Google SRE Book: Dealing with Interrupts — https://sre.google/sre-book/dealing-with-interrupts/
- Microsoft Learn: Empower developers through self-service — https://learn.microsoft.com/en-us/platform-engineering/about/self-service
- GitHub author profile — https://github.com/nawazdhandala

## Issues Found
1. **The service-scaling characteristic of toil was stated too broadly.** The post said toil is able to grow with service scale, but Google defines this characteristic as scaling linearly with service growth (and the SRE Workbook describes it as growing at least as fast as its source). Changed the definition and classification question to specify linear or roughly proportional growth.
2. **The effort field did not explicitly account for multiple participants.** A single `active_human_minutes` value could be interpreted as elapsed handling time and undercount simultaneous work. Renamed it to `active_person_minutes` and clarified that each participant's hands-on time must be summed.
3. **Request-to-decision duration was labeled approval wait time.** That interval is decision lead time and includes active review, so it is not a pure waiting interval. Split the measurement into initial approval queue time (`review start time - approval request time`), decision lead time (`approval decision time - approval request time`), and aggregate reviewer person-minutes for touch time.

## Review Notes
- The schemas and formulas are implementation-neutral pseudocode rather than executable code. There are no CLI commands, configuration files, language APIs, or version-specific examples to validate.
- The manual approval and straight-through rates are explicitly scoped to eligible completed or successful workflows. Implementations should document their definitions of eligibility, completion, and human action and keep them stable across reporting periods.
- All external links in the post were reachable and pointed to the intended official documentation or author profile at review time.
