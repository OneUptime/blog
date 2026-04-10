# Validation Summary: How to Back Up Rook-Ceph Cluster Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage operator)
- Ceph (distributed storage system)
- Kubernetes (CRDs, Secrets, ConfigMaps, StorageClasses, CronJobs)
- Helm (for Rook operator installation)
- kubectl CLI
- jq (JSON processing)

## Sources Consulted
- Rook Disaster Recovery Documentation — https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
- Rook CephCluster CRD Documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Helm Operator Chart Documentation — https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Rook RBD StorageClass Example — https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Rook CephFS StorageClass Example — https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/storageclass.yaml
- Rook CSI Drivers Documentation — https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Kubernetes StorageClass documentation — https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found

1. **StorageClass backup used incorrect label selector (lines 56-57)**: The original commands used `kubectl get storageclass -l provisioner=rook-ceph.rbd.csi.ceph.com` which filters by Kubernetes metadata labels. However, `provisioner` is a spec field on StorageClass, not a label, and Rook does not add such labels. These commands would silently return empty results. Fixed by using `kubectl get storageclass -o json | jq '.items[] | select(.provisioner=="...")'` to filter by the actual provisioner spec field.

2. **Ceph state export lost most output (lines 126-143)**: Inside the `kubectl exec` bash session, commands like `ceph osd dump > /tmp/osd-dump.txt` redirected output to files inside the container rather than to stdout. Only the CRUSH map text (via `cat /tmp/crush.txt`) was captured in the backup file. The OSD dump, pool configuration, auth keys, and config dump were all written to ephemeral container-local files and lost. Fixed by removing in-container file redirections so all output goes to stdout and gets captured in the backup file.

3. **CronJob description mismatched implementation (line 148)**: The text stated the CronJob "stores them in S3-compatible storage" but the YAML actually uses a PersistentVolumeClaim. Fixed the description to say "stores them to a PersistentVolumeClaim."

4. **dataDirHostPath described as "default" (line 116)**: The comment said "Default dataDirHostPath is /var/lib/rook" but per the CephCluster CRD docs, there is no default — if left empty, pods use ephemeral directories. `/var/lib/rook` is the conventionally configured value. Fixed the comment to say "Common dataDirHostPath" and added a note to check the CephCluster CR.

## Review Notes
- The Rook disaster recovery documentation also recommends backing up additional secrets beyond what's listed: `rook-ceph-mons-keyring`, `rook-ceph-admin-keyring`, `rook-ceph-config`, and `rook-ceph-mgr-a-keyring`. The post covers the core secrets but users doing full DR may want these as well.
- The restore section backs up CephFS CSI secrets but doesn't include them in the restore commands. This is a completeness gap rather than a technical error — users with CephFS would need to restore those too.
- The CronJob references a `rook-backup-sa` ServiceAccount and `backup-pvc` PVC that need to be created separately with appropriate RBAC permissions. The post doesn't cover RBAC setup, which could be a follow-up topic.
- All Ceph CLI commands (`ceph osd getcrushmap`, `crushtool -d`, `ceph osd dump`, `ceph osd pool ls detail`, `ceph auth list`, `ceph config dump`) are correct and current.
- The Helm install command `helm install rook-ceph rook-release/rook-ceph --namespace rook-ceph` is correct per official documentation.
- All Kubernetes resource names (secrets, configmaps, CRD types) were verified against official Rook documentation.
