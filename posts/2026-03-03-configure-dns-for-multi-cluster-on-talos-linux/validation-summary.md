# Validation Summary: How to Configure DNS for Multi-Cluster on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration)
- Kubernetes
- CoreDNS (kubernetes, forward, etcd, health, prometheus plugins)
- ExternalDNS (Cloudflare provider)
- etcd (as a shared DNS backend / skydns layout)
- Kubernetes Multi-Cluster Services (MCS) API (`multicluster.x-k8s.io/v1alpha1`)
- Cilium ClusterMesh
- Submariner (mentioned)
- Prometheus / PrometheusRule (kube-prometheus-stack CRD)
- WireGuard / IPsec / VPC peering / Istio / Linkerd (mentioned at a high level)

## Sources Consulted
- CoreDNS health plugin: https://coredns.io/plugins/health/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/
- CoreDNS etcd plugin: https://coredns.io/plugins/etcd/
- Talos v1alpha1 configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Cilium ClusterMesh documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Kubernetes MCS API KEP-1645 (`multicluster.x-k8s.io/v1alpha1`, ServiceExport / ServiceImport, `clusterset.local`)
- ExternalDNS Helm chart values reference

## Issues Found
1. **Invalid CoreDNS `health` plugin sub-option `lazystart`.** The health plugin only supports `lameduck DURATION`; there is no `lazystart` directive. Replaced `lazystart` with `lameduck 5s`, which is the conventional value used to give CoreDNS time to gracefully shed traffic on shutdown.
2. **Invalid IPv4 address `10.300.0.10`.** The third octet `300` exceeds the maximum value of 255, so this is not a routable IPv4 address. Replaced with `10.30.0.10` so the forward target is a syntactically valid address.
3. **PrometheusRule regex referenced the invalid `10.300.*` range.** Updated `to=~"10\\.(200|300).*"` to `to=~"10\\.(200|30).*"` so the alert matches the corrected forward target IP.

## Review Notes
- The CoreDNS `forward` plugin's response metric was renamed in newer CoreDNS releases. `coredns_forward_responses_total{rcode,to}` is the historically documented name and still appears on many running deployments, but recent CoreDNS versions expose proxy-level metrics (e.g. `coredns_proxy_request_duration_seconds_count{proxy_name="forward",...}`). Operators on CoreDNS 1.11+ may need to adapt the alert expression to the current metric name.
- The example Talos machine config uses `cluster.clusterName` and `cluster.network.dnsDomain`, which are both valid v1alpha1 fields.
- The MCS API group/version (`multicluster.x-k8s.io/v1alpha1`) and the canonical `clusterset.local` zone match the upstream KEP and current Cilium/Submariner implementations.
- The Cilium commands (`cilium install --cluster-name --cluster-id`, `cilium clustermesh enable`, `cilium clustermesh connect --destination-context`) are all valid Cilium CLI subcommands.
- The etcd image `quay.io/coreos/etcd:v3.5.12` is a real, published tag and is appropriate for the StatefulSet example.
- The `services.example.com` and `cluster-*.local` domains are example/documentation names and don't need to resolve; this is consistent with the educational intent of the post.
