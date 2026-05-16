# Validation Summary: How to Set Up GCP Persistent Disk CSI on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Google Cloud Compute Engine Persistent Disk
- GCP Persistent Disk CSI driver
- Kubernetes StorageClasses, PVCs, CSI drivers, VolumeSnapshots, and cloning
- Google Cloud IAM
- Kustomize and kubectl

## Sources Consulted
- Google Compute Engine IAM roles and permissions: https://cloud.google.com/compute/docs/access/iam
- Google Compute Engine Persistent Disk performance documentation: https://cloud.google.com/compute/docs/disks/performance
- Google Kubernetes Engine Compute Engine persistent disk CSI driver documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Kubernetes SIGs GCP Compute Persistent Disk CSI driver README and deployment docs: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes VolumeSnapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI Volume Cloning documentation: https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/

## Issues Found
- Replaced "Persistent Disk API" with "Compute Engine API" because Persistent Disk is managed through the Compute Engine API rather than a separate Persistent Disk API.
- Corrected the IAM comment that described `roles/iam.serviceAccountUser` as snapshot permissions. The upstream driver documentation says this role is needed so the CSI driver can impersonate node service accounts when attaching and detaching disks.
- Added the same `roles/iam.serviceAccountUser` binding to the dedicated service account example so it has the permissions required by the driver documentation.
- Corrected the deployment instructions. The upstream repository provides `deploy/kubernetes/overlays/stable-master/`, not `deploy/kubernetes/overlays/stable/`, and the namespace must exist before creating the `cloud-sa` secret manually.
- Removed the invalid official Helm chart instructions and replaced them with the upstream `deploy-driver.sh` flow. The Helm repository URL in the post does not publish a chart index, and the upstream driver documentation describes Kustomize manifests and deployment scripts.
- Added a prerequisite note for VolumeSnapshots because Kubernetes snapshot CRDs and the snapshot controller are the responsibility of the Kubernetes distribution, not the CSI driver alone.

## Review Notes
- The StorageClass examples use the correct `pd.csi.storage.gke.io` provisioner, valid GCP PD disk types, and the driver's `replication-type: regional-pd` parameter.
- `WaitForFirstConsumer` is appropriate for zonal and regional Persistent Disk provisioning because it delays binding until Kubernetes can account for pod scheduling constraints.
- The listed Persistent Disk IOPS figures match the current Google Cloud documentation for zonal Persistent Disk limits, but actual performance also depends on VM type, vCPU count, disk size, and workload I/O size.
