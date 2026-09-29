# Validation Summary: How to Alert on Missing Metrics While Respecting Intentional Scale-to-Zero

## Status
validated

## Post Type
Technical guide with PromQL examples and illustrative metric exposition.

## Technologies Covered
- Prometheus and PromQL
- Prometheus alerting rules and scrape relabeling
- Kubernetes workloads and Horizontal Pod Autoscaling
- kube-state-metrics

## Sources Consulted
- Prometheus operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics, range selectors and staleness: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus scrape configuration and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus metric exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- kube-state-metrics Deployment metrics: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics StatefulSet metrics: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/statefulset-metrics.md
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Lookback timing was stated too generally.** A five-minute range delays absence detection only while a previous sample remains in that range. When a workload becomes expected with no recent samples, the expression matches immediately. Clarified the distinction and the approximate ten-minute total when a five-minute `for` follows the expiry of previously observed telemetry.
2. **Inventory exporter labels could leak into alert identity.** Set matching with `on` selects matching labels but preserves the left-hand series labels. Added workload-level `max by` aggregation to both inventory operands so exporter instance or pod labels do not create changing alert identities.
3. **The monitoring-enabled inventory dependency was omitted from failure coverage.** Losing this series also suppresses the main expression. Extended the existing inventory-health guidance to cover it and clarified that instant selectors stop returning missing series according to staleness and lookback behavior.

## Review Notes
- Reviewed both PromQL expressions against documented syntax and semantics. The comparison operators filter without `bool`; `unless` removes workloads with matching recent presence. Zero desired replicas and disabled monitoring therefore produce no missing-telemetry result.
- `present_over_time` counts stored zero samples as presence. The post correctly distinguishes existence from Boolean health. One observed pod can satisfy workload-level presence; separate capacity and critical-metric checks remain necessary.
- The cluster-wide `absent_over_time` example cannot detect an individual missing inventory entry while others remain. The independent-catalog guidance is correct.
- The custom metric names and exposition samples are valid illustrative contracts. kube-state-metrics documents desired replicas as `kube_deployment_spec_replicas` and `kube_statefulset_replicas`, with separate ready-replica metrics.
- If workload kinds can share names, include `kind` consistently in metric identity, every aggregation and every matching clause, as the post advises.
- Inventory aggregation assumes authoritative, consistent observations. Conflicting duplicate exporters require a defined source-selection policy; taking the maximum conservatively retains positive intent.
- The explicit startup budget still needs implementation in the deployed alert rule. The article supplies an expression, not a complete rule configuration. A workload-level `for` can provide a finite pending period when no samples exist, provided the condition and labels remain stable.
- Official Kubernetes documentation supports the discussion of missing metrics, readiness and utilization in HPA decisions. The post does not claim ordinary CPU-based HPA necessarily supports activation from zero. Demand alerts remain necessary for a scaler that fails to activate a workload.
- Technical reference links resolve to the intended official documentation. No version is pinned and no deprecated constructs were identified in the examples.
- Validation was documentation-based; `promtool` was unavailable locally, and no live Kubernetes or Prometheus integration test was run. There are no terminal commands or complete configuration files in the post.
