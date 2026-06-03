# Validation Summary: How to Use ReadWriteOncePod Access Mode for Single-Pod Exclusive Volume Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- ReadWriteOncePod access mode
- CSI storage drivers and sidecars
- Deployments
- StatefulSets
- PodDisruptionBudgets
- VolumeSnapshots
- kubectl
- PostgreSQL containers

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes task for changing a PersistentVolume access mode to ReadWriteOncePod: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-access-mode-readwriteoncepod/
- Kubernetes ReadWriteOncePod GA announcement: https://kubernetes.io/blog/2023/12/18/read-write-once-pod-access-mode-ga/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/

## Issues Found
- The prerequisites used `kubectl version --short`, but the current official `kubectl version` reference no longer documents `--short`. Changed the command to `kubectl version`.
- The prerequisites suggested checking `CSIDriver.volumeLifecycleModes` to verify RWOP support. That field describes volume lifecycle mode, not access mode support. Replaced it with checks for installed CSI drivers and compatible CSI sidecar versions required by Kubernetes documentation.
- The second-pod conflict example showed a `FailedMount` multi-attach event. Kubernetes documents RWOP conflicts as scheduler failures when another pod is already using the same RWOP PVC. Updated the example event to `FailedScheduling`.
- The StatefulSet example used `kubectl get pvc -l app=postgres`, but the generated PVCs did not have that label. Added `app: postgres` labels to the `volumeClaimTemplates` metadata.
- The StatefulSet example referenced a governing Service and a PostgreSQL Secret without defining them. Added a headless Service to the snippet and changed the password to an inline value for consistency with the earlier example.
- The RWO-to-RWOP migration flow deleted the PVC and recreated a claim from a snapshot, which did not accurately preserve the existing PV and could delete storage depending on reclaim policy. Updated the steps to set the PV reclaim policy to `Retain`, clear the old claim UID, patch the PV access mode, and recreate the PVC bound to the same PV.
- The PodDisruptionBudget section claimed it ensured high availability during node maintenance. A PDB with `maxUnavailable: 0` prevents voluntary evictions and can block node drains, but it does not guarantee high availability. Updated the wording to match Kubernetes PDB semantics.
- The PDB PostgreSQL deployment omitted required PostgreSQL environment variables and used a `pg_ctl` data directory inconsistent with the configured `PGDATA`. Added `POSTGRES_PASSWORD`, `PGDATA`, and updated the preStop command path.
- The monitoring section said it found pods using RWOP volumes, but the command listed pods using any PVC. Updated the comment to describe the command accurately.
- The Deployment best-practice wording implied all RWOP Deployments must have one replica. Clarified that the replica count must be 1 when Deployment replicas share one RWOP PVC.

## Review Notes
- The StatefulSet example demonstrates independent PostgreSQL pods with separate exclusive volumes; it does not configure PostgreSQL replication or a real database cluster.
- The snapshot examples are syntactically consistent with the Kubernetes VolumeSnapshot API, but they assume the external snapshotter, snapshot CRDs, RBAC, and a matching `VolumeSnapshotClass` are installed.
