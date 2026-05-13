# Validation Summary: How to Operationalize Calico Metrics Visualization

## Status
validated

## Post Type
Operational guide / Process playbook (with embedded PromQL and Mermaid examples)

## Technologies Covered
- Calico (Kubernetes networking / Felix / IPAM)
- Kubernetes
- Grafana dashboards
- Prometheus / PromQL (predict_linear, subqueries)
- Mermaid diagrams (flowchart syntax)
- GitOps (ConfigMap-based dashboard delivery)

## Sources Consulted
- Prometheus query documentation — `predict_linear` function: https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear
- Prometheus query documentation — subqueries: https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery
- Calico Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus and https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Mermaid flowchart syntax (multi-source edges with `&`): https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

The post is largely process / workflow guidance (daily health check checklist, on-call routing, dashboard change governance), and the embedded technical artifacts are syntactically and semantically correct:

- `predict_linear(sum(ipam_allocations_per_node)[7d:1h], 7 * 24 * 3600)` is valid PromQL — `predict_linear` expects a range vector and a scalar offset in seconds, and `[7d:1h]` is a valid subquery producing the required range vector. The metric name is illustrative; Calico-exposed metric names vary by component (Felix typically prefixes with `felix_`), but using a generic name here is acceptable for example purposes.
- The Mermaid flowchart uses valid `TD` direction, valid decision-node `{...}` syntax, valid edge labels `-->|Felix|`, and valid multi-source-to-single-target syntax `D & E & F --> G`.

## Review Notes
- The PromQL example uses `ipam_allocations_per_node` as an illustrative metric name. In a real Calico deployment scraping Felix's `/metrics` endpoint, the IPAM-related series are typically exposed under the `felix_` prefix (e.g. `felix_ipam_*`), and `kube-controllers` exposes additional pool-level series. Readers should substitute the actual metric names available in their cluster. This is not an error in the post — the example is clearly illustrative — but a reader copy-pasting the query verbatim would need to adapt the metric name.
- The 500ms p99 latency threshold and 80%/85% IP-pool thresholds are reasonable operational defaults but are environment-dependent; the post correctly frames them as escalation criteria rather than absolute SLOs.
