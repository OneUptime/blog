# Validation Summary: How to Use the Filestore CSI Driver to Mount NFS Volumes in GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud Filestore
- Filestore CSI driver
- Kubernetes StorageClass, PersistentVolume, PersistentVolumeClaim, and Deployment resources
- NFS
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud: Access Filestore instances with the Filestore CSI driver: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
- Google Cloud: About Filestore support for Google Kubernetes Engine: https://cloud.google.com/kubernetes-engine/docs/concepts/filestore-for-gke
- Google Cloud: Filestore Multishares for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/multishares
- Google Cloud: Optimize storage with Filestore Multishares for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/tutorials/optimize-multishares
- Google Cloud: Filestore service tiers: https://docs.cloud.google.com/filestore/docs/service-tiers
- Google Cloud SDK: gcloud container clusters create reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Kubernetes: Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The prerequisites stated a blanket GKE 1.21 minimum. Current Google Cloud documentation makes the minimum GKE version depend on the Filestore tier, protocol, and feature. Updated the prerequisite to call out tier-specific requirements relevant to the examples.
- The prerequisites mentioned Workload Identity or node service account permissions as a requirement for the managed GKE driver, but the official setup requirements instead emphasize API enablement, supported GKE versions, Linux nodes, and Shared VPC setup when applicable. Replaced this with the Linux node requirement.
- The driver lifecycle description said the driver handles attaching and detaching Filestore instances. Filestore is NFS-based, so the more accurate lifecycle language is creating, mounting, expanding, and deleting instances.
- The verification command used a pod label selector that is not documented as a stable way to verify the managed GKE add-on. Replaced it with checking the registered `CSIDriver` object.
- The Basic HDD example described a 1 TiB minimum. Current Filestore service tier documentation says Basic HDD provisioned through the GKE Filestore CSI driver supports 100 GiB and larger volumes, though sub-1 TiB instances consume 1 TiB of quota. Updated the comments and example PVC size.
- The pre-existing Filestore example used Kubernetes' in-tree `nfs` volume source, which bypasses the Filestore CSI driver. Replaced it with the official CSI `PersistentVolume` structure using `driver`, `volumeHandle`, and `volumeAttributes`.
- The multishare section said PVCs can be as small as 1 GB. Current documentation lists a 10 GiB minimum share size for modern multishare support. Updated the text and noted that the `max-volume-size` parameter requires driver version 1.27 or later for up to 80 shares.
- The verification commands used `kubectl exec deploy/my-app` twice, which does not guarantee the second read happens from a different pod. Updated the commands to select two distinct pods and use `sh`, which is safer for the nginx image than assuming `bash` is installed.

## Review Notes
The examples are technically valid after the corrections. In a future revision, the post could mention the GKE-provided StorageClasses such as `standard-rwx`, `premium-rwx`, `enterprise-rwx`, and `enterprise-multishare-rwx`, and could add Shared VPC firewall caveats for non-default networks.
