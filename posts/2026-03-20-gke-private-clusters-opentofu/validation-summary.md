# Validation Summary: How to Set Up GKE Private Clusters with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE private clusters
- Google Cloud VPC networking
- Private Google Access
- Cloud NAT
- OpenTofu / HCL with the Google provider
- Workload Identity for GKE

## Sources Consulted
- Google Cloud: About network isolation in GKE - https://cloud.google.com/kubernetes-engine/docs/concepts/network-isolation
- Google Cloud: Creating a private cluster - https://cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- Google Cloud: Private Google Access - https://cloud.google.com/vpc/docs/private-google-access
- Google Cloud: Access control with IAM for Artifact Registry - https://cloud.google.com/artifact-registry/docs/access-control
- Google Cloud: Configure restricted access for GKE private clusters - https://cloud.google.com/artifact-registry/docs/gke-private-clusters
- Terraform Registry: `google_container_cluster` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: `google_container_node_pool` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Terraform Registry: `google_compute_router` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router
- Terraform Registry: `google_compute_router_nat` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat

## Issues Found
- Clarified the overview text to say private nodes are not directly reachable from the public internet. The original wording could be read as "no outbound internet access at all," which is not accurate when Cloud NAT is configured.
- Clarified the Cloud NAT explanation and summary to say Cloud NAT is for outbound internet access to public endpoints, such as public registries. Private nodes can still reach Google APIs and services through Private Google Access, and Artifact Registry access has additional documented paths depending on configuration.

## Review Notes
Google now recommends DNS-based control plane endpoints as the best practice for simplified and policy-based control plane access. The IP-based private-cluster configuration shown in this post is still valid and supported, especially when combined with authorized networks.
