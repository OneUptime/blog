# Validation Summary: How to Set Up Harvester Storage for Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- Longhorn
- CSI
- PersistentVolumeClaim (PVC)
- StorageClass
- VolumeSnapshotClass
- Rancher RKE2
- Helm

## Sources Consulted
- Harvester CSI Driver docs: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Harvester StorageClass docs: https://docs.harvesterhci.io/v1.6/advanced/storageclass/
- Harvester volume docs: https://docs.harvesterhci.io/v1.7/volume/index/
- Harvester CSI driver chart release `0.1.28` from the official charts repository: https://github.com/harvester/charts/releases/download/harvester-csi-driver-0.1.28/harvester-csi-driver-0.1.28.tgz
- Harvester CSI driver source repository: https://github.com/harvester/harvester-csi-driver
- Longhorn install docs: https://longhorn.io/docs/latest/deploy/install/
- Longhorn Helm install docs: https://longhorn.io/docs/1.10.0/deploy/install/install-with-helm/
- Kubernetes Volume Snapshots docs: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- The description and opening explanation overstated that guest clusters use Harvester Longhorn "directly" and described the setup as "cross-cluster storage access." I changed that to explain that guest clusters provision volumes from the host Harvester storage pool through the Harvester CSI driver, which matches the official Harvester CSI documentation.
- The automatic-install statement for the Harvester CSI driver was too broad. I changed it to the documented behavior: automatic deployment applies when provisioning an RKE2 cluster through Rancher on Harvester with the Harvester cloud provider selected; otherwise the driver must be installed from the Rancher marketplace or via Helm.
- The verification command used an incorrect pod label selector. I changed it from `app=harvester-csi-driver` to `app.kubernetes.io/name=harvester-csi-driver`, which matches the current official chart templates.
- The guest-cluster `StorageClass` example was not correct for current Harvester CSI behavior. The post was creating a second default `harvester` class even though the chart already creates that class, and it used `migratable`, which the Harvester CSI driver does not consume as a guest-cluster `StorageClass` parameter. I changed the example to a custom `harvester-custom` class that uses the documented `hostStorageClass` parameter and updated the PVC example to reference it.
- The volume verification command referenced `volumes.harvesterhci.io`, which is not the correct guest-cluster resource for this workflow. I changed the verification step to check the PVC in the guest cluster and inspect the backing Longhorn volume on the Harvester cluster.
- The snapshot section omitted the documented version prerequisites. I added the requirement for Harvester v1.7+ and Harvester CSI Driver v0.1.25+, noted that RKE2 includes the snapshot controller by default, and aligned the manual `VolumeSnapshotClass` example with the current chart-created `harvester-snapshot` resource.
- The Longhorn-in-guest-cluster option did not mention installation prerequisites. I added a short note that the guest cluster must meet Longhorn's installation requirements.
- The PVC example assumed a `production` namespace that was never created. I added a note clarifying that the namespace must already exist before applying the manifest.

## Review Notes
- Snapshot support is version-specific. The post is validated as corrected for Harvester documentation current on 2026-04-30, where guest-cluster snapshots require Harvester v1.7+ and Harvester CSI Driver v0.1.25 or later.
- The guest-cluster default `harvester` `StorageClass` and default `harvester-snapshot` `VolumeSnapshotClass` are created by current Harvester CSI chart releases, so manual creation is mainly relevant for customized or nonstandard installs.
- The example `hostStorageClass: harvester-longhorn` matches Harvester's default host-cluster `StorageClass`. On single-node Harvester clusters, that default class can be inappropriate unless its replica count is adjusted, as documented by Harvester.
