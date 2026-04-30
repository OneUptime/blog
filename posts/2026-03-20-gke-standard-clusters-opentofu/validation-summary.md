# Validation Summary: How to Create GKE Standard Clusters with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE) Standard
- Google Cloud
- OpenTofu / Terraform HCL
- Google provider for Terraform/OpenTofu
- Kubernetes node pools
- Workload Identity Federation for GKE

## Sources Consulted
- Google provider `google_container_cluster` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google provider `google_container_node_pool` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- About network isolation in GKE / authorized networks: https://cloud.google.com/kubernetes-engine/docs/how-to/authorized-networks
- Create a VPC-native cluster: https://cloud.google.com/kubernetes-engine/docs/how-to/alias-ips

## Issues Found
- The node pool example used `node_count` together with an `autoscaling` block. The current Google provider documentation says `node_count` should not be used alongside `autoscaling`. I changed `node_count = 1` to `initial_node_count = 1`, which is the correct field for the initial per-zone size of an autoscaled node pool in a regional cluster.

## Review Notes
- The post's private-cluster configuration is still valid for IP-based control plane access with authorized networks. Current GKE documentation also promotes DNS-based control plane access for simpler policy-based access control, but the configuration shown in the post remains supported.
