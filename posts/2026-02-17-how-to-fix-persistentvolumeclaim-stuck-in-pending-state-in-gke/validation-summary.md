# Validation Summary: How to Fix PersistentVolumeClaim Stuck in Pending State in GKE

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes PersistentVolumeClaims and PersistentVolumes
- Kubernetes StorageClasses
- Compute Engine Persistent Disk CSI driver
- Filestore CSI driver
- Google Cloud CLI (`gcloud`)
- `kubectl`

## Sources Consulted
- GKE Compute Engine Persistent Disk CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- GKE Filestore CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
- GKE storage overview: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/storage-overview
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume access modes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Compute Engine Persistent Disk documentation: https://docs.cloud.google.com/compute/docs/disks/persistent-disks
- Compute Engine allocation quotas documentation: https://docs.cloud.google.com/compute/resource-usage
- Google Cloud CLI filter documentation: https://docs.cloud.google.com/sdk/gcloud/reference/topic/filters

## Issues Found
- The post used `standard-rw` and `premium-rw` as GKE persistent disk CSI StorageClass names. Current GKE documentation lists `standard-rwo` and `premium-rwo`, so those names and the example PVC were corrected.
- The post described `standard-rw` as Standard persistent disk (HDD). Current GKE documentation says `standard-rwo` uses balanced persistent disk, so the description was corrected.
- The post said persistent disks are zonal resources without qualification. GKE and Compute Engine also support regional persistent disks, so the wording now says "Zonal persistent disks" for the zone mismatch case.
- The quota command formatted and filtered nested quota entries without flattening them. The command now uses `--flatten="quotas[]"` and filters the flattened quota metrics before rendering the table.
- The post said standard persistent disks only support RWO. GKE documents read-only multi-node Persistent Disk usage, while persistent disk StorageClasses do not support RWX, so the text was narrowed to the RWX provisioning issue.
- The post said GKE uses the Compute Engine persistent disk CSI driver by default. GKE Autopilot always has it enabled, while Standard clusters must have it enabled, so the statement was corrected.
- The access mode list was phrased as exhaustive for GKE. It now says these modes are commonly used, avoiding omission of newer Kubernetes access modes such as ReadWriteOncePod.

## Review Notes
The Filestore example remains valid for the documented `tier: standard` example pattern, but Filestore tier names and minimum capacities vary by supported tier and GKE version. Future updates could mention the pre-installed Filestore StorageClasses such as `standard-rwx`, `premium-rwx`, `zonal-rwx`, and `enterprise-rwx`.
