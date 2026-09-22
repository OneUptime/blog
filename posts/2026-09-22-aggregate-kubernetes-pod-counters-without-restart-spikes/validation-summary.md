# Validation Summary: How to Aggregate Prometheus Pod Counters Without Kubernetes Restart Spikes

## Status
validated

## Post Type
Technical guide with PromQL examples and a reproducible counter-reset test.

## Technologies Covered
- Prometheus and PromQL
- Kubernetes Pods and container restarts
- Counter metrics, scrape health, and time-series identity
- Prometheus `promtool` and YAML expression tests
- High-availability replica deduplication in long-term monitoring backends

## Sources Consulted
- Prometheus query functions: `rate`, `increase`, and `resets`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics: selectors, range boundaries, subqueries, and staleness: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus unit testing format: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus `promtool` command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus jobs, instances, and automatically generated scrape metrics: https://prometheus.io/docs/concepts/jobs_instances/
- Kubernetes Pod lifecycle and replacement behavior: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Thanos Query documentation for supported HA replica deduplication: https://thanos.io/tip/components/query.md/
- Official Prometheus release used for execution: https://github.com/prometheus/prometheus/releases/tag/v3.14.0
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Reviewed every PromQL example. The selectors, duration syntax, grouping, and placement of `rate` and `increase` before aggregation are valid. Grouping retains the specified service identity labels and removes other dimensions from the result.
- Verified that counter decreases trigger reset handling, `rate` reports requests per second, and `increase` extrapolates rather than providing an exact transaction count. A subquery over an already aggregated counter cannot reconstruct the original series histories.
- Extracted the YAML example directly from README.md and ran `promtool test rules` against it using the official Prometheus 3.14.0 Darwin ARM64 binary. The test returned `SUCCESS`, including the expected service label and value of 2.75. The configuration fields and CLI invocation match the official documentation.
- Independently checked the arithmetic: at evaluation time 5m, the selected samples are at minutes 1 through 5. Pod A contributes a reset-adjusted increase of 180 over 240 seconds (0.75 requests/second); Pod B contributes 480 over 240 seconds (2 requests/second). Extrapolation to the full window preserves these rates in this fixture.
- The post correctly distinguishes a reset within an unchanged label set from a replacement Pod that produces a new series. Its warning about traffic before the first scrape and unobserved increments before a reset is appropriate.
- The assumed Kubernetes and service labels are explicitly described as scrape-configuration dependencies. The `up` diagnostic and the warning against masking missing telemetry with zero are appropriate. Range-based rates can retain older samples after a series disappears from instant selectors.
- Duplicate scrape jobs and HA replicas can double-count observations. The recommendation to use backend-supported deduplication is consistent with Thanos documentation; summing away a replica label is not deduplication.
- The post's external links resolve to the intended documentation and author profile. No deprecated syntax or APIs were identified. The demonstrated result was tested on Prometheus 3.14.0; other versions or alternative PromQL engines were not executed.
- No live Kubernetes rollout, scrape outage, or HA backend test was performed. Those staging exercises are recommendations in the post, not claimed results of this review. README.md required no changes.
