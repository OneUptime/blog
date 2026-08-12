# Validation Summary: How Much Sprint Capacity Should You Reserve for Improvement Work and Technical Debt?

## Status
validated

## Post Type
Engineering management guide with an illustrative capacity formula and YAML policy example.

## Technologies Covered

- Scrum, including Sprint Planning, the Product Backlog, Sprint forecasts, and the Definition of Done
- Kanban, including slack, pull policies, work-in-progress controls, and flow metrics
- Google Site Reliability Engineering concepts, including toil, operational work, error budgets, and on-call load
- DORA software delivery performance metrics
- YAML for recording an illustrative capacity policy

## Sources Consulted

- [The Scrum Guide, November 2020](https://scrumguides.org/scrum-guide.html)
- [The Kanban Guide, May 2025](https://kanbanguides.org/the-kanban-guide/)
- [Open Guide to Kanban, July 2025](https://kanbanguides.org/open-guide-to-kanban/2025.7/)
- [Google SRE Book: Eliminating Toil](https://sre.google/sre-book/eliminating-toil/)
- [Google SRE Workbook: Eliminating Toil](https://sre.google/workbook/eliminating-toil/)
- [Google SRE Book: Being On-Call](https://sre.google/sre-book/being-on-call/)
- [Google SRE Workbook: Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found

- The capacity formula called its unit `team-days`, while the calculation multiplies people by days and subtracts person-days. Changed the unit to `person-days` throughout the model and example so the dimensional arithmetic is consistent.
- The Scrum Guide paraphrase said Developers select what they can complete, which made a forecast sound certain and omitted the Product Owner discussion. Changed it to state that Developers select Product Backlog items through discussion with the Product Owner and that past performance, upcoming capacity, and the Definition of Done increase confidence in the Sprint forecast.
- The instruction to create an improvement backlog could imply a second source of Scrum Team work. Changed it to make improvement demand visible in the Product Backlog, consistent with the Scrum Guide's definition of that backlog as the single source of work undertaken by the Scrum Team.
- The slack description said unused capacity absorbs continuous improvement. Changed it to distinguish absorbing variability and urgent demand from enabling continuous improvement, matching the Open Guide to Kanban.
- The SRE section described Google's 50% operational-work limit as protection from manual operational load. Because the limit covers operational work broadly, including toil- and non-toil-intensive work, changed this to `operational load`.

## Review Notes

- The YAML example is syntactically valid and parsed as a mapping with the intended nested sequences. Its fields are explicitly illustrative rather than an application-specific configuration schema.
- All eight URLs present in the post returned successful HTTP responses and led to the intended official or author resources during validation.
- The current DORA guide uses five metrics: change lead time, deployment frequency, failed deployment recovery time, change fail rate, and deployment rework rate. The post uses broader, non-exhaustive measurement language and does not conflict with that model.
