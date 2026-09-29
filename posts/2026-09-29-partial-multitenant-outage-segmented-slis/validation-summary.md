# Validation Summary: How to Measure Partial or Multi-Tenant Outage Impact with Segmented SLIs

## Status
validated

## Post Type
Technical guide with PromQL examples and an application instrumentation contract.

## Technologies Covered
- Prometheus counters, labels, and time-series cardinality
- PromQL rate(), increase(), aggregation, label matching, and division
- Service level indicators (SLIs), SLOs, and incident response
- Multi-tenant observability, synthetic journeys, and event-based tenant impact analysis

## Sources Consulted
- Google SRE Workbook, Implementing SLOs: https://sre.google/workbook/implementing-slos/ — event-based SLIs, user journeys, measurement coverage, and segmentation.
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/ — low-traffic services and synthetic traffic.
- Google SRE Book, Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/ — black-box monitoring and failures that successful HTTP responses can conceal.
- Prometheus instrumentation guidance: https://prometheus.io/docs/practices/instrumentation/ — label cardinality, alternative analysis systems, and initializing known series.
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/ — counter resets, rate-before-aggregation, and extrapolated increases.
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/ — sum by, arithmetic, and vector matching.
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/ — selectors, regular-expression matchers, range vectors, and staleness.
- Author profile link checked: https://github.com/nawazdhandala — the post's www.github.com URL redirects to this profile.

## Issues Found
No technical issues found.

## Review Notes
- Both PromQL expressions were reviewed against the official syntax and semantics. The numerator and denominator retain the same region, cell, and tenant_tier labels, so default vector matching is appropriate. The outcome matcher includes both good and bad events.
- Applying rate() and increase() before sum preserves per-series reset handling. The post correctly describes five-minute increases as estimates that can be fractional, rather than exact event counts.
- Initializing both outcome series supports cohorts with no observed failures. An observed zero-traffic cohort produces an undefined 0/0 fraction, whereas absent input series can produce no result. The guidance correctly requires independent coverage and freshness checks.
- The application-defined metric requires the instrumentation contract described in the post; Prometheus does not itself classify checkout deadlines or deduplicate attempts. The volume query measures outcomes recorded during the window, which can include attempts admitted before the window. This follows the stated completion/deadline accounting model.
- Checked the introductory arithmetic: 99,000 successful requests out of 100,000 is 99% success. A complete failure in a smaller cohort can also coexist with aggregate success above 99%. The illustrative table contains 1,020 failures in 100,000 observed attempts; the unavailable APAC cohort cannot be treated as healthy or included without data.
- Summing event counts before division gives the traffic-weighted global fraction. Distinct affected tenants require tenant-level evidence and an explicit population denominator; bounded tier labels cannot supply exact tenant impact.
- The discussion of retry amplification, boundary blind spots, low-volume uncertainty, synthetic checks, and shifting traffic is consistent with the cited SRE guidance. Minimum-volume guards do not establish recovery or eliminate observed customer failures.
- All external links in the post resolve to the intended resources. No version-specific dependencies, deprecated PromQL features, terminal commands, or executable configuration files are present. The text block is a measurement contract.
- Validation was documentation-based; the queries were not executed against a live Prometheus service or application dataset. README.md required no changes.
