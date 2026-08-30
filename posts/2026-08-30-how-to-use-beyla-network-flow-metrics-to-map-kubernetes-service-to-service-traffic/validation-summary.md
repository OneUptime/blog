# Validation Summary: How to Map Kubernetes Service Traffic with Beyla Network Flows

## Status

validated

## Post Type

Technical tutorial and configuration guide

## Technologies Covered

- Grafana Beyla network observability
- eBPF socket filters and Linux Traffic Control
- Kubernetes metadata, RBAC, Services, and DNS
- Prometheus and PromQL
- OpenTelemetry metrics
- Grafana Node graph visualization

## Sources Consulted

- [Beyla network metrics](https://grafana.com/docs/beyla/latest/network/)
- [Beyla network metrics quickstart](https://grafana.com/docs/beyla/latest/network/quickstart/)
- [Beyla network configuration reference](https://grafana.com/docs/beyla/latest/network/config/)
- [Beyla Prometheus and OpenTelemetry export configuration](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Beyla metric and trace attribute configuration](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Beyla exported metrics reference](https://grafana.com/docs/beyla/latest/metrics/)
- [Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Beyla v3.33.0 source: deprecated `network.enable`](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/obi/network_cfg.go#L65-L72)
- [Beyla v3.33.0 source: deprecated exporter-local Prometheus features](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/export/prom/prom.go#L104-L115)
- [Beyla v3.33.0 source: replacement global metrics features](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/export/otel/perapp/decfg.go#L12-L19)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)
- [Grafana Node graph data requirements](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes `kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)

## Issues Found

- The configuration used the deprecated `network.enable` and exporter-local `prometheus_export.features` fields. Replaced both with the current top-level `metrics.features: ["network"]` setting and updated the explanation of pipeline and endpoint enablement.
- The RBAC wording incorrectly attached `list` and `watch` permissions directly to a ServiceAccount. Clarified that the ServiceAccount must be bound to a ClusterRole granting those verbs for ReplicaSets, Pods, Services, and Nodes.
- Both PromQL aggregations discarded `k8s_cluster_name`, which could merge identically named workloads from multiple clusters despite configuring a cluster name. Preserved the cluster label in both groupings and added an explicit cluster matcher to the single-workload query.
- The CIDR attribute-selection example also dropped `k8s.cluster.name`. Added it so the alternate configuration retains cross-cluster separation.
- The cardinality warning named Pod UID even though Beyla does not expose a source or destination Pod UID on the network-flow metric. Replaced it with supported `k8s.src.name`, `k8s.dst.name`, `src.port`, and `dst.port` attributes and distinguished rollout cardinality from per-connection cardinality.
- The Grafana Node graph wording implied that the query table could be rendered directly. Clarified that Node graph requires an edge data frame with unique `id`, `source`, and `target` fields, and noted the owner-type attribute needed when Kubernetes owner kinds reuse a name.
- The post recommended splitting TCP and UDP without noting that `transport` is hidden by default under the explicit attribute selection. Added the required attribute-selection caveat and the alternative `network.protocols` collection filter.
- The CIDR prose treated `0.0.0.0/0` as an external-traffic bucket. Clarified that it covers all otherwise-unmatched IPv4 traffic and that `::/0` is required separately for IPv6.
- The validation command hard-coded the configurable `cluster.local` cluster domain. Replaced the FQDN with the same-namespace Service name `checkout`, while retaining the valid `kubectl exec deploy/frontend --` syntax.
- The validation and sampling descriptions were too absolute. Noted that response bytes can increase the reverse flow edge and that sampled byte counts are not exact traffic totals or billing data.

## Review Notes

- Reviewed against the current Beyla v3.33.x documentation and the v3.33.0 released source. Some published examples still show compatibility fields that the released source marks deprecated; the post now uses the non-deprecated top-level metrics configuration.
- The documented socket-filter and TC capability sets, DaemonSet and `hostNetwork` requirements, metadata behavior, metric names, Prometheus label normalization, `rate()` usage, Cilium compatibility, narrowest-CIDR selection, and `meta_restrict_local_node` caveat were verified as correct.
- The `kubectl exec` example assumes the selected frontend container includes `curl`.
- All five links in the post's Official Documentation section returned HTTP 200 during review.
