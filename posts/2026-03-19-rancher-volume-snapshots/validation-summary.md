# Validation Summary: How to Configure Volume Snapshots in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes `VolumeSnapshot`, `VolumeSnapshotClass`, and `PersistentVolumeClaim`
- CSI snapshot controller and CSI storage drivers
- `kubectl`
- Kubernetes RBAC, CronJobs, and ServiceAccounts
- Amazon EBS CSI, Azure Disk CSI, Google Persistent Disk CSI, and vSphere CSI examples
- MySQL and PostgreSQL pre-snapshot consistency steps

## Sources Consulted
- Kubernetes: Volume Snapshots - https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes: Volume Snapshot Classes - https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes: `kubectl wait` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes: `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes CSI docs: Snapshot Controller - https://kubernetes-csi.github.io/docs/snapshot-controller.html
- Kubernetes CSI docs: external-snapshotter - https://kubernetes-csi.github.io/docs/external-snapshotter.html
- Kubernetes CSI external-snapshotter README v7.0.1 - https://github.com/kubernetes-csi/external-snapshotter/blob/v7.0.1/README.md
- Kubernetes CSI external-snapshotter release v7.0.1 - https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v7.0.1
- Kubernetes CSI snapshot-controller manifest v7.0.1 - https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
- Rancher: Access Clusters - https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Amazon EKS: Enable snapshot functionality for CSI volumes - https://docs.aws.amazon.com/eks/latest/userguide/csi-snapshot-controller.html
- Microsoft Learn: Create and manage persistent volumes with Azure Disks in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-csi-disk-storage-provision
- Google Cloud: Back up Persistent Disk storage using volume snapshots - https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/backup-pd-volume-snapshots
- MySQL 8.0 Reference Manual: FLUSH Statement - https://dev.mysql.com/doc/refman/8.0/en/flush.html

## Issues Found
- The installation section treated the snapshot controller as a generic add-on without version-compatibility guidance. I corrected it to state that the controller and CRDs are usually installed by the Kubernetes distribution and added a version note: the example uses external-snapshotter `v7.0.1`, while Kubernetes `1.25+` clusters should use an `8.x` release.
- The readiness check for `VolumeSnapshot` omitted `-n default`, even though the example snapshot is created in the `default` namespace. I added the namespace so the command matches the manifest shown earlier.
- The restore and clone sections implied that any `StorageClass` would work. I clarified that the target PVC must use a `StorageClass` backed by the same CSI driver as the source volume and must request at least the snapshot restore size.
- The scheduled snapshot CronJob used `kubectl apply -f -` for uniquely named snapshots while the accompanying RBAC only granted `create`, `get`, and `list`. I changed the command to `kubectl create -f -`, which fits the generated one-shot snapshot objects and the stated permissions.
- The `RoleBinding` for `snapshot-sa` omitted the ServiceAccount namespace in `subjects`. I added `namespace: default` so the binding unambiguously targets the intended ServiceAccount.
- The pre-snapshot MySQL example was incorrect because `FLUSH TABLES WITH READ LOCK` was executed in a short-lived `mysql -e` session, which releases the lock as soon as that session exits. I replaced it with a same-session workflow that keeps the MySQL connection open while the snapshot is taken from another terminal.
- The pre-snapshot filesystem-freeze example lacked an important runtime requirement. I added that the container must include `fsfreeze` and have the privileges required to freeze the mounted filesystem.
- The troubleshooting commands used unreliable label selectors such as `app=snapshot-controller` and `app=csi-controller`. I replaced the snapshot-controller selector with the upstream manifest label `app.kubernetes.io/name=snapshot-controller` and changed the CSI driver log guidance to identify the driver controller pod first, then inspect its `csi-snapshotter` container logs.

## Review Notes
- The retention cleanup example uses `date -d`, which assumes GNU coreutils. It is fine on most Linux hosts and containers, but users running the command from macOS may need an alternative date-expression syntax.
- The CronJob example still uses `bitnami/kubectl:latest`. The example is workable, but pinning that image to a cluster-compatible Kubernetes version would reduce version-skew risk in production.
