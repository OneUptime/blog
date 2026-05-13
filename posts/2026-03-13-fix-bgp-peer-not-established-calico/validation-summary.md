# Validation Summary: How to Fix BGP Peer Not Established in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD
- calicoctl
- kubectl
- iptables
- UFW

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The diagnosis block did not state that `calicoctl node status` must be run on the node whose BGP status is being checked. Added a short comment because Calico documents that the command talks to the local Calico agent.
- The calico-node restart command captured the pod as `pod/<name>` with `-o name` but then ran `kubectl delete pod $NODE_POD`, which could become `kubectl delete pod pod/<name>`. Changed it to `kubectl delete "$NODE_POD" -n kube-system`.
- The post-delete wait used a label and field selector immediately after deleting the pod, which can race with DaemonSet replacement. Changed it to `kubectl rollout status daemonset/calico-node -n kube-system --timeout=120s`, which is a supported Kubernetes command for checking DaemonSet rollout status.

## Review Notes
The remaining Calico resource fields and commands are consistent with current Calico 3.32 documentation. The BGP password example is structurally correct, but in a real cluster the referenced secret must exist in the calico-node namespace and the calico-node service account must be allowed to read it.
