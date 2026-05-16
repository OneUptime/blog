# Validation Summary: How to Patch Cluster Network Settings in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `cluster.network`, `cluster.proxy`, `cluster.coreDNS`, `cluster.inlineManifests`)
- `talosctl` CLI (`gen config`, `patch machineconfig`, `apply-config`, `get machineconfig`, `get routes`)
- Kubernetes networking (pod subnets, service subnets, DNS domain)
- CNI plugins (Flannel, Cilium, Calico)
- kube-proxy (iptables, IPVS modes)
- CoreDNS
- IPv4/IPv6 dual-stack networking

## Sources Consulted
- Talos `talosctl apply-config` reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/talosctl_apply-config/
- Talos configuration patching guide: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Talos networking resources: https://docs.siderolabs.com/talos/v1.11/learn-more/networking-resources
- Talos v1alpha1 configuration reference: https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config
- Talos editing machine configuration: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos inline manifests guide: https://www.talos.dev/v1.10/kubernetes-guides/configuration/inlinemanifests/
- kube-proxy `--ipvs-strict-arp` flag (Kubernetes / MetalLB documentation)

## Issues Found

1. **Incorrect `talosctl` command for applying a patch to a running node.** The post originally used `talosctl apply-config --nodes "$node" --patch @cluster-network-patch.yaml`. The `apply-config` subcommand does not accept a `--patch` flag (its patch flag is `--config-patch`, and it still requires a full machine config via `-f`). The canonical command for applying just a patch to a running node is `talosctl patch machineconfig --nodes <IP> --patch @file.yaml`. Fixed by replacing `apply-config --patch` with `patch machineconfig --patch` in the loop example.

2. **Incorrect `yq` path against `talosctl get machineconfig -o yaml`.** The output is a Talos resource document whose actual machine config lives under `.spec`, not at the root. The original `yq '.cluster.network'` would return null. Fixed to `yq '.spec.cluster.network'`.

## Review Notes
- The `cluster.network.cni.name` valid values in Talos are `flannel`, `none`, and `custom` only. The post uses `flannel` and `none`, which are correct. The phrasing "Talos supports several built-in CNI options" is slightly generous (only Flannel ships built-in; `none` and `custom` are escape hatches), but the example configurations themselves are accurate.
- Default values shown (pod subnet `10.244.0.0/16`, service subnet `10.96.0.0/12`, DNS domain `cluster.local`, default CNI `flannel`) all match Talos defaults.
- The `~260,000 pod IPs` comment for `/14` is correct (2^18 = 262,144).
- `cluster.proxy` fields (`mode`, `disabled`, `extraArgs`) and `mode: ipvs` are valid. The `ipvs-strict-arp: "true"` extraArg matches the upstream kube-proxy `--ipvs-strict-arp` flag and is the documented requirement for MetalLB in IPVS mode.
- `cluster.coreDNS.disabled` and `cluster.coreDNS.image` are valid schema fields.
- `cluster.inlineManifests` structure (`name`, `contents`) is correct.
- `talosctl gen config --config-patch @file.yaml` is valid syntax.
- `talosctl get routes` is valid (it's an alias for the `RouteStatus` resource).
- The CoreDNS image reference `registry.k8s.io/coredns/coredns:v1.11.1` is a real published tag, though newer CoreDNS releases exist; readers should pick the version matching their Kubernetes release rather than treating this as a current recommendation.
