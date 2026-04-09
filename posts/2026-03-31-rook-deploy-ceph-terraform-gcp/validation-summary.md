# Validation Summary: How to Deploy Ceph with Terraform on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (distributed storage orchestrator)
- Terraform (Infrastructure as Code)
- Google Cloud Platform (GCP)
- Google Kubernetes Engine (GKE)
- Google Compute Engine Persistent Disks / Local NVMe SSDs
- Helm (Kubernetes package manager)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Terraform Google Provider documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- `google_container_cluster` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- `google_container_node_pool` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- `google_compute_attached_disk` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_attached_disk
- Rook-Ceph Helm Charts documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/helm-charts/
- Rook-Ceph Operator Chart: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook-Ceph Cluster Chart: https://rook.io/docs/rook/latest-release/Helm-Charts/ceph-cluster-chart/
- GKE Local SSD documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/local-ssd
- GKE Node Pools documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/node-pools

## Issues Found

### 1. Critical: Broken OSD disk provisioning referencing undefined resource (fixed)
**What was wrong:** The "Persistent Disk Provisioning for OSDs" section used `google_compute_disk` and `google_compute_attached_disk` resources that referenced `google_compute_instance.storage_nodes`, a resource that was never defined anywhere in the post. GKE node pool instances are managed by GKE and cannot be referenced as `google_compute_instance` Terraform resources. This would cause an immediate Terraform error (`Reference to undeclared resource`).

**What was changed:**
- Added `local_nvme_ssd_block_config` with `local_ssd_count = var.osds_per_node` to the GKE node pool's `node_config` block. This is the standard approach for provisioning raw block devices for Rook-Ceph OSDs on GKE.
- Replaced the broken `google_compute_disk` and `google_compute_attached_disk` resources with an explanation that local NVMe SSDs are provisioned through the node pool configuration and auto-discovered by Rook-Ceph.
- Removed the `osd_disk_size_gb` variable, which is no longer needed since local NVMe SSDs have a fixed size of 375 GB each.

**Why:** The original code was fundamentally incompatible with GKE — it attempted to attach disks to bare `google_compute_instance` resources that don't exist when using GKE managed node pools. Local NVMe SSDs configured via `local_nvme_ssd_block_config` are the correct and recommended approach for providing raw block storage to Rook-Ceph on GKE.

## Review Notes
- Rook-Ceph version v1.13.0 is valid but outdated. More recent versions (v1.16+) are available. A future update could bump the chart versions.
- The Terraform Google provider constraint `~> 5.0` and Helm provider `~> 2.12` are current and appropriate.
- The VPC, subnet, GKE cluster, and Helm provider configuration are all technically correct.
- The post does not include the contents of `values/rook-cluster.yaml`, which is referenced by the Helm release. Readers will need to create this file with appropriate Rook cluster configuration. This is acceptable for the scope of the tutorial but could be noted.
- Local NVMe SSDs are ephemeral — data is lost if the node is deleted or recreated. This is a known trade-off for Ceph, which handles replication at the application level. The post could mention this in a future update.
- The `n2-standard-8` machine type supports local NVMe SSDs on GCP, so the configuration is valid.
