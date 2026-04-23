# Validation Summary: How to Set Up Local Path Provisioner for Development in Rancher (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Local Path Provisioner
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- Kubernetes StatefulSets
- K3s
- `kubectl`

## Sources Consulted
- Rancher Local Path Provisioner README: https://github.com/rancher/local-path-provisioner
- Rancher Local Path Provisioner releases: https://github.com/rancher/local-path-provisioner/releases
- Kubernetes: Change the default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes: Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes: Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes: Change the Reclaim Policy of a PersistentVolume: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/
- Kubernetes: StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- K3s Volumes and Storage: https://docs.k3s.io/add-ons/storage

## Issues Found
- The install manifest was pinned to `v0.0.26`, which is outdated. Updated it to the current stable release `v0.0.35` from the official `rancher/local-path-provisioner` repository.
- The helper pod example in `local-path-config` was incomplete relative to the current official manifest. Added the documented `priorityClassName` and disk-pressure toleration so the example matches current upstream behavior.
- The StatefulSet example depended on a headless Service but did not define one. Added the required headless `Service` because StatefulSets require it for stable network identity.
- The StatefulSet example created a `postgres-data` PVC in Step 4 but then ignored it by using `volumeClaimTemplates` in Step 5. Reworked the manifest to mount the existing PVC so the steps are consistent.
- The PostgreSQL example referenced a `postgres-secret` that was never created. Added a minimal development `Secret` manifest so the example is runnable as written.
- The node inspection commands hard-coded `/opt/local-path-provisioner`, which conflicts with the custom node paths shown earlier in the post. Replaced that with guidance to inspect the actual path reported by the PV and a `find` command that works with default and custom paths.
- The backup example attempted to archive data to `/backup/data.tar.gz` without defining a backup volume or directory, and it did not include a restore workflow. Replaced it with a stop-copy-restore-start flow using `rsync`, which is operational for a filesystem-level backup after the database is scaled down.
- The reclaim-policy section implied patching the StorageClass was the way to retain existing data. Updated it to use the officially documented PV reclaim-policy patch for existing volumes and kept a separate custom `StorageClass` example for future PVCs.

## Review Notes
- Local Path Provisioner is node-local storage. The exact data path depends on `nodePathMap` and the path selected for the node; readers should inspect the provisioned PV rather than assume `/opt/local-path-provisioner`.
- For future PVCs, the `Retain` StorageClass only takes effect when new claims explicitly use `storageClassName: local-path-retain` unless that class is also made default.
- The article is development-oriented. For production-grade PostgreSQL backups, logical backups or database-native backup tooling are usually preferable to raw volume copies.
