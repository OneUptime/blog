# Validation Summary: How to Implement iSCSI Persistent Volumes with Democratic CSI on Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StatefulSets
- Kubernetes CSI and VolumeSnapshot resources
- Democratic CSI
- Helm
- iSCSI / open-iscsi
- FreeNAS / TrueNAS with ZFS zvol-backed storage

## Sources Consulted
- Democratic CSI README and official installation notes: https://github.com/democratic-csi/democratic-csi
- Democratic CSI Helm chart usage: https://democratic-csi.github.io/charts/
- Democratic CSI official `freenas-iscsi` example: https://github.com/democratic-csi/democratic-csi/blob/master/examples/freenas-iscsi.yaml
- Democratic CSI Helm chart `freenas-iscsi` values example: https://github.com/democratic-csi/charts/blob/master/stable/democratic-csi/examples/freenas-iscsi.yaml
- Democratic CSI Helm chart templates for controller/node labels: https://github.com/democratic-csi/charts/tree/master/stable/democratic-csi/templates
- Democratic CSI snapshot-controller chart README: https://github.com/democratic-csi/charts/tree/master/stable/snapshot-controller
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes CSI developer VolumeSnapshot API reference: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html

## Issues Found
- The post described `freenas-iscsi` provisioning ZFS datasets. Democratic CSI's FreeNAS/TrueNAS iSCSI drivers provision ZFS zvols for block storage, so the architecture and verification text now says zvols.
- The Democratic CSI values snippet used dataset/NFS-style ZFS fields (`datasetEnableQuotas`, `datasetPermissions*`) in an iSCSI configuration. These were replaced with the zvol fields shown in the official iSCSI example (`zvolEnableReservation`, `zvolCompression`, `zvolDedup`, `zvolBlocksize`).
- The `freenas-iscsi` example only included API credentials, but the official `freenas-iscsi` driver example also includes `sshConnection` for ZFS operations. Added an SSH connection block and clarified the purpose of the API key versus SSH connection.
- The install commands did not label the namespace for privileged pods. Democratic CSI documents that the namespace should allow privileged pods, so the namespace label command was added.
- The troubleshooting log commands used `app=democratic-csi-controller` and `app=democratic-csi-node`, which are not labels set by the current Helm chart. Updated the selectors to use the chart's `app.kubernetes.io/name` and `app.kubernetes.io/csi-role` labels.
- The snapshot section omitted the prerequisite that VolumeSnapshot CRDs and the snapshot controller must already be installed. Added that prerequisite before the snapshot manifests.

## Review Notes
- The Kubernetes PVC, StatefulSet, VolumeSnapshotClass, and VolumeSnapshot manifests use current stable API versions and valid field names.
- The StatefulSet example assumes a governing Service named `database` exists, which is normal for StatefulSets but not shown in the post.
- Helm and kubectl were not installed in the local environment, so CLI behavior was checked against official documentation and chart sources rather than local command help.
