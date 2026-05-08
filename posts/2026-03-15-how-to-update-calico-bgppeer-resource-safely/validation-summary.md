# Validation Summary: How to Update the Calico BGPPeer Resource Safely

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Calico Open Source
- Calico BGPPeer and BGPFilter resources
- BGP peering
- Kubernetes Secrets and RBAC
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico secure BGP sessions guide: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl create role reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_role/
- Kubernetes kubectl create rolebinding reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_rolebinding/

## Issues Found
- `calicoctl node status` was described as checking all BGP sessions. Calico documents that this command queries the local Calico agent and must be run on the node whose BGP status is being checked, so the wording was changed to "on each affected node."
- The BGP password example created a Kubernetes Secret but did not mention the documented requirement that `calico-node` must be able to read it. Added concise `kubectl create role` and `kubectl create rolebinding` commands for the example secret.
- The BGP password steps assumed `calico-system` unconditionally. Calico documents that the Secret must be in the same namespace as the `calico-node` pod, so the surrounding text now says to use the namespace where `calico-node` runs while keeping `calico-system` as the example namespace.

## Review Notes
- The BGPPeer fields used in the examples (`peerIP`, `asNumber`, `nodeSelector`, `filters`, and `password.secretKeyRef`) match the current Calico Open Source resource documentation.
- `calicoctl patch`, `calicoctl get -o yaml`, `calicoctl get -o wide`, `calicoctl apply`, and `calicoctl delete bgppeer` are current documented command patterns.
- The examples do not specify a Calico version. They were checked against the current Calico Open Source documentation available on 2026-05-08.
