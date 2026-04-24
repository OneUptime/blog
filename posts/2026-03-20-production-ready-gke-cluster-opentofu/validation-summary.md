# Validation Summary: How to Build a Production-Ready GKE Cluster on GCP with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Google provider HCL for GKE
- Google Kubernetes Engine (GKE) Standard
- Google Cloud VPC networking
- Workload Identity Federation for GKE
- GKE cluster autoscaling and node auto-provisioning
- Calico network policy
- Binary Authorization
- Shielded GKE Nodes
- Google Cloud IAM service accounts

## Sources Consulted
- Terraform Registry: `google_container_cluster` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: `google_container_node_pool` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Workload Identity Federation for GKE https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Creating a private cluster https://cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- About release channels https://cloud.google.com/kubernetes-engine/docs/concepts/release-channels
- Control communication between Pods and Services using network policies https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Create a cluster with Binary Authorization enabled https://cloud.google.com/binary-authorization/docs/creating-cluster
- Configure GKE node service accounts https://cloud.google.com/kubernetes-engine/security/configure-node-service-accounts
- Troubleshoot service accounts in GKE https://cloud.google.com/kubernetes-engine/docs/troubleshooting/service-accounts
- Access scopes in GKE https://cloud.google.com/kubernetes-engine/docs/how-to/access-scopes
- Using Shielded GKE Nodes https://cloud.google.com/kubernetes-engine/docs/how-to/shielded-gke-nodes
- Configure node pool auto-creation https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-provisioning

## Issues Found
- The cluster snippet enabled `network_policy` but omitted `addons_config.network_policy_config`. I added the addon config because the current Google provider docs require both for network policy enforcement to be enabled correctly.
- The node service account example only granted `roles/logging.logWriter` and `roles/monitoring.metricWriter`. I replaced that with `roles/container.defaultNodeServiceAccount`, which current GKE documentation identifies as the minimum required node service account role.
- The Binary Authorization text implied that setting `PROJECT_SINGLETON_POLICY_ENFORCE` alone secured image admission. I clarified that this only enables cluster-side enforcement and that a Binary Authorization project policy must be configured separately for actual image restrictions.
- The post used older "Workload Identity" wording. I updated the text and comments to the current Google Cloud terminology, `Workload Identity Federation for GKE`.
- The summary described the Regular release channel as automatic patch updates only and implied explicitly separate application node pools. I corrected this to automatic patch and minor version upgrades, and clarified that the tainted system pool is dedicated while additional pools can be created by node auto-provisioning.
- I added `enable_shielded_nodes = true` to make the stated Shielded GKE Nodes posture explicit, and added `ignore_changes = [initial_node_count]` to the autoscaled node pool to avoid drift-triggered recreation behavior noted in the provider docs.

## Review Notes
- Cluster-level node auto-provisioning remains supported, but newer GKE documentation also recommends ComputeClasses for some workload-level node pool auto-creation scenarios on recent GKE versions.
- Private nodes in GKE have no external IPs; general outbound internet access commonly requires Cloud NAT. This post focuses on cluster provisioning and does not cover egress design.
- The post contains configuration snippets rather than a complete runnable module, so provider setup, API enablement, variables, and any Binary Authorization policy resources are assumed to exist elsewhere.
