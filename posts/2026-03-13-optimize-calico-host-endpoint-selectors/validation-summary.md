# Validation Summary: Optimize Calico Host Endpoint Selectors

## Status
validated

## Post Type
Tutorial / Optimization guide

## Technologies Covered
- Calico (Felix agent, GlobalNetworkPolicy, HostEndpoint, selector language)
- Kubernetes (kubectl, node labels, DaemonSets)
- Prometheus (metrics, alerting rules)
- calicoctl
- Linux kernel IP sets
- YAML / Python (audit script)
- Mermaid (diagrams)

## Sources Consulted
- Calico documentation on selectors and policy: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Felix configuration reference (PrometheusMetricsPort default 9091): https://docs.tigera.io/calico/latest/reference/felix/configuration
- Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Prometheus alerting rules syntax: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- kubectl label reference (multi-resource labeling): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#label

## Issues Found
No technical issues found.

## Review Notes
- The Prometheus alert expression `felix_calc_graph_update_time_seconds > 1.0` is syntactically valid Prometheus, but `felix_calc_graph_update_time_seconds` is exposed as a Summary metric in Felix, so the bare metric name resolves to multiple time series labeled by `quantile` (e.g., `0.5`, `0.9`, `0.99`). The alert would therefore fire if any quantile exceeds 1.0. This is a working alert but a more precise expression would explicitly select a quantile (e.g., `felix_calc_graph_update_time_seconds{quantile="0.99"} > 1.0`). Left as-is since it is not technically incorrect.
- The alert's `summary` annotation references `{{ $labels.node }}`, but Prometheus typically attaches `instance` (and possibly `pod`) labels to scraped Felix metrics rather than a `node` label, unless relabeling is configured upstream. Not strictly wrong, since label availability depends on the user's scrape config / kube-prometheus-stack relabeling, but readers should adjust to the labels their setup actually exposes.
- The audit script assumes `calicoctl get globalnetworkpolicies -o yaml` produces a `List`-kind document with an `items` field. Modern calicoctl versions do produce this format, so the parser works. The `yaml.safe_load_all` defensiveness also handles the multi-document case gracefully (any non-List document simply contributes zero items).
- The `calico-system` namespace is the convention for Tigera-operator installs; manifest-based installs historically used `kube-system`. Readers on legacy installs may need to adjust the namespace in the `kubectl exec` command.
- The HostEndpoint terminology in the title is accurate: GlobalNetworkPolicies with a `selector` that matches HostEndpoint labels are the standard way to apply host endpoint policies, and the optimization advice applies directly to that selector evaluation path inside Felix.
