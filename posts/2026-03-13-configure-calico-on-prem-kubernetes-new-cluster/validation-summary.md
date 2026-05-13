# Validation Summary: How to Configure Calico on On-Prem Kubernetes for a New Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- Tigera Operator
- Calico IPPool resources
- Calico BGPConfiguration and BGPPeer resources
- Calico FelixConfiguration
- calicoctl
- kubectl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico on-prem operator customization guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico BGP configuration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix component configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview

## Issues Found
- The post described `FelixConfiguration` as being exposed by the Tigera Operator. Updated the wording to distinguish operator `Installation` configuration from runtime Calico resources such as `FelixConfiguration`, `BGPConfiguration`, and `BGPPeer`.
- The IPPool example used `encapsulation: None`, which is an operator `Installation` IP pool setting, not a valid `projectcalico.org/v3` `IPPool` field. Changed the Calico IPPool example to use `ipipMode: Never` and `vxlanMode: Never`.
- The IP pool step said to adjust the existing pool to match the pod CIDR. Changed this to confirm the pool matches the pod CIDR, since the documented operator path for selecting a pod IP range is the `Installation` resource and existing IP pool CIDR changes can be disruptive.
- The BGPPeer apply command referenced `bgppeer.yaml` but the preceding snippet did not label that file. Added the filename comment to keep the command and snippet aligned.
- The MTU patch command used the ambiguous resource name `installation default`. Updated it to the official operator resource form `installation.operator.tigera.io default`.
- The BGP verification step omitted that `calicoctl node status` must be run on the node whose local Calico agent should be queried. Added that requirement.

## Review Notes
The remaining Calico resource fields and commands were consistent with the current Calico Open Source documentation. The post assumes a standard Linux Calico networking deployment; environments using eBPF, VXLAN, IP-in-IP, Windows nodes, or route reflectors may need topology-specific adjustments outside the scope of this guide.
