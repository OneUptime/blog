# Validation Summary: How to Tune Calico on Self-Managed DigitalOcean Kubernetes for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator Installation API
- Calico FelixConfiguration
- Calico IPPool and IPAM
- Calico eBPF dataplane
- DigitalOcean Droplets networking
- Prometheus metrics

## Sources Consulted
- Calico MTU configuration: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico eBPF enablement: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico eBPF install requirements: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool block size migration guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico component resource requests and limits: https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- DigitalOcean Droplet limits and MTU note: https://docs.digitalocean.com/products/droplets/details/limits/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The MTU command patched `installation default`; changed it to the documented `installation.operator.tigera.io default` resource form for operator-managed Calico installations.
- The IP-in-IP MTU example used the invalid Felix field `ipiniMTU`; changed it to the documented `ipipMTU`.
- The Felix refresh interval explanation incorrectly tied refresh interval reduction to faster normal policy convergence. Updated it to describe faster detection of unexpected dataplane drift, which is what these periodic refresh settings control.
- The eBPF section used a `bpfEnabled` Felix patch and kernel 5.3+ guidance. Updated it to the documented operator-managed eBPF patch and current Calico guidance of kernel 5.10+ for the base eBPF dataplane.
- The IPPool example attempted to patch `blockSize` on an existing pool, but Calico only allows `blockSize` to be set at pool creation. Replaced it with a new IPPool manifest and added a note that existing pools must be migrated.
- The IPAM block explanation said `/26` gives 64 IPs per node. Corrected it to 64 IPs per allocation block.
- The resource request example directly patched the `calico-node` DaemonSet by container index, which is fragile and may be overwritten by the operator. Replaced it with the documented Installation CR patch for `calicoNodeDaemonSet`.

## Review Notes
The post now consistently uses operator-managed Calico examples. Manifest-based Calico installs require different commands for MTU, eBPF enablement, and component resource customization.
