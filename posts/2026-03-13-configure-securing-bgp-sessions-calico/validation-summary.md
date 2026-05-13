# Validation Summary: How to Configure Secure BGP Sessions in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGPPeer resources
- Kubernetes Secrets and RBAC
- calicoctl
- BIRD

## Sources Consulted
- Calico secure BGP sessions documentation: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- BIRD remote control documentation: https://bird.network.cz/doc/bird-4.html
- RFC 2385, Protection of BGP Sessions via the TCP MD5 Signature Option: https://www.rfc-editor.org/rfc/rfc2385

## Issues Found
- The post said BGPPeer configures authentication and encryption settings. Calico BGP password protection authenticates the BGP session but does not encrypt BGP traffic, so I corrected the wording and added the encryption caveat from the official Calico secure BGP guide.
- The Secret example omitted the required RBAC access for the `calico-node` ServiceAccount. Calico documentation requires `calico-node` to have `get`, `list`, and `watch` access to the referenced Secret, so I added a Role and RoleBinding.
- The Secret namespace was presented without explaining that it must match the namespace where `calico-node` runs. I added that prerequisite and kept the example using `kube-system`.
- The example used a raw `data` placeholder for the Secret. I changed it to `stringData` with an 80-character-or-fewer password placeholder to match Calico's password length limit and make the manifest easier to apply.
- The verification command `bird cli <<< "show protocols all bgp_peer_router01" | grep auth` was not a valid BIRD client invocation and was not a reliable Calico verification step. I replaced it with `calicoctl node status`, which Calico documents for checking BGP session status.
- The command comment said `calicoctl get bgppeers -o wide` checks for unauthorized BGP connections. That command lists configured BGPPeer resources rather than unauthorized connection attempts, so I corrected the comment.
- The conclusion and architecture diagram referred specifically to MD5 authentication. I changed the post wording to "password authentication" / "BGP Password Auth" to match Calico's user-facing resource terminology while still relying on RFC 2385/BIRD behavior for the underlying TCP MD5 mechanism.

## Review Notes
The post is technically relevant and valid after correction. In a future expansion, it could mention that `calicoctl node status` must be run on the node whose BGP status is being inspected, or that a `CalicoNodeStatus` resource can be used for status collection, but those additions were outside the minimal correction scope.
