# Validation Summary: How to Monitor Health Checks Failing After Enabling Calico Policies

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes NetworkPolicy, pods, probes, and events
- kube-state-metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- kubectl
- Grafana

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator project documentation for stable `monitoring.coreos.com/v1` CRDs: https://github.com/prometheus-operator/prometheus-operator
- PrometheusRule API reference: https://docs.okd.io/4.14/rest_api/monitoring_apis/prometheusrule-monitoring-coreos-com-v1.html
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico host endpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint

## Issues Found
- The post claimed that a NetworkPolicy change can block kubelet probe traffic. Standard Kubernetes NetworkPolicy always allows traffic to and from the node where the pod is running, and Calico documents that host-to-local-workload traffic is always allowed so kubelet liveness and readiness probes work. I changed the wording to explain that policy changes can still cause readiness failures by blocking dependencies, peer traffic, external health checks, or by involving host-level policy, but not by ordinary workload policy blocking kubelet-to-local-pod traffic.
- The description mentioned "probe failure counters," but the post uses Kubernetes events rather than a probe failure counter metric. I changed this to "probe failure events."
- The diagnosis command `grep "0/"` only matched pods with zero ready containers and missed partially ready pods such as `1/2`. I replaced it with an `awk` command that compares the ready and total container counts.
- The `MultiplePodsNotReady` PromQL expression counted all `condition="false"` series, including inactive zero-valued samples. I added `== 1` so the alert counts only pods whose current ready condition is false.
- The restart spike alert evaluated per container but annotated only namespace and pod. I wrapped the expression in `sum by (namespace, pod)` so multi-container pod restarts are aggregated consistently with the alert summary.
- The alert description and conclusion overstated policy causality. I adjusted them to describe a policy-related readiness regression as a useful investigation signal instead of a definitive probe block.

## Review Notes
- The `PrometheusRule` manifest uses the current stable `monitoring.coreos.com/v1` API shape.
- The `kubectl get events --field-selector reason=Unhealthy` command uses a supported Event field selector. The newer `kubectl events` command is also available in current Kubernetes, but the existing `kubectl get events` form remains valid.
- The examples assume kube-state-metrics is installed and scraped by Prometheus, and that Prometheus Operator is configured to select `PrometheusRule` resources from the `monitoring` namespace.
