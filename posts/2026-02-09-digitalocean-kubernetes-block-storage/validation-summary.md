# Validation Summary: How to Configure DigitalOcean Kubernetes (DOKS) with Block Storage CSI Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DigitalOcean Kubernetes (DOKS)
- DigitalOcean Volumes Block Storage
- DigitalOcean CSI driver
- Kubernetes PersistentVolumeClaims, StatefulSets, StorageClasses, and VolumeSnapshots
- doctl CLI
- Prometheus and kubelet volume metrics

## Sources Consulted
- DigitalOcean Documentation: How to Add Volumes to Kubernetes Clusters - https://docs.digitalocean.com/products/kubernetes/how-to/add-volumes/
- DigitalOcean Documentation: DigitalOcean Volumes Block Storage Features - https://docs.digitalocean.com/products/kubernetes/details/volume-features/
- DigitalOcean Documentation: Volume Limits - https://docs.digitalocean.com/products/volumes/details/limits/
- DigitalOcean Documentation: doctl compute volume list - https://docs.digitalocean.com/reference/doctl/reference/compute/volume/list/
- DigitalOcean Documentation: doctl compute snapshot list - https://docs.digitalocean.com/reference/doctl/reference/compute/snapshot/list/
- DigitalOcean Documentation: doctl compute volume-action detach - https://docs.digitalocean.com/reference/doctl/reference/compute/volume-action/detach/
- DigitalOcean CSI driver repository and current v4.17.0 Kubernetes manifests - https://github.com/digitalocean/csi-digitalocean
- Kubernetes Documentation: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Documentation: Volume Snapshots - https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Documentation: Volume Snapshot Classes - https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes Documentation: Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The post claimed DigitalOcean Block Storage supports ReadWriteMany and multi-attach capabilities. DigitalOcean Block Storage supports ReadWriteOnce; ReadWriteMany requires a different storage product such as DigitalOcean NFS. Updated the description and introduction.
- The volume size and performance description was imprecise. Updated the size range to 1 GiB through 16 TiB and clarified that performance depends on attached Droplet type.
- The CSI driver pod label selector used `app.kubernetes.io/name=csi-do`, which does not match the current DigitalOcean CSI manifests. Updated examples to use `role=csi-do`.
- The StatefulSet verification command selected PVCs by `app=mongodb`, but the volume claim template did not set that label. Added the label to the PVC template metadata.
- The expansion section implied the default `do-block-storage` class might need patching. Current manifests enable `allowVolumeExpansion` by default. Updated the guidance to patch only custom storage classes where expansion is disabled.
- The snapshot listing command used `doctl compute volume-snapshot list`, which is not a current doctl command. Replaced it with `doctl compute snapshot list --resource volume`.
- The automated snapshot section attempted to create a duplicate `VolumeSnapshotClass` named `do-block-storage` with an unnecessary parameter. Changed it to a separate retained class named `do-block-storage-retain` and updated the CronJob to use it.
- The snapshot lifecycle statement said snapshots persist even if the cluster is deleted. Updated it to state that snapshot lifecycle follows the `VolumeSnapshotClass` deletion policy.
- The custom StorageClass section said no custom parameters are available and used `WaitForFirstConsumer` with a zone-based explanation. Current DigitalOcean CSI manifests support `fstype`, and DigitalOcean volumes are regional. Updated the example to use `fstype: xfs` and removed the incorrect zone explanation.
- The Prometheus monitoring example defined a metrics Service on port 9808 that is not present in the current DigitalOcean CSI driver manifest, and the example CSI operation metrics were not appropriate for the shown deployment. Replaced this with kubelet volume usage and capacity metrics.
- The troubleshooting section listed the DOKS node attachment limit as 7 volumes per node. Current DigitalOcean limits document 15 volumes per DOKS node. Updated the limit.

## Review Notes
The examples remain illustrative and assume the `production` namespace exists, required snapshot CRDs/controllers are present, `doctl` is authenticated, and pods include utilities such as `iostat` where used. For production workloads, the hard-coded PostgreSQL password should be replaced with a Kubernetes Secret.
