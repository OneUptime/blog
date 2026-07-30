# Validation Summary: Time to First Deployment: A Practical Metric for Developer Onboarding

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Developer onboarding measurement
- Platform engineering and developer experience
- Version-control attribution
- Pull request, CI, and production deployment telemetry
- Time-to-event analysis and right-censored observations
- DORA software delivery performance metrics

## Sources Consulted
- [Microsoft Learn: Plan and prioritize a platform engineering journey](https://learn.microsoft.com/en-us/platform-engineering/plan)
- [Google Research: Developer Productivity for Humans—Onboarding and Ramp-Up](https://research.google/pubs/developer-productivity-for-humans-part-5-onboarding-and-ramp-up/)
- [DORA: Continuous delivery](https://dora.dev/capabilities/continuous-delivery/)
- [DORA: Documentation quality](https://dora.dev/capabilities/documentation-quality/)
- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [NIST/SEMATECH e-Handbook: Censoring](https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm)
- [NIST/SEMATECH e-Handbook: Kaplan-Meier approach](https://www.itl.nist.gov/div898/handbook/apr/section2/apr215.htm)
- [Git user manual: Commit-object author and committer metadata](https://git-scm.com/docs/user-manual)

## Issues Found
- The guidance recommended cohort medians and tail percentiles without explicitly explaining how to calculate them when observations are right-censored. Computing those values only from developers who have already deployed would bias the result toward faster completions, and a requested percentile might not be estimable within the observation window. The post now says to estimate quantiles from a survival curve, report unestimable quantiles as not reached, and identifies Kaplan-Meier estimation in the example metric contract.

## Review Notes
- The formulas and milestone snippets are explanatory pseudocode, not executable program code or configuration.
- The four links in the post's Official Documentation section were checked successfully and resolve to the intended resources.
- Kaplan-Meier estimates rely on censoring assumptions. A fixed reporting cutoff is ordinary administrative right-censoring, but employee departure, role changes, or other event-dependent loss of follow-up should be governed explicitly rather than treated automatically as equivalent censoring.
