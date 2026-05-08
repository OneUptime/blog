# Validation Summary: Tune Calico on Single-Node Kubernetes for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source v3.x
- Kubernetes
- calicoctl
- Calico IPPool, BGPConfiguration, FelixConfiguration, and GlobalNetworkPolicy resources
- Kubernetes DaemonSet and Tigera Operator Installation resources

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGP peering configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico resource requests and limits guide: https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The IPPool snippet showed creating a new `single-node-pool` with a typical default pod CIDR. On an existing Calico install this would not tune the active default pool, and overlapping pools can be rejected or disabled. I changed the instructions to patch the active IPPool and kept the YAML as a fresh-install example.
- The IPPool snippet implied `blockSize` could be changed as part of normal tuning. Calico documents `blockSize` as create-time only, so I added that caveat before the YAML.
- The Calico pod resource limit example was a partial DaemonSet manifest that would not be directly applicable as written. I replaced it with the documented Tigera Operator `Installation` patch for `calicoNodeDaemonSet` resources.
- The MTU command used `calicoctl patch felixconfiguration default` with `vethMTU`. Current Calico documentation configures MTU through the Operator `Installation` resource or the manifest install `calico-config` ConfigMap. I replaced the command with both documented options and noted that MTU changes apply to new workloads.
- The GlobalNetworkPolicy selector used `!has(projectcalico.org/system-pod)`, which is not a documented way to exclude Kubernetes system namespaces. I changed it to `selector: all()` with a `namespaceSelector` excluding `kube-system`, `calico-system`, and `tigera-operator` using Calico's documented `projectcalico.org/name` namespace label.

## Review Notes
The remaining commands and resource fields match Calico's documented APIs for the v3.x family. The exact Calico namespace can differ by install method (`calico-system` for operator installs and often `kube-system` for manifest installs), so operators should adapt namespace-specific commands to their deployment.
