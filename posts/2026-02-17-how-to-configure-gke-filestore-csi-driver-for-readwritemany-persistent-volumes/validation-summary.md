# Validation Summary: How to Configure GKE Filestore CSI Driver for ReadWriteMany Persistent Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Filestore
- Filestore CSI driver
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes Deployments and StatefulSets
- gcloud CLI

## Sources Consulted
- Google Cloud documentation: Access Filestore instances with the Filestore CSI driver - https://docs.cloud.google.com/filestore/docs/csi-driver
- Google Kubernetes Engine documentation: About Filestore support for Google Kubernetes Engine - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/filestore-for-gke
- Google Cloud Filestore documentation: About service tiers - https://docs.cloud.google.com/filestore/docs/service-tiers
- Google Cloud SDK reference: gcloud filestore instances create - https://docs.cloud.google.com/sdk/gcloud/reference/filestore/instances/create
- Google Cloud SDK reference: gcloud container clusters update - https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK reference: gcloud container clusters create - https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Kubernetes documentation: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- Corrected the description of `ReadWriteOnce`. The post said a `ReadWriteOnce` volume can be mounted by a single pod, but Kubernetes defines it as read-write mountable by a single node, and multiple pods on that node can still access it.
- Replaced "any number of pods across any number of nodes" with "multiple pods across multiple nodes" because Filestore has practical connection and service-tier limits.
- Updated Basic HDD minimum capacity guidance. Current Filestore documentation supports 100 GiB Basic HDD volumes on supported GKE versions, while volumes below 1 TiB still consume 1 TiB of quota.
- Corrected the performance section. The post incorrectly implied Basic HDD throughput scales to roughly 1,200 MiB/s at 10 TiB; current Filestore service-tier docs list Basic HDD as about 100 MiB/s up to 10 TiB, then about 180 MiB/s read and 120 MiB/s write above 10 TiB. The 1,200 MiB/s figure applies to Basic SSD read throughput.
- Updated the cost-optimization wording so it no longer depends on the outdated blanket 1 TiB Basic HDD minimum.
- Made the IAM troubleshooting note more accurate by referring to the identity used by the CSI driver rather than specifically the GKE node service account.

## Review Notes
The main Kubernetes manifests and `gcloud` examples are syntactically valid and align with the documented Filestore CSI driver provisioner name, static PV `volumeHandle` format, and Filestore instance creation flags. `gcloud` was not installed locally, so CLI validation was done against official Google Cloud SDK reference documentation.
