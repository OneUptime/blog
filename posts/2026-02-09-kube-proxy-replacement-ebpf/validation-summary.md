# Validation Summary: How to implement kube-proxy replacement with eBPF

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- kube-proxy
- kubeadm
- Cilium
- eBPF
- Helm
- Prometheus metrics

## Sources Consulted
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium command reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list/
- Cilium command reference for `cilium-dbg service list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list.html
- Cilium command reference for `cilium connectivity perf`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_perf/
- Kubernetes kubeadm init phase documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/

## Issues Found
- Removed obsolete or incorrect Cilium Helm values from install examples, including `hostServices.enabled`, `externalIPs.enabled`, `nodePort.enabled`, and `hostPort.enabled`. Current Cilium kube-proxy replacement enables the relevant service handling through `kubeProxyReplacement=true`, and hostPort support is automatic with kube-proxy replacement.
- Replaced invalid `kubeProxyReplacementMode` and misplaced `nodePort.acceleration` settings with current `loadBalancer.mode`, `loadBalancer.algorithm`, `loadBalancer.acceleration`, and `bpf.hostLegacyRouting` values.
- Replaced in-pod `cilium` debug commands with `cilium-dbg` commands, which are the documented commands for inspecting Cilium agent state and BPF maps inside Cilium pods.
- Corrected the migration cleanup flow by removing the unsafe `cilium cleanup -f` step for kube-proxy rule cleanup and adding deletion of the kube-proxy ConfigMap, matching Cilium's documented kube-proxy removal guidance.
- Corrected DSR instructions to include `routingMode=native` and `loadBalancer.dsrDispatch=opt`, and fixed the tcpdump explanation so the response source remains the service IP/port while returning directly from the backend path.
- Removed unsupported Cilium-specific session affinity annotations and kept the Kubernetes-native `sessionAffinity: ClientIP` configuration.
- Replaced the invalid ServiceMonitor manifest with the documented Cilium Helm settings for Prometheus and ServiceMonitor creation.
- Replaced a broken Cilium netperf manifest URL and mismatched `netperf-client` commands with the supported `cilium connectivity perf` command.
- Replaced the broken upstream kube-proxy raw GitHub URL with the documented `kubeadm init phase addon kube-proxy` command.
- Qualified broad performance and conntrack claims so they are not presented as universal guarantees.

## Review Notes
The post remains version-sensitive because Cilium Helm values and CLI output can change between releases. Pinning the Cilium chart version in the installation commands would make the tutorial more reproducible in the future.
