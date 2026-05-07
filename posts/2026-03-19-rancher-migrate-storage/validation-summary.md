# Validation Summary: How to Migrate Storage Between Clusters in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Persistent Volumes and PersistentVolumeClaims
- VolumeSnapshot / VolumeSnapshotContent
- Velero
- `kubectl`
- `rsync`
- NFS
- PostgreSQL
- MySQL

## Sources Consulted
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes `kubectl cp` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Velero installation customization docs: https://velero.io/docs/main/customize-installation/
- Velero cluster migration docs: https://velero.io/docs/v1.13/migration-case/
- `rsync --help` from the local `rsync 3.2.7` CLI and the rsync project site: https://rsync.samba.org/

## Issues Found
- The original `rsync` method was not workable. It used `kubectl port-forward`, which forwards to the reviewer’s local machine, while the copy command ran inside the source pod. It also paired SSH-style forwarding with `rsync://` daemon syntax. I changed the destination pod to run an rsync daemon, exposed it with a temporary Service, and updated the copy command to use a reachable rsync daemon endpoint.
- The `kubectl cp` section omitted a required dependency from the official docs. I added the note that the involved pods need `tar` installed.
- The cloud snapshot section understated the prerequisites and had follow-up commands missing the source context and namespace. I added the CSI snapshot prerequisites, fixed the `kubectl get` commands, and corrected the explanation from “create a PV on the destination cluster” to creating a pre-provisioned `VolumeSnapshotContent` and `VolumeSnapshot`, then a PVC using `dataSource`.
- The PostgreSQL and MySQL restore examples used shell redirection outside the container with `kubectl exec`, which would not import the copied file inside the pod. I changed those to run through `sh -c` inside the container.
- The MySQL dump and restore examples previously relied on interactive `-p` prompting, which is not suitable for these non-interactive `kubectl exec` examples. I replaced that with explicit non-interactive password placeholders. I also made the PostgreSQL examples explicit in the same way for consistency.

## Review Notes
- Velero’s cluster migration guidance requires both clusters to point at the same object storage location, which the post already describes. The same docs also note that Velero does not support restoring into a cluster with a lower Kubernetes version than the source cluster.
- Kubernetes volume snapshots are CSI-only and depend on cluster-installed snapshot CRDs/controllers plus storage-driver support. Cross-cluster snapshot reuse is only practical when both clusters can access the same underlying snapshot backend.
