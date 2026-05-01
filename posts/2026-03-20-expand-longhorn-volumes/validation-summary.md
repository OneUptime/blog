# Validation Summary: How to Expand Longhorn Volumes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- PersistentVolumeClaims (PVCs)
- PersistentVolumes (PVs)
- Kubernetes StorageClass
- `kubectl`

## Sources Consulted
- Longhorn volume expansion docs: https://longhorn.io/docs/1.11.0/nodes-and-volumes/volumes/expansion/
- Longhorn storage class parameters docs: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn volume size and disk-space troubleshooting docs: https://longhorn.io/docs/1.11.0/nodes-and-volumes/volumes/volume-size/
- Kubernetes persistent volume expansion docs: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Longhorn `Volume` CRD schema: https://raw.githubusercontent.com/longhorn/longhorn/master/chart/templates/crds.yaml
- Longhorn `VolumeSpec` source: https://github.com/longhorn/longhorn-manager/blob/master/k8s/pkg/apis/longhorn/v1beta2/volume.go

## Issues Found
- The description implied the guide was generally "without downtime". I removed that wording because the post also documents offline expansion, which requires workload scale-down.
- The prerequisite `Kubernetes version 1.15 or later` for online expansion was outdated and too broad. I changed it to `Longhorn version 1.4.0 or later`, which matches Longhorn's documented online expansion prerequisite.
- The Longhorn UI steps were tied to a menu path that does not match the official docs. I updated the action to the documented `Expand` flow.
- The UI expansion section did not explain that bypassing the CSI PVC resize flow leaves Kubernetes PV/PVC capacity unchanged. I clarified that manual PV/PVC updates are required.
- The direct `volume.longhorn.io` resize method also bypasses the CSI PVC resize flow. I added the same PV/PVC synchronization caveat there.
- The offline expansion workflow said to wait for the PVC to be "released", which is the wrong object/state for this operation. I changed it to waiting for the Longhorn volume to detach.
- The insufficient-space troubleshooting command used `kubectl describe nodes | grep "Allocated resources"`, which does not show Longhorn disk free space. I replaced it with checking Longhorn node disks in the UI or the Longhorn data path on the node.
- The note claiming filesystem resize happens automatically for online expansion was too absolute. I narrowed it to supported Linux filesystems (`ext4` and `xfs`) on volumes using the block device frontend, which is what Longhorn documents.

## Review Notes
- Local `kubectl` was not available in the workspace, so command and behavior validation was done against official Kubernetes and Longhorn documentation plus the Longhorn CRD/source.
- The direct `volume.longhorn.io` patch method is technically valid based on the Longhorn CRD and `VolumeSpec.size` field, but Longhorn's user docs primarily document PVC-based and UI-based expansion paths.
