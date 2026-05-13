# Validation Summary: How to Monitor Service IP Advertisement with Calico

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Calico (BGP service advertisement, Felix metrics)
- Kubernetes (Services, ExternalTrafficPolicy)
- BIRD / birdcl (BGP daemon CLI)
- Prometheus Operator (PrometheusRule, Probe CRDs)
- kube-state-metrics
- Blackbox Exporter
- Grafana
- Mermaid (diagram syntax)

## Sources Consulted
- Calico Felix Prometheus metrics documentation (https://docs.tigera.io/calico/latest/operations/monitor/metrics)
- Calico service advertisement docs (https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips)
- Prometheus Operator API reference for `Probe` and `PrometheusRule` CRDs (https://prometheus-operator.dev/docs/api-reference/api/)
- kube-state-metrics endpoint metrics documentation (https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpoint-metrics.md) — confirms `kube_endpoint_address_available` with `namespace` and `endpoint` labels
- BIRD documentation for `birdcl show route` command
- Cross-referenced sibling validated post `2026-03-13-monitor-bgp-peer-not-established-calico` for consistent Felix BGP metric naming conventions

## Issues Found

1. **Inconsistent Felix BGP metric naming**: The alert expression mixed a versioned metric (`felix_bgp_num_established_v4`) with an unversioned one (`felix_bgp_num_not_established`). Felix exposes BGP peer counters with explicit IP-version suffixes (`_v4` and `_v6`) — `felix_bgp_num_not_established` without a suffix is not a valid metric name. Fixed by renaming to `felix_bgp_num_not_established_v4` to match the established metric and ensure the alert can evaluate.

## Review Notes
- The post uses the operator-install namespace `calico-system` for the `kubectl exec ... birdcl` example. Manifest-install clusters use `kube-system` instead; readers on that install path will need to adjust the namespace.
- The Felix BGP metrics (`felix_bgp_num_established_v4`/`_v6`, `felix_bgp_num_not_established_v4`/`_v6`) require `prometheusMetricsEnabled: true` on the FelixConfiguration. The post's prerequisites mention "Calico with Felix metrics enabled" which covers this, but readers may want to verify with `kubectl get felixconfiguration default -o yaml`.
- The `Probe` CRD accepts URL-form static targets (e.g. `http://192.168.100.10:80`); some examples in the wild use plain `host:port`. Both are valid with the `http_2xx` blackbox module — keeping as-is.
- The mermaid `\n` line-break syntax inside node labels is supported by current Mermaid renderers.
- The grep pattern `"192.168.100"` in the route-counting example is a worked example tied to a hypothetical service CIDR; readers will need to replace it with their actual external/service IP prefix.
