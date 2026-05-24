# Validation Summary: How to Create Kubernetes PersistentVolumes with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes PersistentVolumes (PVs)
- Kubernetes StorageClasses
- HostPath storage
- NFS storage
- GCE Persistent Disks (with `google_compute_disk`)
- AWS EBS volumes (with `aws_ebs_volume`)
- Kubernetes node affinity
- Access modes (RWO, ROX, RWX, RWOP)

## Sources Consulted
- Terraform Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/persistent_volume
- Terraform Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/storage_class
- Kubernetes PersistentVolumes docs: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses docs: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Access Modes docs (ReadWriteOncePod): https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- GCE PD CSI driver docs (`pd.csi.storage.gke.io`): https://cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes
- Terraform AWS provider `aws_ebs_volume` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- Terraform Google provider `google_compute_disk` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk

## Issues Found
No technical issues found.

All Terraform resource attributes and block structures match the official Terraform Kubernetes provider schema:
- `kubernetes_persistent_volume` with `metadata`, `spec` blocks, including `capacity`, `access_modes`, `persistent_volume_reclaim_policy`, `storage_class_name`, `mount_options`, `node_affinity`, and `persistent_volume_source`.
- `persistent_volume_source` sub-blocks (`host_path`, `nfs`, `gce_persistent_disk`, `aws_elastic_block_store`) use correct field names (`path`/`type`, `server`/`path`/`read_only`, `pd_name`/`fs_type`/`read_only`, `volume_id`/`fs_type`).
- `kubernetes_storage_class` uses the correct `storage_provisioner` field (not `provisioner`), with valid `reclaim_policy`, `volume_binding_mode`, `allow_volume_expansion`, and `parameters` attributes.
- `node_affinity` -> `required` -> `node_selector_term` -> `match_expressions` nesting is correct.
- `aws_ebs_volume` with `gp3`/`iops`/`throughput` is valid (gp3 supports both `iops` and `throughput` parameters).
- The `pd.csi.storage.gke.io` provisioner is the correct GKE CSI driver string.
- The ReadWriteOncePod (RWOP) access mode was indeed introduced in Kubernetes 1.22 (alpha; promoted to beta in 1.27 and GA in 1.29) — the "K8s 1.22+" note is accurate for first availability.
- Reclaim policies (Retain, Delete, Recycle) are correctly listed (Recycle is deprecated but still mentioned in K8s docs).
- The linked follow-up post (`2026-02-23-how-to-create-kubernetes-persistentvolumeclaims-with-terraform`) exists in the blog.

## Review Notes
- The in-tree `gce_persistent_disk` and `aws_elastic_block_store` volume plugins are deprecated in modern Kubernetes versions in favor of CSI drivers. The in-tree AWS EBS plugin was removed in K8s 1.27, and the in-tree GCE PD plugin was removed in K8s 1.31. On affected clusters, CSI migration translates these volume sources to CSI calls when migration is enabled. The Terraform syntax shown is still correct and supported by the provider, but readers using newer clusters may want to use the `csi` block (with the CSI driver name and volume handle) for new deployments. This is a forward-looking note, not an error — the post's examples remain technically valid.
- The `node_affinity` example for EBS uses `topology.kubernetes.io/zone`, which is the correct GA label (the older `failure-domain.beta.kubernetes.io/zone` was deprecated).
- The `kubernetes.io/hostname` label used in the HostPath example is a standard, well-known Kubernetes label.
