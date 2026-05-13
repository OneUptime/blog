# Validation Summary: How to Configure MTU Sizing for Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- MTU sizing
- VXLAN
- IP-in-IP
- WireGuard
- Calico Operator
- kubectl

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: FelixConfiguration resource reference, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: calicoctl patch command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post stated that an incorrectly sized MTU causes packet fragmentation and throughput degradation by orders of magnitude. Calico documentation describes fragmentation or dropped packets and performance degradation, so the wording was corrected throughout to avoid overstating a universal outcome.
- The prerequisites claimed Calico v3.20+ was required for automatic MTU detection. Current Calico documentation describes automatic MTU detection but does not frame it as a v3.20+ prerequisite, so the version-specific claim was removed.
- The WireGuard + VXLAN table entry treated the overhead as additive and recommended 1390 for a 1500-byte host MTU. Calico documentation says mixed WireGuard and VXLAN/IP-in-IP deployments should use the smallest MTU of the active encapsulation types, so the row was corrected to 1440 for IPv4 WireGuard mixed with VXLAN on a 1500-byte network.
- The explicit MTU commands patched `FelixConfiguration.spec.mtu`, which is not the documented API for setting pod network MTU. They were changed to patch `Installation.spec.calicoNetwork.mtu`, matching Calico Operator documentation.
- The `calicoctl patch --type merge` examples were replaced because the calicoctl reference documents merge patch as not implemented. The corrected examples use `kubectl patch ... --type merge` against the operator Installation resource.
- The operator Installation YAML example used `mtu: 1500` with `encapsulation: VXLAN`. For a 1500-byte network with IPv4 VXLAN, Calico documents a 1450-byte MTU, so the example was corrected to `mtu: 1450`.

## Review Notes
The updated MTU only applies to new workloads, which the post already notes. For manifest-based Calico installations, the official approach is to patch the `calico-config` ConfigMap `veth_mtu` value and restart `calico-node`; this post now focuses its explicit patch examples on Calico Operator installations.
