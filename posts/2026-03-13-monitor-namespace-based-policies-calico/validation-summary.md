# Validation Summary: How to Monitor Calico Namespace-Based Policy Impact

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes (NetworkPolicy / Namespaces)
- Prometheus / PromQL
- Grafana
- kube-state-metrics
- Prometheus Operator (PrometheusRule CRD)
- AlertManager
- calicoctl, kubectl, jq
- Bash scripting
- Mermaid diagrams

## Sources Consulted
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico network policy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- kube-state-metrics namespace metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/namespace-metrics.md
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- PromQL documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- JSON spec (RFC 8259) for string escaping
- kubectl CLI reference: https://kubernetes.io/docs/reference/kubectl/
- calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/

## Issues Found
- **Invalid JSON in Step 3 (Grafana dashboard snippet)**: The `expr` value `count(kube_namespace_labels{label_environment!=""}) / count(kube_namespace_info) * 100` contained an unescaped pair of double quotes (`""`) inside a JSON string, which would prematurely terminate the string and make the JSON unparseable. Fixed by escaping the inner double quotes as `\"\"` per RFC 8259. The corresponding YAML block in Step 4 uses a literal block scalar (`|`) where YAML does not require quote escaping, so that snippet was left unchanged.

## Review Notes
- The PromQL queries use the correct kube-state-metrics label-prefixing convention (`label_<key>`) for namespace labels.
- The `unless` operator usage in Step 4 (`kube_namespace_info unless kube_namespace_labels{...}`) is the idiomatic way to find namespaces lacking a required label and is correct PromQL.
- The Felix/Calico metric names used in the examples (`felix_denied_packets_total`, `calico_flow_denials_total`, `felix_active_network_policies`) are illustrative; the post correctly notes that source-namespace categorization "requires flow logs + label enrichment". Exact metric naming in Calico depends on the version and whether `PrometheusMetricsEnabled` / denied-packet metrics are configured. Readers on newer Calico releases should consult `https://docs.tigera.io/calico/latest/reference/felix/prometheus` to confirm exact metric names for their deployment.
- The PrometheusRule `apiVersion: monitoring.coreos.com/v1` is current and correct for prometheus-operator.
- The bash audit script using `kubectl ... -o jsonpath` and `calicoctl get networkpolicies -n <ns>` is syntactically correct.
- The Mermaid `flowchart LR` syntax is valid.
