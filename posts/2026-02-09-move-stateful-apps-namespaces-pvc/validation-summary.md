# Validation Summary: How to Move Stateful Applications Between Kubernetes Namespaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes StatefulSets
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- CSI VolumeSnapshots and VolumeSnapshotClasses
- CSI volume cloning and cross-namespace data sources
- Gateway API ReferenceGrant
- Amazon EBS CSI driver
- Google Compute Engine Persistent Disk CSI driver
- PostgreSQL streaming replication
- AWS CLI and S3
- Velero backups

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI Volume Cloning documentation: https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/
- Kubernetes cross-namespace data sources documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#cross-namespace-data-sources
- Kubernetes CSI cross-namespace data sources documentation: https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html
- Kubernetes v1.26 cross-namespace data sources blog: https://kubernetes.io/blog/2023/01/02/cross-namespace-data-sources-alpha/
- Amazon EKS CSI snapshot controller documentation: https://docs.aws.amazon.com/eks/latest/userguide/csi-snapshot-controller.html
- GKE Compute Engine Persistent Disk CSI driver documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Docker Official Image documentation for PostgreSQL: https://hub.docker.com/_/postgres
- PostgreSQL replication configuration documentation: https://www.postgresql.org/docs/current/runtime-config-replication.html
- Velero resource filtering documentation: https://velero.io/docs/main/resource-filtering/

## Issues Found
- The post implied that generic AWS EBS and GCP Persistent Disk storage classes typically support snapshots and clones. Updated the wording to clarify that CSI drivers and snapshot components are required, and that in-tree or migrated provisioners may not support snapshots.
- The storage class verification command was described as proving snapshot support, but it only lists storage class provisioners. Reworded it to say it identifies provisioners and checks for available `VolumeSnapshotClass` resources.
- The snapshot restore example created a `VolumeSnapshot` in `old-namespace` and then referenced it from a PVC in `new-namespace` with `dataSource`, which does not work by default because `VolumeSnapshot` is namespace-scoped. Updated the PVC to use `dataSourceRef` with `namespace`, added the required `ReferenceGrant`, and noted the `CrossNamespaceVolumeDataSource` requirement.
- The manual data-copy pod used `busybox` and then later ran `aws s3 cp`, but `busybox` does not include the AWS CLI and the archive was stored only in an `emptyDir` inside the pod. Changed the pod to use `amazon/aws-cli:2`, stream the tar archive directly to S3, and set `restartPolicy: Never`.
- The restore init container would rerun the restore on every pod initialization and could overwrite existing PostgreSQL data. Added a `PG_VERSION` guard so it only restores into an empty PostgreSQL data directory.
- The PV rebinding example used a hard-coded `volumeName` placeholder without making clear it must be replaced with the actual PV name. Updated the comment to reference the previously captured `$PV_NAME`.
- The PostgreSQL replication StatefulSet used non-existent replication environment variables for the official `postgres:15` image. Removed those variables and clarified that PostgreSQL streaming replication requires operator-managed or image-specific configuration such as standby setup, `primary_conninfo`, replication authentication, and WAL settings.
- The checksum validation SQL used an undefined `column_name` placeholder and no deterministic ordering. Replaced it with an ordered checksum pattern using `id` and an example data column.

## Review Notes
The guide is technically valid after the fixes, but the replication section remains intentionally high-level because correct zero-downtime migration is database- and operator-specific. Future improvements could show a complete CloudNativePG, Crunchy, Percona, or Bitnami PostgreSQL replication example with secrets, replication slots, and cutover steps.
