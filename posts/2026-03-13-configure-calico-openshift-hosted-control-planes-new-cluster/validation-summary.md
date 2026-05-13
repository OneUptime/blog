# Validation Summary: How to Configure Calico on OpenShift Hosted Control Planes for a New Cluster

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Calico Open Source
- OpenShift Hosted Control Planes
- HyperShift
- Kubernetes networking
- Calico IPPool, FelixConfiguration, and GlobalNetworkPolicy resources
- `kubectl`, `oc`, and `calicoctl`

## Sources Consulted
- Calico documentation: Install Calico on an OpenShift HCP cluster - https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: VXLAN and IP-in-IP overlay networking - https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: `calicoctl patch` command - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Red Hat OpenShift documentation: CIDR range definitions for hosted control planes - https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/networking_overview/cidr-range-definitions

## Issues Found
- The IPPool example used `encapsulation: VXLAN`, which is not the current IPPool field for Calico VXLAN configuration. Changed it to `vxlanMode: Always`, matching the official Calico IPPool and overlay networking documentation.
- The CIDR guidance overstated that every hosted cluster's Calico IP pool must be unique across all hosted clusters. Red Hat documents the HCP requirement as avoiding overlap with the management cluster, and Calico IP pools should align with the hosted cluster pod CIDR. Updated the text to state that uniqueness across hosted clusters is required when those networks are routed together.
- The multi-tenant isolation test was written as an unconditional requirement. Updated it to apply when hosted cluster pod networks are routed in the environment, because direct pod reachability between independent hosted clusters depends on the surrounding routing and policy design.

## Review Notes
The remaining Calico resource kinds, `calicoctl patch` syntax, Felix fields, GlobalNetworkPolicy fields, `kubectl run` test command, and `tigerastatus` verification command are technically plausible for current Calico/OpenShift installations. Operators should still confirm the Calico version, OpenShift HCP version, and selected Calico data plane before applying the examples in production.
