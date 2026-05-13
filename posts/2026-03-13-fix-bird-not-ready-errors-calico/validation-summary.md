# Validation Summary: How to Fix BIRD Not Ready Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- calicoctl
- Calico BGP and BIRD
- Calico IPPool and BGPPeer resources
- kubectl

## Sources Consulted
- Calico BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl ipam check documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico IP address management documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The symptoms section attributed `BIRDv4 is not ready` and `BIRDv6 is not ready` specifically to Felix logs. Calico's calico/node container runs Felix and BIRD, but these readiness messages are better described as calico-node readiness or log output. Updated the wording to avoid misattribution.
- The IPPool replacement example did not state that the replacement CIDR must remain inside the Kubernetes pod CIDR while avoiding node host subnet and IPPool overlap. Added a comment before the example to make the constraints explicit.
- The datastore repair section implied that patching `calico-config` and `etcd_endpoints` applies generally. This is only appropriate for manifest-based, etcd-backed Calico installs; Kubernetes datastore and operator-managed installs use different configuration paths. Updated the heading and comments to scope the command correctly.
- The prevention section said `calicoctl ipam check` catches CIDR conflicts. Official documentation describes it as checking IPAM data structure integrity against Kubernetes, such as allocation inconsistencies, not general CIDR conflict detection. Updated the bullet accordingly.

## Review Notes
The remaining commands and resource fields are consistent with current Calico and Kubernetes documentation. The resource limit values are reasonable examples rather than universal sizing guidance; production clusters should size calico-node based on node count, route scale, and BGP peer count.
