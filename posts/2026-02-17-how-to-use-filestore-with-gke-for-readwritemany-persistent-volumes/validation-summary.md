# Validation Summary: How to Use Filestore with GKE for ReadWriteMany Persistent Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Filestore
- Filestore CSI driver
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass
- Kubernetes Deployments and StatefulSets
- Google Cloud CLI
- kubectl
- NFS

## Sources Consulted
- Google Cloud: Access Filestore instances with the Filestore CSI driver: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
- Google Cloud: About Filestore support for Google Kubernetes Engine: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/filestore-for-gke
- Google Cloud: Filestore service tiers: https://docs.cloud.google.com/filestore/docs/service-tiers
- Google Cloud: Get Filestore instance information: https://docs.cloud.google.com/filestore/docs/getting-instance-information
- Google Cloud SDK: gcloud container clusters update reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Kubernetes: Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes: Volumes and subPathExpr: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The post said Persistent Disk with ReadWriteOnce limits data access to a single pod. Kubernetes documents ReadWriteOnce as single-node read-write mounting, and multiple pods on the same node can still access the volume. Changed the wording to "pods on a single node at a time."
- The pre-existing Filestore example used a generic Kubernetes `nfs` PersistentVolume. Kubernetes NFS PVs are valid, but the post is specifically about the GKE Filestore CSI driver and Google's current pre-provisioned Filestore guidance uses a CSI PersistentVolume with `driver: filestore.csi.storage.gke.io`, `volumeHandle`, and Filestore volume attributes. Updated the example to use the CSI PV format.
- The Filestore describe command only retrieved the instance IP. The corrected CSI PV example also needs the file share name, so the command now returns both `networks[0].ipAddresses[0]` and `fileShares[0].name`, using the current `--location` flag form shown in Filestore documentation.

## Review Notes
- The dynamic provisioning StorageClass and PVC examples match the GKE Filestore CSI driver pattern. GKE also installs default RWX StorageClasses such as `standard-rwx`, `premium-rwx`, `zonal-rwx`, and enterprise variants when supported by the cluster version.
- The post's Basic HDD performance note is accurate for 1 TiB to 10 TiB Basic HDD and Basic HDD on GKE volumes, but higher-capacity Basic HDD instances have different limits.
- The StatefulSet `subPathExpr` usage is supported by Kubernetes and is stable; it depends on downward API environment variable expansion.
