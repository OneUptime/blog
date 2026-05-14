# Validation Summary: Common Mistakes to Avoid When Securing Calico BGP Sessions

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
- Calico Secure BGP sessions documentation: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands, including BIRD access: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- RFC 2385, Protection of BGP Sessions via the TCP MD5 Signature Option: https://www.rfc-editor.org/rfc/rfc2385

## Issues Found
- The post said BGPPeer configures per-peer authentication and encryption settings. Calico documents BGPPeer password support as BGP password authentication, and Calico explicitly notes that BGP password use does not encrypt the data exchange. I changed the wording to authentication only and added the encryption caveat.
- The secret example placed the BGP password in `kube-system` without explaining that the secret must be in the same namespace as the `calico-node` pod. I changed the example to `calico-system`, noted the namespace requirement, and mentioned `kube-system` as the manifest-install alternative.
- The original example omitted the RBAC permissions required for the `calico-node` ServiceAccount to read the referenced secret. I added a Role and RoleBinding with `get`, `list`, and `watch` on the secret, matching the Calico documentation.
- The original command flow created a Kubernetes Secret separately while showing it in the same configuration snippet that was applied with `calicoctl`. `calicoctl apply` is for Calico resources, so I separated the Kubernetes Secret/RBAC file from the BGPPeer file and used `kubectl apply` for the Kubernetes resources.
- The verification command used `bird cli`, which is not the Calico-documented way to access BIRD in the `calico-node` pod. I replaced it with a `calicoctl get bgppeer ... -o yaml` check for the password reference and kept `calicoctl node status` for session state.
- The conclusion said MD5 authentication prevents route injection attacks. Because password authentication is a defensive layer rather than a complete guarantee against all route-injection scenarios from an authorized or compromised peer, I changed this to "helps prevent."

## Review Notes
The post now reflects current Calico 3.32 documentation and remains compatible with the stated Calico v3.26+ scope for the fields reviewed. The examples still require readers to replace node names, peer IPs, AS numbers, namespaces, and shared passwords with values from their own deployment.
