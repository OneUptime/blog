# Validation Summary: How to Manage etcd Cluster Member Replacement Without Data Loss

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- etcd
- etcdctl
- etcdutl
- Raft quorum
- TLS certificates
- systemd
- Prometheus

## Sources Consulted
- etcd v3.5 runtime reconfiguration guide: https://etcd.io/docs/v3.5/op-guide/runtime-configuration/
- etcd v3.5 runtime reconfiguration design: https://etcd.io/docs/v3.5/op-guide/runtime-reconf-design/
- etcd v3.5 disaster recovery guide: https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd v3.5 configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/
- Kubernetes operating etcd clusters guide: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes kubeadm HA external etcd guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/
- Kubernetes kubeadm certificate phase reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes PKI certificates and requirements: https://kubernetes.io/docs/setup/best-practices/certificates/

## Issues Found
- The etcdctl setup used the etcd serving certificate as the client certificate. Updated the example to use the kubeadm API server etcd client certificate and key, which are intended for client access to etcd.
- Several endpoint examples omitted the HTTPS scheme while the guide configured TLS. Updated health-check, read-test, and sample output endpoints to use `https://`.
- The removal section implied that removing the member first was always sufficient. Updated the wording to stop a still-running failed member before removal and keep it stopped after removal, matching the Kubernetes and etcd reconfiguration guidance.
- The certificate-copy section reused another member's server and peer certificates. Updated it to require member-specific server and peer certificates whose SANs include the new node, while copying only shared CA/client material as appropriate.
- The quorum-loss recovery section used `ETCD_FORCE_NEW_CLUSTER=true` as the main recovery path. Replaced it with the officially recommended snapshot restore flow using `etcdutl snapshot restore`, and noted that the API server should be stopped during restore.
- The recovery example stopped `kube-apiserver` with systemd even though kubeadm commonly runs it as a static pod. Updated the example to disable and restore the static pod manifest.
- The multiple-member replacement section said a five-member cluster could replace two members at a time. Updated it to replace one member at a time and wait for the replacement to become healthy before proceeding.

## Review Notes
The guide is technically valid after edits. In a future revision, the certificate generation example could be expanded with a complete kubeadm configuration for the replacement member, but that would be additional implementation detail rather than a correctness fix.
