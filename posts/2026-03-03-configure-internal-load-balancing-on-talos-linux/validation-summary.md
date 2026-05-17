# Validation Summary: How to Configure Internal Load Balancing on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config: `cluster.proxy`)
- Kubernetes Services (ClusterIP, sessionAffinity, internalTrafficPolicy)
- kube-proxy (iptables and IPVS modes)
- Linux IPVS (IP Virtual Server)
- Topology-Aware Routing (`service.kubernetes.io/topology-mode`)
- Cilium (eBPF kube-proxy replacement)
- Prometheus / PrometheusRule (kube-proxy metrics and alerts)
- Istio (DestinationRule, traffic policy)
- wrk (HTTP benchmarking)

## Sources Consulted
- Talos Linux machine config reference (cluster.proxy): https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes Service docs (sessionAffinity, internalTrafficPolicy): https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Topology Aware Routing: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes Service Internal Traffic Policy: https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/
- kube-proxy reference (modes, IPVS scheduler flags, metrics): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Linux IPVS scheduling algorithms (kernel docs / man ipvsadm)
- Cilium kube-proxy replacement docs (kubeProxyReplacement value type): https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium CLI (`cilium status`, `cilium service list`, `cilium bpf lb list`): https://docs.cilium.io/en/stable/cmdref/
- Istio DestinationRule (loadBalancer simple values, outlierDetection): https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found
No technical issues found. Spot-checked items:
- Talos `cluster.proxy` fields (`mode`, `extraArgs`, `disabled`) match the v1alpha1 schema.
- Default kube-proxy mode on Linux is `iptables`; "empty mode means iptables" is correct.
- IPVS schedulers `rr`, `lc`, `sh`, `wrr` are all valid values for `--ipvs-scheduler`.
- `sessionAffinity: ClientIP` and `sessionAffinityConfig.clientIP.timeoutSeconds` are the correct Service spec fields.
- `service.kubernetes.io/topology-mode: Auto` is the current annotation (replaces the older `topology-aware-hints` annotation as of Kubernetes 1.27).
- `internalTrafficPolicy: Local` reached GA in Kubernetes 1.26 — the "Starting with Kubernetes 1.26" framing is accurate for stable availability.
- Cilium Helm `kubeProxyReplacement=true` (boolean) is the correct format for Cilium 1.14+; older `"strict"` string was deprecated.
- kube-proxy metrics endpoint defaults to port 10249; metric names `kubeproxy_sync_proxy_rules_duration_seconds`, `kubeproxy_sync_proxy_rules_service_changes_total`, `kubeproxy_sync_proxy_rules_endpoint_changes_total`, and `kubeproxy_sync_proxy_rules_last_timestamp_seconds` are real.
- Istio `loadBalancer.simple: LEAST_REQUEST` is the current enum value (renamed from `LEAST_CONN`).

## Review Notes
- The `KubeProxyEndpointSlicesNotSyncing` alert design is logically odd: in a stable cluster with no pod/endpoint churn, `rate(kubeproxy_sync_proxy_rules_endpoint_changes_total[5m]) == 0` is the normal state, so the alert could fire under healthy conditions. The PromQL syntax and metric names are valid, so it is not a technical error — but operators may want to base "stale sync" detection on `kubeproxy_sync_proxy_rules_last_timestamp_seconds` lag instead.
- The "switch to IPVS at hundreds of services" guidance is on the aggressive side — the commonly cited crossover is in the low thousands of services / tens of thousands of endpoints. Not incorrect, just conservative.
- `ipvsadm` is present in the upstream kube-proxy image, so the `kubectl exec ... -- ipvsadm -L -n` command works against the standard kube-proxy DaemonSet.
- The Talos `mode: iptables` example uses the documented default; with newer Kubernetes (1.31+) there is also an `nftables` mode that the post does not mention, but omitting it is not an error.
