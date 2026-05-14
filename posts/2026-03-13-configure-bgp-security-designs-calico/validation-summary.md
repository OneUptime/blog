# Validation Summary: How to Configure BGP Security Designs in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGPFilter and BGPPeer Calico resources
- Kubernetes Secrets and RBAC

## Sources Consulted
- Calico BGPFilter resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico secure BGP sessions documentation: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Project Calico API reference for BGPFilterRuleV4 validation: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The prerequisite listed `calicoctl v3.26+`, but the post uses Kubernetes resources and BGPFilter support is a Calico version requirement. Changed this to `Calico v3.26+ with BGP mode`.
- The BGP password section created a Secret but omitted the documented requirement that the Secret must be in the namespace where `calico-node` runs and that `calico-node` must have RBAC permissions to read it. Added a Role and RoleBinding example.
- The BGPFilter examples used `cidr` without `matchOperator`. Calico's API requires `cidr` and `matchOperator` to be set together, so added `matchOperator: In` to both prefix-length reject rules.
- The post implied AS path filtering was a Calico BGPFilter capability. Calico BGPFilter supports route import/export filtering but does not expose AS path matching as shown in the post. Clarified that AS path filtering is router-side and adjusted the diagram label to BGPFilter rules.

## Review Notes
The examples assume an operator-style Calico installation using the `calico-system` namespace. Clusters installed from manifests may run `calico-node` in `kube-system`, so users should adjust the Secret and RBAC namespace accordingly.
