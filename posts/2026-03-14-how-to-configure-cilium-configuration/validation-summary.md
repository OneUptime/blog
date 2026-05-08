# Validation Summary: Configuring Cilium for Kubernetes: A Complete Configuration Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Cilium IPAM
- Cilium routing modes
- Hubble
- Prometheus ServiceMonitor
- WireGuard encryption
- eBPF / BPF map configuration

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium installation using Helm: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium routing concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium bandwidth manager documentation: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium connectivity testing documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e/

## Issues Found
- The post used older `tunnel: disabled` and `tunnel: vxlan` Helm values. Current Cilium Helm values document `routingMode: native` for native routing, and `routingMode: tunnel` with `tunnelProtocol: vxlan` for VXLAN tunneling. Updated both the production and network mode examples.
- The prerequisites listed Kubernetes `v1.25+`, which is not accurate for current stable Cilium documentation. Replaced it with guidance to use a Kubernetes version supported by the selected Cilium release.
- The Helm install commands did not pin a Cilium chart version, making the examples ambiguous. Added `--version 1.19.3`, matching the current stable Cilium documentation consulted during review.
- The production values enabled Hubble metrics but only configured the Cilium agent ServiceMonitor. Added `hubble.metrics.serviceMonitor.enabled: true` so Prometheus Operator can discover Hubble metrics as intended.
- The native routing example omitted an important routing requirement. Added a short note that native routing requires pod CIDR routing between nodes and that `autoDirectNodeRoutes` is for nodes on the same L2 segment.
- The troubleshooting section advised enabling `bpf.preallocateMaps` for high memory usage, but Cilium documents that this increases memory usage. Updated the note to recommend tuning map sizes and disabling `bpf.preallocateMaps` when lower allocation latency is not needed.

## Review Notes
The remaining Helm keys and commands reviewed are consistent with current Cilium documentation. `prometheus.serviceMonitor.enabled` requires Prometheus Operator ServiceMonitor CRDs to exist, and `10.0.0.0/8` must not overlap with node or service networks in a real cluster.
