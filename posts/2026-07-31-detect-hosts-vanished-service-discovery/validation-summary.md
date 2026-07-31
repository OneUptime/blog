# Validation Summary: Detect Hosts Missing from Service Discovery Before `up` Goes Stale

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus alerting rules
- Prometheus service discovery
- Prometheus Targets HTTP API
- Node Exporter
- Kubernetes Nodes and DaemonSets
- Kubernetes EndpointSlices

## Sources Consulted

- [Prometheus querying basics and staleness behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus automatically generated target labels and time series](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus query functions: `absent()`, `absent_over_time()`, `time()`, and `timestamp()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus logical/set operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus recording and alerting rule syntax](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus alerting rule behavior](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus Targets HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)
- [Prometheus configuration reference, including `keep_dropped_targets` and HTTP/file service discovery](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus HTTP service discovery](https://prometheus.io/docs/prometheus/latest/http_sd/)
- [Prometheus file-based service discovery guide](https://prometheus.io/docs/guides/file-sd/)
- [Prometheus v3.13.2 scrape-loop source for delayed end-of-run stale markers](https://github.com/prometheus/prometheus/blob/v3.13.2/scrape/scrape.go)
- [Prometheus v3.13.2 HTTP service-discovery metrics source](https://github.com/prometheus/prometheus/blob/v3.13.2/discovery/http/metrics.go)
- [Kubernetes DaemonSet behavior](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes DaemonSet API status fields](https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/)
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)

## Issues Found

- The inventory metric exposed its desired endpoint under `instance`, but Prometheus automatically uses that label for the inventory exporter's own scrape identity and, with default `honor_labels: false`, renames the exporter's conflicting label to `exported_instance`. Renamed the desired endpoint label to `target_instance`.
- The examples joined on the mutable endpoint address and did not state that all join labels must also exist on the `up` series. Changed the join to the durable `environment, host` identity and required target relabeling to add both labels to the node target.
- The 90-second freshness threshold for a 30-second scrape interval, combined with a 2-minute `for`, could not achieve the stated goal of detecting the condition before Prometheus's normal delayed end-of-run stale marker. Changed the freshness threshold to an explicitly aggressive 45 seconds, set the rule group interval to 10 seconds, removed the first alert's `for`, and documented the narrow timing and false-positive tradeoff.
- Service-discovery refresh time was presented as part of the sample-freshness threshold even though it is separate upstream latency before the scrape loop stops. Separated discovery-refresh latency from the freshness and rule-evaluation timing budget.
- The Targets API field list implied that dropped targets include post-relabel labels and active-scrape health/timing fields. Clarified which fields belong to active targets and which are present for dropped targets.
- The staged retirement test referred to an undefined “unexpected-target” alert. Changed it to the missing-from-pool alert that the post actually defines.

## Review Notes

- The core design is correct: an independently maintained desired-target metric is required to enumerate missing identities, and `unless` preserves the inventory labels.
- The 45-second threshold is deliberately aggressive and should be tuned against real scrape duration, scheduler delay, rule-evaluation latency, and the deployment's false-positive budget.
- `prometheus_sd_http_failures_total` is still present in Prometheus v3.13.2. Current Prometheus also exposes generic per-mechanism refresh metrics, but the post's named metric remains valid.
- The Targets API and `keep_dropped_targets` caveat, HTTP and file service-discovery behavior, and the Kubernetes DaemonSet and EndpointSlice explanations were verified as current.
