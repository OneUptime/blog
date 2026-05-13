# Validation Summary: How to Deploy GKE Filestore CSI Driver with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud Filestore
- GKE Filestore CSI driver
- Kubernetes StorageClass, PersistentVolumeClaim, Namespace, and Deployment manifests
- Flux CD GitRepository and Kustomization resources
- Google Cloud CLI
- kubectl

## Sources Consulted
- Google Cloud GKE Filestore CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
- Google Cloud Filestore service tiers documentation: https://docs.cloud.google.com/filestore/docs/service-tiers
- Flux Kustomization documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The introduction incorrectly said the GKE Filestore CSI driver was installed via Flux using a HelmRelease. The post does not include a HelmRelease, and GKE documents the driver as a managed add-on enabled on the cluster. Updated the text to say Flux manages the StorageClass and workload manifests.
- The prerequisites used a broad `GKE 1.21+` statement without tying it to a Filestore service tier and volume size. Updated it to say the required version depends on the tier, with the post's Basic HDD/SSD NFSv3 example scoped to 1 TiB and larger volumes.
- The verification command checked for a DaemonSet using an undocumented label selector. Replaced it with `kubectl get csidriver filestore.csi.storage.gke.io`, which verifies the registered CSI driver name documented by Google Cloud.
- The StorageClass section said the manifest provisions enterprise-tier Filestore instances, but the YAML uses `tier: standard`. Updated the wording to Basic HDD Filestore instances.
- The infrastructure Flux Kustomization used `healthChecks` against a StorageClass. Flux documents health checks for specific built-in resource kinds and kstatus-compatible resources, while StorageClass has no readiness status. Removed the StorageClass health check and clarified that successful application is sufficient for dependent Kustomizations.
- The application manifests referenced the `shared-content` namespace but did not create it. Added a Namespace manifest before the PVC and Deployment.
- The best-practices section advised setting `capacity` in StorageClass parameters for enterprise tier. The documented Filestore CSI examples size dynamically provisioned volumes through PVC storage requests, so this was changed to recommend explicit PVC storage requests that match the intended tier capacity range.

## Review Notes
The post is technically valid after the corrections. Google Cloud also installs pre-defined Filestore StorageClasses such as `standard-rwx`, `premium-rwx`, `zonal-rwx`, and `enterprise-rwx` when the add-on is enabled, so a custom StorageClass is mainly needed when changing parameters such as network, reclaim policy, or binding behavior.
