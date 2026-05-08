# Validation Summary: Preventing 32-Process Performance Degradation in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus and PromQL
- Pushgateway
- Flux HelmRelease
- iperf3
- Linux networking tools and sysctl

## Sources Consulted
- Cilium v1.14 Helm chart values: https://github.com/cilium/cilium/blob/v1.14.17/install/kubernetes/cilium/values.yaml
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium eBPF Maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Monitoring and Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway

## Issues Found
- The Cilium Helm install example used `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`, which are cilium-agent flag-derived names rather than valid Helm values in the Cilium v1.14 chart. Changed them to `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The kube-proxy replacement install example omitted `k8sServiceHost` and `k8sServicePort`, which Cilium documents as required when kube-proxy is not providing access to the Kubernetes service. Added `API_SERVER_IP` and `API_SERVER_PORT` placeholders and passed them to Helm.
- The CronJob used `networkstatic/iperf3` while also requiring `jq` and `curl`. Changed the image to `alpine:3.20` and installed `iperf3`, `jq`, and `curl` in the command before running the benchmark.
- The `ScalingEfficiencyDegraded` PromQL expression divided two vectors with different `processes` label values, so the default vector matching would not return a result. Added `ignoring(processes)` to match the 32-process and 1-process series.
- The node guardrail DaemonSet used `busybox:1.36` but called `ethtool`, which BusyBox does not provide. Changed the image to `alpine:3.20` and installed `ethtool` before applying NIC queue settings.
- The Cilium install example used the deprecated `tunnel=disabled` value. Removed it because `routingMode=native` is the current Helm value for native routing mode.

## Review Notes
The Helm example assumes the underlying network supports native routing and that the selected devices support native XDP when `loadBalancer.acceleration=native` is enabled. Operators should validate those environment-specific prerequisites before applying the example unchanged.
