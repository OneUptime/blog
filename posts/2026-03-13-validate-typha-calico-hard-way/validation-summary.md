# Validation Summary: How to Validate Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Calico Felix
- Kubernetes
- Kubernetes NetworkPolicy
- Kubernetes API server metrics
- Prometheus metrics
- kubectl

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes API server metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes node debugging with kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The introduction said TLS or service-name mistakes cause Felix to fall back to direct API server connections. Calico documents Typha as an explicit Felix connection target, so I changed this to say those mistakes can prevent Felix from using Typha correctly.
- The post implied active Typha connections should equal node count for a single Typha pod. In a replicated Typha deployment, connections are spread across Typha pods, so I changed this to compare the aggregate active or streaming connection count across Typha pods with the number of Felix instances.
- The metrics example assumed Typha metrics are always on port `9093`. Calico documents `9091` as Typha's default metrics port, with `9093` used by some installation paths, so I changed the command to read `TYPHA_PROMETHEUSMETRICSPORT` and fall back to `9091`.
- The post listed `typha_updates_sent`, which is not in the current Calico Typha metrics reference. I replaced it with documented metrics: `typha_updates_total`, `typha_updates_skipped`, and `typha_connections_streaming`.
- The policy propagation step relied on a Typha log line containing `NetworkPolicy` and on `iptables -L | grep cali`. Those checks are not reliable evidence of a specific policy update, and Calico rule names are implementation-specific. I changed the validation to use Typha update metrics, Felix policy/dataplane logs, and made node iptables inspection an optional iptables-dataplane check.
- The API server connection-count step used `apiserver_watch_events_total` and said it would show Typha pod IPs. Kubernetes documents that metric as a counter of watch events with resource labels, not client IPs. I changed the check to use `apiserver_longrunning_requests` for active `WATCH` requests and clarified that API server metrics provide only a coarse signal.
- The TLS validation text said to look for successful TLS handshake messages. Calico logs are not guaranteed to emit a positive handshake line, so I changed the guidance to look for rejected TLS or authentication messages.

## Review Notes
- The post assumes Calico is running in the `calico-system` namespace. Manifest-based or older hard-way installs may use `kube-system`; operators should adjust the namespace if their installation differs.
- Typha Prometheus metrics must be enabled before the metrics commands return Typha-specific series.
- The optional node debug command may require sufficient RBAC and, on some Kubernetes versions or cluster policies, an elevated debug profile to inspect host networking state.
