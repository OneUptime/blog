# Validation Summary: Root Cause vs Contributing Factors: How to Avoid a Single-Cause Story

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Incident management and causal analysis
- Root cause analysis and contributing-factor models
- Blameless SRE postmortems
- Retry budgets, load shedding, and cascading-failure controls
- SLO and error-budget burn-rate alerting
- Canary rollouts, cold-cache behavior, and regional isolation

## Sources Consulted

- [OSHA: Incident Investigation](https://www.osha.gov/incident-investigation)
- [OSHA: Hazard Identification and Assessment](https://www.osha.gov/safety-management/hazard-identification)
- [NASA Procedural Requirements 8621.1D: Mishap Investigation Process](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_8621_001D_&page_name=Chapter4)
- [NASA Procedural Requirements 8621.1D: Terms and Definitions](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_8621_001D_&page_name=AppendixA)
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE: Incident Management Guide](https://sre.google/resources/practices-and-processes/incident-management-guide/)
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/)

## Issues Found

- The Official Documentation section linked to NASA Procedural Requirements 8621.1B, which NASA marks obsolete and canceled as of June 21, 2019. Replaced it with the current NPR 8621.1D Mishap Investigation Process chapter, which covers structured causal analysis, evidence, fact-supported relationships, and corrective recommendations. The existing NPR 8621.1D definitions link remains accurate for proximate, intermediate, and root causes, contributing factors, and event-and-causal-factor trees that include failed barriers.

## Review Notes

- The post contains a conceptual incident scenario rather than executable code, terminal commands, API calls, or configuration snippets.
- The operational examples involving retry amplification, cold-cache load, representative canary traffic, customer-facing alert signals, and burn-rate alerting are consistent with Google SRE guidance.
- The post appropriately presents its taxonomy as a practical model rather than claiming that all incident-analysis standards use identical definitions.
- All external links in the revised post returned successful HTTP responses during validation.
