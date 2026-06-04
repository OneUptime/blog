# Validation Summary: How to Run FoundationDB on Kubernetes with the FDB Operator

## Status
validated

## Post Type
Tutorial / Kubernetes operator deployment guide

## Technologies Covered
- FoundationDB
- FoundationDB Kubernetes Operator
- Kubernetes custom resources and manifests
- Kubernetes StorageClass and PersistentVolumeClaims
- FoundationDB backup and restore
- Prometheus-style monitoring

## Sources Consulted
- FoundationDB Kubernetes Operator README: https://github.com/FoundationDB/fdb-kubernetes-operator
- FoundationDB Kubernetes Operator user manual: https://github.com/FoundationDB/fdb-kubernetes-operator/tree/main/docs/manual
- FoundationDB Kubernetes Operator v1beta2 CRDs: https://github.com/FoundationDB/fdb-kubernetes-operator/tree/main/config/crd/bases
- FoundationDB Kubernetes Operator backup manual: https://github.com/FoundationDB/fdb-kubernetes-operator/blob/main/docs/manual/backup.md
- FoundationDB Kubernetes Operator scaling manual: https://github.com/FoundationDB/fdb-kubernetes-operator/blob/main/docs/manual/scaling.md
- FoundationDB Kubernetes Operator upgrades manual: https://github.com/FoundationDB/fdb-kubernetes-operator/blob/main/docs/manual/upgrades.md
- FoundationDB backup documentation: https://apple.github.io/foundationdb/backups.html
- Amazon EKS StorageClass documentation for the EBS CSI driver: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html

## Issues Found
- The install flow created an `fdb-system` namespace but applied the sample operator deployment without targeting that namespace, then verified pods in `fdb-system`. Removed the namespace step and made the verification command match the official sample deployment pattern. Added the official caveat to pin production installs to a release tag instead of `main`.
- The basic cluster was described as a three-node cluster even though the manifest creates multiple process pods. Reworded it as a cluster with dedicated storage, log, and stateless processes.
- The pod anti-affinity example used `fdb-process-class`, which does not match the operator's default process class label. Changed it to `foundationdb.org/fdb-process-class`.
- The AWS storage class used the deprecated in-tree `kubernetes.io/aws-ebs` provisioner. Updated it to the current EBS CSI driver provisioner, `ebs.csi.aws.com`.
- The client pod pointed `FDB_CLUSTER_FILE` at `/etc/foundationdb/fdb.cluster`, but the operator's ConfigMap exposes the cluster file as `cluster-file`. Changed the path to `/etc/foundationdb/cluster-file`.
- The backup credentials used AWS INI-style credentials, while FoundationDB blob credentials use the JSON account format documented for `FDB_BLOB_CREDENTIALS`. Updated the Secret example.
- The `FoundationDBBackup` manifest used invalid or incomplete v1beta2 fields, including missing required `version`, unsupported `backupDeploymentName`, and missing `blobStoreConfiguration`. Updated it to use `version`, `agentCount`, and `blobStoreConfiguration`.
- The restore manifest used `clusterName` and `backupURL`, which are not v1beta2 `FoundationDBRestore` fields. Updated it to use `destinationClusterName` and `blobStoreConfiguration`.
- The monitoring snippet referenced a non-existent official `foundationdb/fdb-prometheus-exporter:latest` image and implied a built-in metrics sidecar pattern. Replaced it with the supported `fdbcli --exec "status json"` status query and guidance to feed that into a monitoring pipeline or exporter.

## Review Notes
The post is now technically consistent with the current FoundationDB Kubernetes Operator v1beta2 API. The examples still use FoundationDB 7.1.x; that is version-specific and should be retested before production use, especially because the current operator samples now default to newer FoundationDB releases.
