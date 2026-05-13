# Validation Summary: How to Debug Calico BGP Session Security Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BGPPeer resources
- Kubernetes Secrets and RBAC
- calicoctl

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico secure BGP sessions documentation: https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- BIRD BGP protocol documentation: https://bird.network.cz/doc/bird-6.html
- RFC 2385, Protection of BGP Sessions via the TCP MD5 Signature Option: https://www.rfc-editor.org/rfc/rfc2385

## Issues Found
- The introduction said BGPPeer configures authentication and encryption settings. Calico BGPPeer password support configures BGP MD5 authentication, not encryption, so I changed the wording to authentication settings.
- The example referenced a Kubernetes Secret but did not grant the `calico-node` ServiceAccount permission to read it. Calico documentation states the referenced secret must be in the same namespace as `calico-node` and readable by that ServiceAccount, so I added the required Role and RoleBinding.
- The Secret example used `data` with a placeholder value that was not valid base64. I changed the flow to create or update the secret with `kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -`, which avoids invalid YAML and keeps the generated password under Calico's 80-character BGP password limit.
- The post used `calicoctl apply -f secure-bgp-peer.yaml` for a manifest that now contains Kubernetes RBAC resources. I changed it to `kubectl apply -f secure-bgp-peer.yaml` so the mixed Kubernetes and Calico manifest can be applied correctly.
- The verification command `bird cli <<< "show protocols all ..."` was not a valid BIRD command-line invocation and was not necessary to verify the Calico password reference. I replaced it with a `calicoctl get bgppeer ... -o yaml` check for the password reference.
- The post described `calicoctl get bgppeers -o wide` as checking unauthorized BGP connections. That command lists configured BGPPeer resources, so I changed the comment and added a log-check command for rejected or failed BGP sessions.

## Review Notes
- `calicoctl node status` reports BGP status for the local Calico node, so it should be run on the node being inspected.
- The namespace examples use `kube-system`; operator-based installs commonly use `calico-system`, so the post now calls out that the namespace must match where `calico-node` runs.
