# Validation Summary: How to Add and Remove Nodes in RKE

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Rancher Kubernetes Engine (RKE1)
- Kubernetes
- kubectl
- etcd
- Docker Engine
- Linux sysctl and swap configuration
- SSH-based node provisioning

## Sources Consulted
- RKE1 Adding and Removing Nodes: https://rke.docs.rancher.com/managing-clusters
- RKE1 Requirements: https://rke.docs.rancher.com/os
- RKE1 Nodes configuration: https://rke.docs.rancher.com/config-options/nodes
- RKE1 One-time Snapshots: https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots
- RKE1 custom certificate naming: https://rke.docs.rancher.com/installation/certs
- Rancher RKE1 end-of-life notice: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/upgrade-kubernetes-without-upgrading-rancher
- Docker Engine install documentation for Ubuntu and the convenience script: https://docs.docker.com/engine/install/ubuntu/
- RKE v1.8.13 CLI source for etcd subcommands: https://github.com/rancher/rke/blob/v1.8.13/cmd/etcd.go
- RKE v1.8.13 reconcile source for node deletion: https://github.com/rancher/rke/blob/v1.8.13/cluster/reconcile.go
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- SUSE Rancher best practices for RKE etcd checks: https://www.suse.com/support/kb/doc/?id=000020105

## Issues Found
- The post did not mention that RKE1 is end-of-life. Added a note that RKE1 reached EOL on July 31, 2025 and that the guide is for maintaining existing RKE1 clusters, not new deployments.
- The node preparation commands enabled `net.ipv4.ip_forward` but missed RKE's documented `net.bridge.bridge-nf-call-iptables=1` sysctl requirement. Added the bridge sysctl and persisted both networking settings in a dedicated sysctl file.
- The Docker install instruction did not remind readers to use a Docker Engine version supported by their RKE/Kubernetes release. Updated the setup sentence to make that compatibility requirement explicit.
- The swap command only disabled swap at runtime. Updated the comment to state that `/etc/fstab` swap entries also need to be removed or commented for persistence.
- The control plane / etcd verification command used `rke etcd snapshot-list`, but RKE v1.8.13 exposes `snapshot-save` and `snapshot-restore`, not `snapshot-list`; snapshot listing also would not verify etcd membership. Replaced it with Kubernetes node verification and `etcdctl member list` from an etcd node.
- The worker removal flow told readers to delete the Kubernetes Node object after `rke up`. RKE normally attempts to delete removed node objects during reconcile, so the command could fail if the node was already gone. Made the deletion idempotent with `--ignore-not-found` and updated the wording.
- The etcd removal verification comment said it checked cluster health, but the command listed etcd members. Updated the wording and simplified the member-list command to the supported RKE etcd-container form.
- The rolling replacement snippet used a non-idempotent `kubectl delete node`. Updated it to `kubectl delete node <old-node> --ignore-not-found`.

## Review Notes
RKE1 remains useful for maintaining existing clusters, but it is EOL and RKE2 should be preferred for new clusters. Worker-only changes can also use `rke up --update-only`, as documented by RKE, but the post's `rke up --config cluster.yml` flow is still valid. External links in the post were reachable during validation.
