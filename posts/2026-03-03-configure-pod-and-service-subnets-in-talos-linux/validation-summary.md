# Validation Summary: How to Configure Pod and Service Subnets in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, machine config, `cluster.network.podSubnets`, `cluster.network.serviceSubnets`)
- Kubernetes (pod CIDR, service CIDR, controller-manager `--node-cidr-mask-size`)
- CNI plugins: Flannel, Cilium, Calico (Tigera Operator)
- Dual-stack networking (IPv4 + IPv6, ULA `fd00::/8`)
- kubectl verification commands
- Prometheus / kube-state-metrics monitoring

## Sources Consulted
- Talos Linux machine configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/ (fields `cluster.network.podSubnets`, `cluster.network.serviceSubnets`, `cluster.controllerManager.extraArgs`)
- talosctl CLI docs (`talosctl gen config`, `--config-patch` with both JSON Patch and strategic merge / `@file` syntax)
- Kubernetes documentation on cluster networking and `--node-cidr-mask-size` default (24 for IPv4)
- Cilium Helm chart values reference (`ipam.mode`, `ipam.operator.clusterPoolIPv4PodCIDRList`, `ipam.operator.clusterPoolIPv4MaskSize`)
- Tigera Operator API reference: https://docs.tigera.io/calico/latest/reference/installation/api (`operator.tigera.io/v1` `Installation`, `calicoNetwork.ipPools`)
- kubelet metrics (`kubelet_running_pods`)
- Default service IPs: kubernetes API service is the first usable IP in the service CIDR; kube-dns/CoreDNS conventionally uses the 10th IP

## Issues Found

1. **Cilium IPAM mode inconsistency** — The Cilium example set `ipam.mode: kubernetes` while also supplying `clusterPoolIPv4PodCIDRList` and `clusterPoolIPv4MaskSize`. Those `clusterPool*` fields only apply when `ipam.mode: cluster-pool` is used; in `kubernetes` mode Cilium derives the pod CIDR from `node.spec.podCIDR` and silently ignores the cluster-pool settings. Changed `mode: kubernetes` to `mode: cluster-pool` so the example is internally consistent and actually applies the custom pod subnet.

## Review Notes
- The default CIDRs cited (`10.244.0.0/16` pod, `10.96.0.0/12` service) match Talos defaults.
- CIDR math is correct: a /16 split into /24 per-node blocks supports 256 nodes; /14 → 1,024; /12 → 4,096; /8 → 65,536.
- The claim "each node can run up to 254 pods" reflects the IP capacity of a /24 (256 − 2 reserved). Note that kubelet's default `--max-pods` is 110, so reaching 254 pods per node would also require raising `max-pods` — but the post is specifically about IP addressing capacity, so this is accurate in context.
- The IPv6 service subnet `/112` is a safe and commonly used choice (kube-apiserver historically required the IPv6 service CIDR to be no larger than /108; /112 is well within that limit).
- The `--config-patch` JSON Patch (RFC 6902) syntax and the `@file` form are both valid talosctl input formats.
- The Prometheus alert uses `kube_node_spec_pod_cidr_mask_size`, which is not a standard kube-state-metrics metric out of the box. The alert is illustrative; users may need to adapt it to a metric available in their environment (e.g., derive from `kube_node_info` or use a recording rule). Left as-is because the post presents it as an example structure.
- `talosctl gen config <name> <endpoint>` signature and the `cluster.network.podSubnets` / `cluster.network.serviceSubnets` field names (plural, list-valued) are correct for current Talos Linux.
