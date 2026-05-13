# Validation Summary: How to Monitor Calico Blocking kube-dns

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- CoreDNS / kube-dns
- Calico network policy
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- BusyBox DNS probing

## Sources Consulted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- Calico network policy documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico service rules for Kubernetes DNS: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator CRD status and API version notes: https://github.com/prometheus-operator/prometheus-operator
- PrometheusRule API reference: https://docs.okd.io/latest/rest_api/monitoring_apis/prometheusrule-monitoring-coreos-com-v1.html

## Issues Found
- The diagnosis command execed `wget` inside the CoreDNS pod. This is not portable because CoreDNS containers should not be assumed to include shell debugging tools. Changed the example to use `kubectl port-forward` to the selected CoreDNS pod and run `curl` from the operator workstation.
- The post described a "Multi-namespace DNS probe DaemonSet", but the manifest created a DaemonSet only in `kube-system`. Kubernetes workloads are namespace-scoped, so that did not probe multiple namespaces. Changed the example to a DNS probe Deployment that is applied in each monitored namespace.
- The PromQL expression used `rate(coredns_dns_requests_total[5m]) == 0`, which evaluates per time series and can alert when an individual request-label series has no traffic while CoreDNS is still serving other requests. Changed it to `sum(rate(coredns_dns_requests_total[5m])) == 0`.
- The explanation said DNS fails for every namespace and CoreDNS request rate drops to zero when blocked. That is only true for a cluster-wide DNS access block, not every Calico policy issue. Reworded those claims to distinguish cluster-wide blocking from partial namespace-specific failures.

## Review Notes
The examples are technically valid, but production deployments should tune probe namespaces, alert labels, scrape job names, and thresholds to match the cluster's Prometheus configuration and normal DNS traffic patterns.
