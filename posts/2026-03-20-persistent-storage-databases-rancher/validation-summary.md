# Validation Summary: How to Configure Persistent Storage for Databases in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes (PersistentVolumes, PersistentVolumeClaims, StorageClasses, StatefulSets)
- Longhorn (cloud-native distributed block storage)
- Helm
- kubectl
- MySQL (as example database workload)
- S3-compatible object storage (for backups)

## Sources Consulted
- Longhorn Install with Helm: https://longhorn.io/docs/1.7.2/deploy/install/install-with-helm/
- Longhorn Helm chart values.yaml: https://github.com/longhorn/charts/blob/master/charts/longhorn/values.yaml
- Longhorn StorageClass Parameters reference: https://longhorn.io/docs/1.7.2/references/storage-class-parameters/
- Longhorn Settings reference: https://longhorn.io/docs/1.7.2/references/settings/
- Longhorn Set Backup Target: https://longhorn.io/docs/1.7.2/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Volumes / Create Volumes: https://longhorn.io/docs/1.7.2/nodes-and-volumes/volumes/create-volumes/
- Kubernetes Change Default Storage Class: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes PersistentVolume / PVC documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
No technical issues found.

All verified items:
- Helm repo URL `https://charts.longhorn.io` is correct.
- `defaultSettings.defaultReplicaCount` is the correct Helm value path.
- StorageClass default-class annotation `storageclass.kubernetes.io/is-default-class` is correct.
- Provisioner `driver.longhorn.io` is correct.
- StorageClass parameters `numberOfReplicas`, `dataLocality: "best-effort"`, and `diskSelector` are all valid with these exact names.
- S3 backup target URL format `s3://<bucket>@<region>/` (with trailing slash) is correct.
- `kubectl patch setting backup-target -n longhorn-system --type merge ...` uses the correct singular CRD resource name and patch syntax.
- Longhorn does register a default StorageClass named `longhorn` after installation.
- PVC YAML uses correct apiVersion (`v1`), kind, accessMode (`ReadWriteOnce` is the right choice for most single-writer database workloads), and resource request format.
- StatefulSet excerpt correctly uses `mountPath: /var/lib/mysql` (the standard MySQL data directory) and the `persistentVolumeClaim.claimName` reference structure is valid.
- StorageClass YAML uses the correct `apiVersion: storage.k8s.io/v1`, valid `reclaimPolicy: Retain`, and valid `volumeBindingMode: WaitForFirstConsumer`.

## Review Notes
- The `diskSelector: "ssd"` parameter requires that Longhorn nodes/disks have been tagged with the `ssd` tag beforehand. The post does not explicitly walk through tagging disks, but the comment "Only use SSD-labeled disks" hints at the prerequisite. Future revisions could add a one-liner about tagging disks via the Longhorn UI or `kubectl edit nodes.longhorn.io`.
- The post recommends `ReadWriteOnce` for databases, which is correct for single-instance databases. For clustered databases that need shared storage (rare), users would need a different access mode and provisioner — a caveat could be useful but is not a technical error.
- The `kubectl patch setting backup-target` command works because `setting` resolves to the Longhorn `settings.longhorn.io` CRD; if a future Kubernetes version introduces another resource with a conflicting short name, the fully qualified `settings.longhorn.io` may become necessary, but currently this command is correct.
- All commands and YAML are aligned with current Longhorn versions (verified against 1.7.2 docs) and Kubernetes APIs that have been stable for many releases.
