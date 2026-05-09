# Validation Summary: How to Troubleshoot Calico eBPF Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico eBPF data plane
- Tigera Operator
- Kubernetes
- kubectl
- Linux eBPF / BPF filesystem

## Sources Consulted
- Calico Open Source 3.32 Install in eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source 3.32 Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source 3.32 Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Open Source 3.32 Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The introduction listed `hostPorts enabled` as a Calico eBPF installation configuration error. Current Calico installation API documentation treats `hostPorts` as a valid Calico CNI setting, so the example was removed and replaced with the more accurate `wrong API server endpoint`.
- The API server ConfigMap troubleshooting only checked and patched `KUBERNETES_SERVICE_HOST`. Calico's eBPF installation documentation requires both `KUBERNETES_SERVICE_HOST` and `KUBERNETES_SERVICE_PORT`, so the commands now verify and patch both fields.
- The service-reachability fix advised using the endpoint IP as the control plane IP. Calico's documentation requires a stable API server address and recommends using the load balancer address for HA clusters, so the text now warns against using an individual endpoint IP in HA clusters and limits the endpoint-derived example to single-control-plane clusters.

## Review Notes
The diagnostic commands are generally aligned with Calico and Kubernetes troubleshooting guidance. Current Calico versions also support `bpfNetworkBootstrap` for operator-managed automatic API server configuration, so some newer installations may not rely on manually maintaining the `kubernetes-services-endpoint` ConfigMap.
