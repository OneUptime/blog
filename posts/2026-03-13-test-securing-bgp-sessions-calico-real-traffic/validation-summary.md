# Validation Summary: How to Test Secure BGP Sessions in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGPPeer resources
- Kubernetes Secrets
- Kubernetes RBAC
- calicoctl
- kubectl

## Sources Consulted
- Calico secure BGP sessions documentation: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP configuration reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post stated that BGPPeer supports authentication and encryption settings. Calico BGP passwords authenticate the peering but do not encrypt BGP traffic, so the wording was corrected.
- The original configuration included a Kubernetes Secret in the same YAML flow that was later applied with `calicoctl`. Since `calicoctl` manages Calico resources and the Secret is a Kubernetes resource, the Secret creation was kept under `kubectl` and the BGPPeer remains under `calicoctl`.
- The post omitted the RBAC required for `calico-node` to read the referenced Secret. A Role and RoleBinding were added, matching Calico's documented requirement for `get`, `list`, and `watch` access to the Secret.
- The original verification command used `bird cli`, which is not a documented Calico verification command and is not portable across Calico deployments. It was replaced with `calicoctl node status` checks.
- The post assumed the Secret lived in `kube-system`. The prerequisites and examples were adjusted to use the namespace where `calico-node` runs, with `calico-system` shown for operator installs and `kube-system` noted for manifest installs.

## Review Notes
The post is technically valid after the fixes. Future improvements could show a deliberate negative test where the external router is configured with no password or the wrong password, then demonstrate that the BGP session does not reach `Established`.
