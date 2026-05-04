# Validation Summary: How to Configure Longhorn CSI Snapshotter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (Kubernetes block storage)
- Kubernetes CSI external-snapshotter (v6.3.3)
- Kubernetes VolumeSnapshot / VolumeSnapshotClass / VolumeSnapshotContent APIs (`snapshot.storage.k8s.io/v1`)
- Kubernetes PersistentVolumeClaim with `dataSource` snapshot restore
- Kubernetes CronJob (`batch/v1`)
- `kubectl` and the `bitnami/kubectl` image
- Velero (mentioned for ecosystem context)

## Sources Consulted
- Longhorn docs — CSI VolumeSnapshot Associated with Longhorn Snapshot: https://longhorn.io/docs/1.10.1/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Longhorn docs — Enable CSI Snapshot Support on a Cluster: https://longhorn.io/docs/1.11.0/snapshots-and-backups/csi-snapshot-support/enable-csi-snapshot-support/
- Longhorn enhancement proposal — Extend CSI snapshot to support Longhorn snapshot (v1.3.0): https://github.com/longhorn/longhorn/blob/master/enhancements/20220110-extend-csi-snapshot-to-support-longhorn-snapshot.md
- Longhorn manual test — Extended CSI snapshot support to Longhorn snapshot (v1.3.0): https://longhorn.github.io/longhorn-tests/manual/release-specific/v1.3.0/extend_csi_snapshot_support/
- Kubernetes docs — Volume Snapshot Classes (default annotation): https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes docs — Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- kubernetes-csi/external-snapshotter v6.3.3 release: https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v6.3.3

## Issues Found
- **Incorrect minimum Longhorn version.** The Prerequisites section listed "Longhorn v1.1.0 or later," but the post's primary VolumeSnapshotClass example uses `parameters.type: snap`. Per the Longhorn enhancement proposal and v1.3.0 release notes, `type: snap` (snapshot associated with a Longhorn snapshot) was only introduced in **Longhorn v1.3.0**. In earlier versions (v1.1.0–v1.2.x), CSI VolumeSnapshots only supported off-cluster backups (effectively `type: bak`). Updated the prerequisite to "Longhorn v1.3.0 or later" with a clarifying note that earlier versions only support `type: bak`.

## Review Notes
- The external-snapshotter v6.3.3 URLs (CRDs and snapshot-controller manifests) and paths (`client/config/crd/...`, `deploy/kubernetes/snapshot-controller/...`) are correct for that release.
- The default-class annotation `snapshot.storage.kubernetes.io/is-default-class` is correct (note: distinct from the StorageClass annotation `storageclass.kubernetes.io/is-default-class`). Per Kubernetes docs, only one default per CSI driver should be set.
- The `driver: driver.longhorn.io` value is correct.
- The `apiVersion: snapshot.storage.k8s.io/v1` is correct (v1 went GA in Kubernetes 1.20, matching the stated prerequisite).
- The `verify-restore` Pod uses `restartPolicy: Never` and a one-shot `ls` command; in practice readers may need to wait for the Pod to reach `Completed` before `kubectl logs` returns output, but this is a usability nit rather than a technical error.
- The CronJob example references `serviceAccountName: snapshot-sa` without including the RBAC manifest for that ServiceAccount; the inline comment flags this as a requirement, which is acceptable for a focused tutorial.
- A future revision could mention the `type: bi` parameter (Backing Image, available in newer Longhorn versions) for completeness, but its absence is not an error.
