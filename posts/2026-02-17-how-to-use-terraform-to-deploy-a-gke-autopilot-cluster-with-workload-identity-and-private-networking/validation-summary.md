# Validation Summary: How to Use Terraform to Deploy a GKE Autopilot Cluster with Workload Identity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine Autopilot
- Workload Identity Federation for GKE
- Terraform Google provider
- Google Cloud VPC networking
- Cloud NAT and Cloud Router
- Binary Authorization
- Kubernetes service accounts

## Sources Consulted
- Google Cloud GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud GKE Workload Identity concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud GKE private cluster documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- Google Cloud GKE network isolation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/network-isolation
- Google Cloud GKE Autopilot overview: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview
- Google Cloud Binary Authorization cluster documentation: https://cloud.google.com/binary-authorization/docs/creating-cluster
- Terraform Google provider `google_container_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster

## Issues Found
- The Workload Identity IAM section granted `roles/iam.workloadIdentityUser` to the Kubernetes service account principal, but did not show the required Kubernetes service account annotation. Google Cloud documentation states that both the IAM allow policy and the `iam.gke.io/gcp-service-account` annotation are required for Kubernetes service account to IAM service account impersonation. Added the missing `kubectl annotate serviceaccount` command and clarified the IAM binding comment.

## Review Notes
- The post uses the IAM service account impersonation pattern for Workload Identity Federation for GKE. Google now recommends direct IAM principal identifiers where supported, but the impersonation pattern remains documented and valid for APIs or use cases that need it.
- In Autopilot clusters, Workload Identity Federation for GKE is always enabled. The explicit Terraform `workload_identity_config` is still consistent with the Terraform resource model and documents the intended workload pool.
- The private node and Cloud NAT guidance aligns with GKE network isolation documentation: private nodes do not have external IP addresses and need Cloud NAT or another NAT path for internet egress.
