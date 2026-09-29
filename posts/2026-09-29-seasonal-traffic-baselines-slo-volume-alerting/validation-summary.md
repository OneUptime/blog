# Validation Summary: How to Alert on Seasonal Traffic with Baselines, SLOs, and Volume Guards

## Status
validated

## Post Type
Technical guide containing a Prometheus recording-rule configuration and PromQL alert expressions.

## Technologies Covered
- Prometheus recording rules and counter instrumentation
- PromQL rates, range aggregations, offsets, comparisons, and vector matching
- Service-level indicators, service-level objectives, and error-budget burn rates
- Seasonal traffic diagnostics, low-volume alert policies, and synthetic monitoring

## Sources Consulted
- [Prometheus: Defining recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) — YAML fields, evaluation intervals, recording expressions, and skipped evaluations.
- [Prometheus: Querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) — range boundaries, offset placement, fixed-duration weeks, and stale series.
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — `rate`, `increase`, `avg_over_time`, and `count_over_time` semantics.
- [Prometheus: Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — aggregation, division, filtering comparisons, and `and on` label matching.
- [Prometheus: Instrumentation](https://prometheus.io/docs/practices/instrumentation/) — counters, bounded labels, and initializing known series to zero.
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) — burn-rate arithmetic, multiple alert windows, low-traffic limitations, and synthetic traffic masking real-user failures.
- [Author's GitHub profile](https://github.com/nawazdhandala) — confirmed the author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. Reviewed all four fenced examples against official documentation; the post contains no terminal commands or version-specific API claims.
- The YAML is a valid recording-rule file structure. Its group interval is one minute, and applying `rate` before aggregation preserves reset handling for individual counters. Deployment requires loading the rule file through Prometheus's `rule_files` configuration.
- The seasonal expression compares the current five-minute rate with the average of recorded rates in a trailing 30-minute window shifted seven days into the past. With uninterrupted one-minute evaluations, that range contains 30 samples. The 1.5 multiplier and 25-sample completeness policy are explicitly heuristics. The displayed query does not itself implement the separately described completeness guard or capacity fallback.
- Verified the SLO arithmetic: the allowed error fraction is 0.001, and multiplying it by 14.4 gives 0.0144 (1.44%). Both window comparisons filter their results before `and on (service, region)` intersects them. This is an illustrative fast-burn condition, not a complete paging configuration. Under seasonal traffic, an hourly error ratio should not be treated as an exact fraction of a full-period request budget; the post makes no such numerical claim.
- The volume expression applies `increase` to counters before summing. `increase` extrapolates and can return fractional estimates, so the floor is not an exact audited request count. It guards the one-hour volume only, not the five-minute volume. These are deployment caveats rather than errors in the stated policy.
- The denominator must contain precisely the eligible SLO requests, with errors forming a subset. The post explicitly states this requirement and assumes initialized error series. Missing series and zero traffic cannot establish success; independent telemetry-health checks and probes remain necessary.
- The warning about synthetic successes diluting real-user failures is supported by the SRE workbook. Keeping synthetic monitoring separate is a valid policy choice.
- Both technical reference links resolve to the intended official resources. The functions and configuration fields used are documented and do not require experimental features.
- Validation was a documentation and expression review. No live Prometheus replay or `promtool` execution was performed; `promtool` is not installed in the review environment. The unusual-week replay scenarios remain operational checks for the service owner.
