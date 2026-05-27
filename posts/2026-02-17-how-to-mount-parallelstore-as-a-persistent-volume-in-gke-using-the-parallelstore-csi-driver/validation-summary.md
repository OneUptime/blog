# Validation Summary: How to Mount Parallelstore as a Persistent Volume in GKE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Parallelstore
- Google Kubernetes Engine
- Kubernetes PersistentVolume and PersistentVolumeClaim
- Kubernetes StorageClass
- Parallelstore CSI driver
- Google Cloud CLI
- kubectl

## Sources Consulted
- Google Cloud Parallelstore CSI driver overview: https://docs.cloud.google.com/parallelstore/docs/csi-driver-overview
- Google Cloud guide to accessing existing Parallelstore instances from GKE: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/parallelstore-csi-existing-instance
- Google Cloud Parallelstore CSI driver reference: https://docs.cloud.google.com/parallelstore/docs/csi-driver-reference
- Google Cloud guide to creating a Parallelstore instance: https://docs.cloud.google.com/parallelstore/docs/create-instance
- Google Cloud guide to managing Parallelstore instances: https://docs.cloud.google.com/parallelstore/docs/instances
- Google Cloud Parallelstore IAM documentation: https://docs.cloud.google.com/parallelstore/docs/access-control
- Kubernetes documentation for PersistentVolumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The instance creation command used `gcloud parallelstore` instead of the documented `gcloud beta parallelstore` command. Updated the create and describe commands to use `gcloud beta parallelstore`.
- The example capacity used `12288` GiB / `12Ti`, but Parallelstore instance capacity is configured from 12,000 GiB in multiples of 4,000 GiB. Updated examples to use `12000Gi` / `--capacity-gib=12000`.
- The create command omitted the documented file and directory striping flags. Added balanced striping flags to match current Google Cloud CLI examples.
- The prerequisites described the instance as being in the same region, but Parallelstore is zonal and Google recommends placing it in the same zone as the clients. Updated the wording to same VPC and supported zone.
- The static PersistentVolume used an incorrect `volumeHandle` format and omitted required access points. Updated the PV to use `PROJECT_ID/LOCATION/INSTANCE_NAME/default-pool/default-container` format and added `volumeAttributes.accessPoints`.
- The PersistentVolume manifest omitted the documented provisioner annotation, `volumeMode`, and static binding `claimRef`. Added these fields.
- The workload mounted the same PVC through two separate volume definitions. Simplified it to one volume with two mounts, including the checkpoint `subPath`.
- The workload did not include the documented `gke-parallelstore/volumes: "true"` annotation. Added it to the pod template to avoid sidecar injection ambiguity.
- The troubleshooting section referenced a non-existent `roles/parallelstore.user` role. Replaced this with the documented distinction between IAM for Parallelstore API operations and POSIX permissions for mounted file access.

## Review Notes
Local `gcloud` and `kubectl` binaries were not installed in the review workspace, so command validation was performed against current official documentation rather than local help output. The post remains focused on static provisioning of an existing Parallelstore instance; dynamic provisioning has additional StorageClass and PVC workflows that are outside this post's scope.
