# Validation Summary: Fix Kubernetes Pod DNS Resolution Failures from CoreDNS Configuration Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes DNS
- CoreDNS and CoreDNS plugins
- kubectl
- NodeLocal DNSCache
- Prometheus Operator
- Prometheus alerting rules
- BusyBox shell and nslookup

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Customizing DNS Service / CoreDNS ConfigMap: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes NodeLocal DNSCache: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- CoreDNS prometheus plugin: https://coredns.io/plugins/metrics
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Kubernetes NodeLocal DNSCache manifest source: https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml

## Issues Found
- Replaced the `kubectl get endpoints` validation command with an EndpointSlice query. Kubernetes DNS and CoreDNS now watch EndpointSlices, so EndpointSlice is the current API to inspect for service-backed DNS records.
- Corrected the CoreDNS `forward` plugin `expire` comment. It expires cached upstream connections; it is not a DNS response wait timeout.
- Fixed the `autopath` example to use `pods verified` and to show `autopath` inside the same CoreDNS server block as the Kubernetes plugin, matching CoreDNS requirements.
- Added the missing NodeLocal DNSCache `ServiceAccount` and `NET_ADMIN` capability in the DaemonSet example, and clarified that placeholders must be replaced before applying the manifest.
- Corrected `ServiceMonitor` from `apiVersion: v1` to `apiVersion: monitoring.coreos.com/v1` and noted that it applies when Prometheus Operator is installed.
- Replaced the alerting ConfigMap with a Prometheus Operator `PrometheusRule`, and fixed the error-rate expression to compare a SERVFAIL ratio against 5% rather than comparing raw SERVFAILs per second.
- Fixed the P99 latency alert query to aggregate histogram buckets by `le` before calling `histogram_quantile`.
- Changed the DNS test script shebang from `#!/bin/bash` to `#!/bin/sh` because the examples use BusyBox.
- Added the missing `dns-test-scripts` ConfigMap for the CronJob example so the referenced `/scripts/test-dns.sh` file exists.

## Review Notes
kubectl was not installed in the local environment, so CLI command validation was performed against the official generated Kubernetes kubectl reference instead of local `--help` output. Some examples, especially NodeLocal DNSCache and Prometheus Operator monitoring, still require environment-specific values such as cluster DNS IPs, Prometheus selectors, and substituted placeholders before they can be applied directly.
