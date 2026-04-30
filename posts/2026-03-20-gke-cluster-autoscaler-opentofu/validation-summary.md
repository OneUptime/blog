# Validation Summary: How to Configure GKE Cluster Autoscaler with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Cluster Autoscaler
- Node Auto Provisioning (NAP)
- OpenTofu / HCL
- Kubernetes PodDisruptionBudget
- Google Cloud Terraform provider

## Sources Consulted
- Google provider `google_container_node_pool` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Google provider `google_container_cluster` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- GKE cluster autoscaler concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- GKE cluster autoscaling guide: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- GKE node auto-provisioning guide: https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-provisioning
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The Step 1 node pool example combined `min_node_count` / `max_node_count` with `total_min_node_count` / `total_max_node_count`. The Google provider documents those as mutually exclusive, so I removed the `total_*` arguments.
- The Step 2 autoscaling-profile example included `resource_limits` in a snippet where `enabled = false` disables node auto-provisioning. I removed those limits so the example no longer implies they are required for a manually managed node-pool setup.
- The Step 4 comments and summary overstated scale-down behavior. I changed the wording to reflect that PodDisruptionBudgets limit voluntary evictions and are respected during node removal, rather than implying generic GKE annotations/settings or guaranteed safety.

## Review Notes
- The post is technically accurate for a GKE Standard cluster after the fixes above.
- If the post later reintroduces `total_min_node_count`, `total_max_node_count`, or `location_policy`, note that the provider docs describe version requirements for those features on supported GKE releases.
