# Validation Summary: Restore One StatefulSet Replica Without Losing Its PVC Identity

## Status
validated

## Post Type
Technical disaster-recovery guide

## Technologies Covered
- Kubernetes StatefulSets (`apps/v1`)
- PersistentVolumes and PersistentVolumeClaims
- StorageClasses and `WaitForFirstConsumer` volume binding
- CSI volume snapshots (`snapshot.storage.k8s.io/v1`)
- StatefulSet PVC retention policies and reclaim policies
- `kubectl`, Bash, JSONPath, and Kubernetes YAML manifests
- Distributed database replica recovery

## Sources Consulted
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes StatefulSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/)
- [Kubernetes: Scale a StatefulSet](https://kubernetes.io/docs/tasks/run-application/scale-stateful-set/)
- [Kubernetes: Run a Replicated Stateful Application](https://kubernetes.io/docs/tasks/run-application/run-replicated-stateful-application/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes VolumeSnapshotClass documentation](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes PersistentVolumeClaim API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes: Change the Reclaim Policy of a PersistentVolume](https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Object Names and IDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)
- [Kubernetes CSI VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes kubectl wait reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)

## Issues Found
- The post described the recreated claim as preserving its Kubernetes PVC identity. A deleted and recreated Kubernetes object receives a new UID. The introduction now states that the PVC UID changes and that the stable name-to-ordinal relationship—not the API object's UID—is what the StatefulSet continues to use.
- The safety-snapshot advice referred to a `VolumeSnapshotClass` "with `Retain`" without naming the relevant field. It now specifies `deletionPolicy: Retain`, which is the current `snapshot.storage.k8s.io/v1` field.
- The scale-down guidance treated the target ordinal too much like a replica count. That only works directly when the StatefulSet uses the default start ordinal of zero. The post now explains that replicas are a count and gives the correct `T-S` calculation for target ordinal `T` and configured start ordinal `S`.
- The post did not warn that the default `OrderedReady` behavior can block scale-down while a managed Pod is unhealthy. The workflow now calls out this limitation and directs readers to the workload owner's supported maintenance or recovery procedure instead of forcing deletion.
- The snapshot-backed PVC guidance omitted several restore constraints. It now states that the StorageClass must be backed by the snapshot's CSI driver, the snapshot referenced through `dataSource` must be in the PVC's namespace and ready to use, and raw block volumes require `volumeDevices` rather than filesystem mounting.
- The optional final validation Pod could prematurely provision a `WaitForFirstConsumer` volume in topology incompatible with the StatefulSet Pod. The post now requires that such a validation Pod reproduce the target Pod's scheduling constraints, or that the StatefulSet Pod remain the first consumer.

## Review Notes
- The post uses current stable API versions: `apps/v1`, core `v1` PVCs, and `snapshot.storage.k8s.io/v1` VolumeSnapshots. Snapshot restore still depends on the cluster having the snapshot CRDs, snapshot controller, a compatible external provisioner, and a CSI driver that implements snapshot restore.
- `.spec.ordinals.start` is stable from Kubernetes v1.31, and `.spec.persistentVolumeClaimRetentionPolicy` is stable from Kubernetes v1.32. Clusters older than those releases require version-specific checks.
- The `kubectl` command forms, flags, JSONPath expressions, reclaim-policy patch, PVC `dataSource`, access modes, volume modes, and requested-capacity guidance are otherwise technically correct.
- The post correctly distinguishes storage restoration from application-level replica recovery, quorum, fencing, and re-registration concerns.
