# Validation Summary: How to Set Up Longhorn for Database Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes StorageClass
- Kubernetes StatefulSet
- Kubernetes VolumeSnapshot and VolumeSnapshotClass
- PostgreSQL
- `kubectl`

## Sources Consulted
- Longhorn StorageClass parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn recurring snapshots and backups: https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn CSI VolumeSnapshot associated with a Longhorn snapshot: https://longhorn.io/docs/1.10.1/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Longhorn CSI snapshot support setup: https://longhorn.io/docs/1.11.1/snapshots-and-backups/csi-snapshot-support/enable-csi-snapshot-support/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/

## Issues Found
- The `dataLocality: best-effort` comment said Longhorn places a "primary replica" on the workload node. Longhorn documents `best-effort` as attempting to co-locate a replica with the workload, so the comment was corrected to match actual behavior.
- The `diskSelector` comment referred to a disk label, but Longhorn uses disk tags for selector matching. Updated the wording to "tagged".
- The recurring-job example used `kubectl patch lhvolume ... recurringJobSelector` with `isGroup: true` and the recurring job name. Longhorn's documented workflow applies recurring jobs via labels, and group assignment must use the group name. Replaced the command with `kubectl label volume/... recurring-job-group.longhorn.io/database=enabled`.
- The `retain: 7` comment claimed this always equals 42 hours of history. Longhorn retention is a count of retained backups, and backup creation can be skipped if no new data exists, so that time-window claim was removed.
- The `WaitForFirstConsumer` best-practice note said it ensures the volume is created on the same node as the Pod. Kubernetes documents it as delaying binding and provisioning until a consuming Pod exists so scheduling constraints can be considered. Reworded the explanation accordingly.
- The StatefulSet example depended on a headless Service named `postgres` and an existing `postgres-secret`, but that prerequisite was unstated. Added a brief note so the example is accurate about required resources.
- The VolumeSnapshot example assumed a `VolumeSnapshotClass` named `longhorn-snapshot-vsc` already existed. Longhorn documents that CSI snapshot support and a matching `VolumeSnapshotClass` are prerequisites, so that assumption is now stated explicitly.

## Review Notes
- `disableRevisionCounter: "true"` is a valid Longhorn StorageClass parameter and can improve write-path performance, but Longhorn documents it as a tradeoff best suited to stable network environments.
- `numberOfReplicas: "3"` is valid, but it assumes enough eligible nodes and tagged disks exist to schedule all replicas successfully.
- The post title mentions database workloads broadly, but the implementation example is PostgreSQL-only. That is not technically incorrect, though future revisions could add a MySQL example for symmetry with the description and tags.
- Local checks: `validation.json` was validated with `jq`. Runtime validation of the Kubernetes and Longhorn examples was not possible in this workspace because no cluster or Longhorn installation is available here.
