# Validation Summary: Build Reliable Multi-Cluster Showback with OpenCost

## Status

validated

## Post Type

Technical architecture guide

## Technologies Covered

- OpenCost
- Kubernetes
- Prometheus and PromQL
- kube-state-metrics
- Thanos
- Cortex
- Grafana Mimir
- Helm values YAML
- Multi-cluster showback and FinOps

## Sources Consulted

- [OpenCost: Multi-cluster with a single source of data](https://opencost.io/docs/installation/multi-cluster-single-source-of-data/)
- [OpenCost: Allocation API](https://opencost.io/docs/integrations/api/)
- [OpenCost: Cost allocation specification](https://opencost.io/docs/specification/)
- [OpenCost API OpenAPI specification](https://github.com/opencost/opencost/blob/develop/docs/swagger.json)
- [OpenCost Prometheus query implementation at reviewed commit 2fdd9877](https://github.com/opencost/opencost/blob/2fdd98776769fc51fdd4bdc02a5151f46a523a61/modules/prometheus-source/pkg/prom/metricsquerier.go)
- [Prometheus: Configuration, external labels, and remote-write relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: Storage and retention](https://prometheus.io/docs/prometheus/latest/storage/)
- [Thanos Querier: HA deduplication](https://thanos.io/tip/components/query.md/#deduplication)
- [Grafana Mimir: HA sample deduplication](https://grafana.com/docs/mimir/latest/configure/configure-high-availability-deduplication/)
- [kube-state-metrics: Node metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md)
- [Kubernetes: Labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes: Pod lifecycle and UID identity](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [RFC 3339: Date and Time on the Internet](https://datatracker.ietf.org/doc/html/rfc3339)

## Issues Found

- The workload key was shown as raw `+` concatenation, which is not an unambiguous composite-key representation. It was changed to a structured tuple so the four components remain distinct.
- HA deduplication was described as global query-layer behavior for every supported backend. The post now distinguishes Thanos query-time deduplication from Mimir's ingestion-time HA deduplication and tells readers to use the layer documented by their backend.
- The HA validation test implied that a Pod should have exactly one CPU and one memory series, which is not generally true for multi-container Pods. It now checks that each expected label set resolves to one logical series.
- The claim that duplicate HA series can double usage and eliminate idle was too broad. Current OpenCost CPU and memory allocation queries aggregate duplicate label sets with `avg` or `max`, while sum-based metrics can still be overcounted. The text now accurately states that undeduplicated replicas can overcount sum-based metrics and distort cost results.

## Review Notes

- The OpenCost environment-variable names, Helm values structure, `/allocation` endpoint, aggregation dimensions, RFC3339 window form, `step`, `resolution`, `includeIdle`, `shareIdle`, and `idleByNode` parameters match current official documentation.
- Prometheus applies external labels when communicating with external systems, and remote-write relabeling runs after external labels. When both time- and size-based retention are configured, the policy that triggers first controls deletion, as the post states.
- The `count by (cluster) (kube_node_info)` query is valid and `kube_node_info` is a stable kube-state-metrics metric. It is a useful spot check; the broader registry and metric-family completeness checks described elsewhere in the post remain necessary.
- No technology versions are pinned in the post. The review used documentation current on 2026-08-04 and OpenCost source commit `2fdd98776769fc51fdd4bdc02a5151f46a523a61` from 2026-07-30.
