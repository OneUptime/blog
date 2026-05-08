# Validation Summary: How to Validate BGP Session Security in Calico Before Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGPPeer resources
- Kubernetes Secrets and RBAC
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Secure BGP sessions - https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico documentation: BGPPeer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- RFC 2385: Protection of BGP Sessions via the TCP MD5 Signature Option - https://www.rfc-editor.org/rfc/rfc2385

## Issues Found
- The post said BGPPeer configures authentication and encryption settings. Calico BGP passwords authenticate the BGP session but do not encrypt routing information, so the wording was corrected.
- The Secret example did not include the required RBAC for `calico-node` to read the referenced Secret. Added a Role and RoleBinding matching Calico's documented requirement.
- The original manifest mixed a Calico BGPPeer and Kubernetes Secret in one YAML stream while the command applied it with `calicoctl`. Split the examples so the BGPPeer is applied with `calicoctl` and Kubernetes resources are handled with `kubectl`.
- The command `bird cli <<< "show protocols all bgp_peer_router01" | grep auth` was not a supported Calico verification command and relied on an uncertain BIRD protocol name. Replaced it with checks for the BGPPeer password reference and `calico-node` Secret access.
- The comment "Check for unauthorized BGP connections" above `calicoctl get bgppeers -o wide` was inaccurate because that command reviews configured peers, not live unauthorized connection attempts. Updated the comment.

## Review Notes
The examples use `kube-system`, which is correct for many manifest-based Calico installs. Operator-based installs commonly use `calico-system`; the post now calls out that the namespace must match where `calico-node` runs.
