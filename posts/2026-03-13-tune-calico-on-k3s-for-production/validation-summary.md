# Validation Summary: How to Tune Calico on K3s for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- K3s
- Kubernetes
- Calico
- Calico FelixConfiguration
- Calico IPPool
- calicoctl
- kubectl
- Linux networking and MTU tuning

## Sources Consulted
- Calico eBPF installation documentation: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool block size migration documentation: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- K3s custom CNI documentation: https://docs.k3s.io/networking/basic-network-options

## Issues Found
- The post stated that Calico eBPF mode requires kernel 5.14+. Current Calico documentation lists Linux kernel 5.10+ for the base eBPF data plane, with newer kernels required for some features. Updated the introduction and Step 1 accordingly.
- The FelixConfiguration example used `reportingInterval`, which is not a current FelixConfiguration field. Replaced it with `usageReportingEnabled: false`, which matches the usage reporting fields in the current Calico FelixConfiguration resource.
- The DaemonSet resource-limit patch used a JSON Patch `add` operation against `/spec/template/spec/containers/0/resources`. That can fail when `resources` already exists and relies on container ordering. Replaced it with a strategic merge patch targeting the `calico-node` container by name.
- The IPPool section implied that `blockSize` could be applied to an existing default pool. Calico documents that `blockSize` can only be set when a pool is created. Added a correction that existing pools require creating a replacement pool and migrating workloads.

## Review Notes
- The MTU value `1480` is correct for a 1500-byte underlay when using IPv4 IP-in-IP overhead, but operators should adjust it for VXLAN, WireGuard, jumbo frames, or non-1500 underlay MTUs.
- The `calico-config` ConfigMap MTU patch is appropriate for manifest-based Calico installs. Operator-based Calico installs should configure MTU through the operator `Installation` resource instead.
- K3s clusters using Calico should be installed as a custom CNI deployment with Flannel disabled and the built-in network policy controller disabled to avoid conflicts.
