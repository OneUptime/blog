# Validation Summary: How to Create Persistent Volumes in Portainer via Manifest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (PersistentVolume, PersistentVolumeClaim, StorageClass)
- Portainer (Kubernetes management UI)
- NFS (Network File System) volumes
- Local storage volumes
- kubectl CLI
- YAML manifests

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volumes (NFS, local): https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Local Persistent Volumes blog (GA in 1.14): https://kubernetes.io/blog/2019/04/04/kubernetes-1.14-local-persistent-volumes-ga/
- Kubernetes Reclaim Policy reference: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaiming
- kubernetes-sigs/sig-storage-local-static-provisioner: https://github.com/kubernetes-sigs/sig-storage-local-static-provisioner
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes

## Issues Found
1. **Local PV reclaim policy was set to `Delete`** — The in-tree Kubernetes `local` volume plugin does not implement a Deleter, so setting `persistentVolumeReclaimPolicy: Delete` on a local PV is misleading: the PV object is removed but the underlying storage (data on the node's disk) is not actually deleted. Only `Retain` is properly supported by the in-tree local volume plugin (the external `sig-storage-local-static-provisioner` can implement Delete-style cleanup, but that wasn't the context shown). I changed the local PV example to `persistentVolumeReclaimPolicy: Retain` and added a brief inline comment explaining the constraint.

## Review Notes
- The NFS PV manifest is correct: `ReadWriteMany` is supported by NFS, `Retain` is appropriate, and the `nfs.path` / `nfs.server` fields are valid.
- The local PV manifest correctly includes `nodeAffinity`, which is required (not optional) for local PVs since local volumes are tied to a specific node.
- The PVC example correctly matches the PV's `storageClassName: manual` and uses an `accessModes` and `requests.storage` that are compatible with the PV (≤ PV capacity, same access mode).
- The reclaim policy comparison table is accurate: `Recycle` is correctly noted as deprecated (deprecated in Kubernetes 1.11, removed from in-tree plugins in later releases — dynamic provisioning is the modern replacement).
- The kubectl commands (`apply -f`, `get pv`, `get pvc --namespace=production`) are correct and current.
- The `apiVersion: v1` is correct for both PV and PVC core resources.
- Future improvement (not a correctness issue): for production local-storage workloads, users typically pair static local PVs with the `sig-storage-local-static-provisioner` to automate PV lifecycle management — worth a future cross-reference but out of scope for this guide.
