# Validation Summary: How to Configure GKE Node Pools with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE node pools
- OpenTofu / HCL
- Google Cloud
- Kubernetes node labels, taints, and tolerations
- GPU node pools
- Spot VMs

## Sources Consulted
- Google provider docs for `google_container_node_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Google provider docs source for `google_container_cluster` nested `node_config` schema, including `taint`, `workload_metadata_config`, and `guest_accelerator`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_cluster.html.markdown
- GKE Spot VMs guide: https://cloud.google.com/kubernetes-engine/docs/how-to/spot-vms
- GKE Spot VMs concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- GKE GPUs guide: https://cloud.google.com/kubernetes-engine/docs/how-to/gpus
- GKE Workload Identity Federation for GKE guide: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- OpenTofu configuration syntax: https://opentofu.org/docs/language/syntax/configuration/

## Issues Found
- The general-purpose pool included an empty `taint {}` block. The provider schema requires `key`, `value`, and `effect`, so the block was invalid. I removed the block and kept the intent as a comment.
- The general-purpose pool enabled `workload_metadata_config { mode = "GKE_METADATA" }` without noting that this requires Workload Identity Federation for GKE to be enabled at the cluster level. I added a short comment so the snippet matches GKE requirements.
- The Spot section was labeled "Spot/Preemptible", but the configuration actually uses `spot = true`. I renamed the section to "Spot Pool for Batch Workloads" and removed the redundant `preemptible = false` line to avoid implying that both modes are being configured together.
- The Spot pool labels block tried to set `cloud.google.com/gke-spot` directly with an unquoted key, which is invalid OpenTofu/HCL syntax because identifiers cannot contain `.` or `/`. I removed that manual label and left only the custom `pool = "spot"` label. This also aligns with GKE behavior, because GKE automatically adds the `cloud.google.com/gke-spot=true` node label to Spot nodes.
- The GPU pool used `location = "us-central1-a"` while the other pools used the regional location `us-central1`. For a shared regional cluster, the node pool `location` must match the cluster location; zone pinning belongs in `node_locations`. I changed the node pool to use `location = "us-central1"` and added `node_locations = ["us-central1-a"]`.

## Review Notes
- `min_node_count` and `max_node_count` are per-zone limits on regional or multi-zonal clusters. If the post is later expanded to discuss exact node counts, it should clarify that `total_min_node_count` and `total_max_node_count` are the total-size alternatives.
- The GPU driver auto-install setting `gpu_driver_version = "LATEST"` is supported by the provider, but behavior is GKE-version-sensitive and `LATEST` is only available for nodes using Container-Optimized OS.
