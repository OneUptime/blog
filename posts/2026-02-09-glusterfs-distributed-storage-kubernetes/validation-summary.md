# Validation Summary: How to Set Up GlusterFS as a Distributed Storage Backend for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- GlusterFS
- Heketi
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass
- Kubernetes DaemonSet

## Sources Consulted
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes PersistentVolume API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes v1.25 StorageClass documentation for deprecated GlusterFS provisioner: https://raw.githubusercontent.com/kubernetes/website/release-1.25/content/en/docs/concepts/storage/storage-classes.md
- Kubernetes v1.26 release announcement for GlusterFS in-tree driver removal: https://kubernetes.io/blog/2022/12/09/kubernetes-v1-26-release
- Kubernetes v1.25 storage in-tree to CSI migration status update: https://kubernetes.io/blog/2022/09/26/storage-in-tree-to-csi-migration-status-update-1.25/
- GlusterFS volume setup documentation: https://docs.gluster.org/en/v3/Administrator%20Guide/Setting%20Up%20Volumes/
- GlusterFS volume management documentation: https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- Heketi project documentation: https://heketi.github.io/heketi/
- Heketi archived Kubernetes example manifests: https://github.com/heketi/heketi/tree/master/extras/kubernetes
- Red Hat Gluster Storage life cycle policy: https://access.redhat.com/support/policy/updates/rhs

## Issues Found
- The post presented GlusterFS as a current Kubernetes storage backend. Kubernetes deprecated the in-tree GlusterFS volume driver in v1.25 and removed it in v1.26, so the Kubernetes PV and StorageClass examples do not work on current Kubernetes releases. Added a legacy compatibility note and updated the prerequisites to specify Kubernetes v1.25 or older.
- The post described the GlusterFS DaemonSet as client support. The referenced DaemonSet pattern is for running GlusterFS server pods; host-based GlusterFS deployments need GlusterFS client packages on Kubernetes nodes that mount the volume. Updated the explanatory text and aligned the DaemonSet metadata, labels, and node selector with the historical Heketi example pattern.
- The static PVC omitted `storageClassName: ""`. On clusters with a default StorageClass, Kubernetes can assign the default class to PVCs that omit `storageClassName`, preventing the claim from binding to a classless static PV. Added `storageClassName: ""` to both the PV and PVC examples.
- The Heketi deployment URL pointed to `heketi-deployment.yaml`, which returns 404 in the archived Heketi repository. Updated it to the existing `heketi-deployment.json` manifest.
- The Heketi topology load command created `topology.json` locally but referenced `/topology.json` inside the Heketi pod. Added a `kubectl cp` step and changed the load path to `/tmp/topology.json`.
- The StorageClass `resturl` used `http://heketi-service:8080`, but the archived Heketi deployment manifest creates a Service named `heketi`. Updated the URL to `http://heketi:8080`.

## Review Notes
The GlusterFS CLI examples for creating, starting, checking, healing, and expanding replicated volumes match GlusterFS documentation. The article is now accurate as legacy guidance, but it should not be treated as a recommended approach for new Kubernetes clusters. For current clusters, a supported CSI-based storage system is the appropriate path.
