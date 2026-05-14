# Validation Summary: Cilium kube-proxy Replacement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes Services
- kube-proxy
- eBPF
- Helm
- iptables
- Socket-level load balancing

## Sources Consulted
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Kubernetes Virtual IPs and Service Proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/

## Issues Found
- The introduction said kube-proxy only programs iptables or IPVS rules and that iptables updates require a full rule reload. Updated this to include nftables and to avoid the outdated full-reload claim, since recent Kubernetes iptables mode performs more targeted updates.
- The existing-cluster kube-proxy removal commands used an incorrect in-pod `cilium-iptables-save` / `cilium-iptables-restore` cleanup pipeline. Replaced it with Cilium's documented procedure: delete the kube-proxy DaemonSet and ConfigMap, enable kube-proxy replacement with the required API server Helm values, then run `iptables-save | grep -v KUBE | iptables-restore` on each node.
- The verification commands used `cilium status`, `cilium service list`, and `cilium bpf lb list` directly. Updated them to the documented in-pod `cilium-dbg` commands via `kubectl -n kube-system exec ds/cilium -- ...`.
- The service connectivity test tried to read a NodePort from a default ClusterIP Service. Updated the service creation command to use `--type=NodePort`.
- The ClusterIP test referenced a `test-pod` that was never created. Added a `kubectl run` command to create a curl client pod.
- The socket load-balancing verification attempted to grep socket entries from `cilium bpf lb list --frontend`, which is not the documented verification path. Replaced it with `cilium-dbg status --verbose` and `cilium-dbg monitor -v -t trace-sock`.
- The conclusion overstated the scaling and network-hop impact of socket-level load balancing. Reworded it to accurately describe eBPF map lookup efficiency and translation before lower-layer packet processing.
- The Helm install example assumed the Cilium Helm repository already existed. Added `helm repo add cilium https://helm.cilium.io/` and `helm repo update`.

## Review Notes
The guide is now technically consistent with the current Cilium stable documentation. For production migrations, Cilium's documented warnings still apply: removing kube-proxy can disrupt existing service connections, and gradual node-by-node rollout may be preferable for live clusters.
