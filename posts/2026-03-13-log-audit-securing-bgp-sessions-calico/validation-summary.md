# Validation Summary: How to Log and Audit BGP Sessions in Calico

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
- BIRD / birdcl
- HostEndpoint policy

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands, including BIRD routing table inspection with birdcl: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico troubleshooting and diagnostics, including calico-node logs and BGP status checks: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico host endpoints reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico host endpoint connectivity guidance for allowing BGP TCP 179: https://docs.tigera.io/calico/latest/reference/host-endpoints/connectivity
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post claimed that BGPPeer supports per-peer authentication and encryption settings. Calico BGPPeer supports BGP password authentication, but the documented BGPPeer password field is not an encryption setting. Changed the wording to "per-peer authentication settings."
- The BGP password Secret was hard-coded to `kube-system`. Calico documentation requires the referenced Secret to be in the same namespace as the `calico-node` pod, which is commonly `calico-system` for operator installs and `kube-system` for manifest installs. Updated the example to use `calico-system` with comments for manifest-based installs.
- The example omitted RBAC for `calico-node` to read the referenced Secret. Calico documentation states the `calico-node` ServiceAccount must be able to `get`, `list`, and `watch` the Secret. Added a Role and RoleBinding example.
- The verification command used `bird cli`, which is not the Calico-documented troubleshooting command. Replaced it with a `kubectl exec` command that runs `birdcl show protocols all` inside a `calico-node` pod.
- The command comment "Check for unauthorized BGP connections" used `calicoctl get bgppeers -o wide`, which reviews configured BGPPeer resources rather than live unauthorized connection attempts. Updated the wording and added a calico-node log audit command for BGP/authentication/peering failures.

## Review Notes
The post is accurate as a concise hardening and audit guide after the fixes. MD5 BGP authentication helps reject peers without the configured password, but it does not encrypt BGP traffic; deployments that require confidentiality should evaluate separate transport or network-layer controls.
