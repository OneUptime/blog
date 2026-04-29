# Validation Summary: How to Configure kube-proxy for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kube-proxy
- IPv6
- Dual-stack Services
- iptables / ip6tables
- IPVS
- `kubectl`
- YAML configuration

## Sources Consulted
- Kubernetes: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes: kube-proxy Configuration (v1alpha1) - https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes: Debug Services - https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes: `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: `kube-proxy` component reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes: Feature Gates (removed) - https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/

## Issues Found
- The dual-stack config example enabled the `IPv6DualStack` feature gate. That gate was removed after dual-stack graduated to GA, so leaving it in a current kube-proxy config is incorrect. I removed the `featureGates` block from the example.
- The post said `kube-proxy --version` verified proxy mode. That command only reports the binary version, not whether kube-proxy is running in `iptables` or `ipvs` mode. I replaced it with a command that reads the configured `mode` from the kube-proxy ConfigMap.
- The IPVS inspection example used `grep` for `TCPv6|UDPv6`, which does not match the standard `ipvsadm -Ln` output format documented by Kubernetes. I changed the command to `sudo ipvsadm -Ln`.
- The Service-routing example created only a Service, but then tested end-to-end connectivity as if backend Pods already existed. I added a minimal backend Deployment, aligned `targetPort` with the container port, added a rollout wait for readiness, and adjusted the ClusterIP output example so the commands are internally consistent.
- The conclusion implied that `clusterCIDR` should always be configured for dual-stack service routing and that IPVS is the recommended large-cluster backend. Current Kubernetes documentation describes `clusterCIDR` as a pod-CIDR setting used by kube-proxy's local-traffic detection logic, and documents IPVS as deprecated in favor of `nftables`. I corrected that guidance.

## Review Notes
- IPVS still works for IPv6, but Kubernetes marks the `ipvs` proxy mode as deprecated as of v1.35 and recommends `nftables` as its replacement for new Linux deployments.
- The post's `ip6tables` and `KUBE-*` chain inspection commands are valid for kube-proxy's iptables/IPVS implementations, but those chains are implementation details rather than a stable external API.
- `kubectl`, `kube-proxy`, and `ipvsadm` were not installed in the local workspace, so command verification was done against the official Kubernetes reference documentation rather than local `--help` output.
