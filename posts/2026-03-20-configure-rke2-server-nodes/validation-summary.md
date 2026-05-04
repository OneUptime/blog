# Validation Summary: How to Configure RKE2 Server Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2 (Rancher Kubernetes Engine 2)
- Kubernetes (control plane: kube-apiserver, kube-controller-manager, kube-scheduler, etcd)
- systemd (service management)
- CNI plugins (cilium, calico, canal)
- kubectl
- YAML configuration

## Sources Consulted
- RKE2 official documentation: https://docs.rke2.io/
- RKE2 install instructions: https://docs.rke2.io/install/quickstart
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 high availability docs: https://docs.rke2.io/install/ha
- Kubernetes kube-apiserver auditing reference: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- etcd FAQ on cluster sizing / odd quorum: https://etcd.io/docs/v3.5/faq/

## Issues Found
No technical issues found.

All technical details were verified against the official RKE2 documentation:

- Install command `curl -sfL https://get.rke2.io | sh -` is correct (default installs rke2-server type).
- Config file path `/etc/rancher/rke2/config.yaml` is correct.
- Configuration field names (`token`, `tls-san`, `cluster-cidr`, `service-cidr`, `cluster-dns`, `cni`, `disable`, `write-kubeconfig-mode`, `kube-apiserver-arg`, `server`) match the official server configuration reference.
- Default values are accurate: cluster-cidr `10.42.0.0/16`, service-cidr `10.43.0.0/16`, cluster-dns `10.43.0.10`.
- CNI plugin options (`cilium`, `calico`, `canal`) are valid (RKE2 also supports `flannel`, `multus`, `none`).
- `rke2-ingress-nginx` is a valid disable target.
- Audit log flags (`audit-log-path`, `audit-log-maxage`, `audit-log-maxbackup`, `audit-log-maxsize`) are valid kube-apiserver flags.
- Supervisor/registration port `9345` is correct (distinct from the kube-apiserver port 6443).
- Path `/var/lib/rancher/rke2/server/node-token` is the correct join token location.
- Path `/etc/rancher/rke2/rke2.yaml` is the correct admin kubeconfig location.
- Binary path `/var/lib/rancher/rke2/bin` is correct (contains kubectl, ctr, crictl, etc.).
- Kubelet log path `/var/lib/rancher/rke2/agent/logs/kubelet.log` is correct.
- HA recommendation of 3 or 5 server nodes (odd quorum) is correct per etcd Raft requirements.

## Review Notes
- The post uses the user-defined shared token (`my-super-secret-cluster-token`) to join additional server nodes. RKE2 also accepts the value from `/var/lib/rancher/rke2/server/node-token` (which has the form `<cluster-id>::server:<token>`). Both methods work for joining; using the shared token is simpler when the operator pre-defines it. The post is consistent and correct on this point.
- The `disable` comment refers to "air-gapped environments," but disabling `rke2-ingress-nginx` is unrelated to air-gapping — it is more about replacing the default ingress controller. This is a minor wording quirk rather than a technical error, so left as-is per review guidelines (no stylistic changes).
- For production clusters, users should also consider setting `node-label`, `node-taint`, and external etcd snapshot/backup configuration; out of scope for this post.
