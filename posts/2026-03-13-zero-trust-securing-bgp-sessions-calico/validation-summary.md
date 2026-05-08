# Validation Summary: Zero Trust BGP Security with Calico

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

## Sources Consulted
- Calico documentation: Secure BGP sessions, https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico documentation: BGPPeer resource, https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: calicoctl node status, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- RFC 2385: Protection of BGP Sessions via the TCP MD5 Signature Option, https://www.rfc-editor.org/rfc/rfc2385

## Issues Found
- The post said BGPPeer supports authentication and encryption settings. Calico BGP passwords authenticate BGP sessions but do not encrypt BGP traffic, so the wording was corrected.
- The Secret example did not include the RBAC permissions required for `calico-node` to read the referenced Secret. Added the required Role and RoleBinding.
- The command flow mixed a Kubernetes Secret manifest with `calicoctl apply`, which would not reliably apply non-Calico Kubernetes resources. Updated the commands to create the Secret with `kubectl` and apply the combined RBAC/BGPPeer manifest with `kubectl`.
- The verification command used an unreliable `bird cli` invocation and grepped for authentication output that is not documented as a Calico verification method. Replaced it with a supported check of the BGPPeer configuration.
- The conclusion overstated MD5 authentication as preventing all route injection attacks. Adjusted it to say it helps prevent route injection and unauthorized peering.

## Review Notes
The examples assume `kube-system` for the `calico-node` namespace, with inline comments noting that operator-based installs commonly use `calico-system`. Production deployments should also validate route import/export policy and host endpoint policy for the local topology.
