# Validation Summary: How to Set Up Rook-Ceph for Stateful Application HA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (RBD storage provisioner via CSI)
- Kubernetes StorageClass, StatefulSet, VolumeSnapshotClass, CronJob
- Ceph RBD (RADOS Block Device) with mirroring
- Kubernetes Volume Snapshots API (snapshot.storage.k8s.io/v1)
- PostgreSQL (as example stateful application)

## Sources Consulted
- Rook Ceph documentation — Block Storage (RBD) StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/stateful-set-v1/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- Kubernetes Pod spec — restartPolicy for Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/#pod-template

## Issues Found

1. **StatefulSet missing required `selector` field and `template.metadata.labels`**: The `apps/v1` StatefulSet API requires `spec.selector` to be set, and `spec.template.metadata.labels` must match the selector. The original YAML omitted both, which would cause an API server validation error. Added `selector.matchLabels` and `template.metadata.labels` with `app: postgresql-ha`.

2. **CronJob code fence incorrectly marked as `bash`**: The Automated Snapshot Schedule section used a `` ```bash `` code fence for what is a YAML manifest (a CronJob definition). Changed to `` ```yaml `` for correct syntax highlighting.

3. **CronJob pod template missing `restartPolicy`**: Kubernetes Jobs require `restartPolicy` to be either `Never` or `OnFailure`. The default value of `Always` is invalid for Job-based workloads and would be rejected by the API server. Added `restartPolicy: Never` to the pod template spec.

## Review Notes
- The CronJob example would also need a ServiceAccount with RBAC permissions to create VolumeSnapshot resources for the `kubectl apply` command to succeed. This is not technically an error in the YAML itself but is worth noting for readers implementing this pattern.
- The `rbd mirror image status` command references `database-pool/data-postgresql-ha-0` as the image name. In practice, CSI-provisioned RBD images have UUID-based names (e.g., `csi-vol-<uuid>`), not PVC-derived names. The command is syntactically correct but the image name would differ in a real cluster.
- The `ceph health` and `ceph osd dump` commands on lines 132 and 139 are shown without the `kubectl exec` wrapper into the toolbox pod, unlike line 135-136. For consistency, readers should run these inside the Rook toolbox pod as well.
