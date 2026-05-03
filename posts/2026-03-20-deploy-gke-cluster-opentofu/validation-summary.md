# Validation Summary: How to Deploy a GKE Cluster with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (>= 1.6.0)
- Google Cloud Platform (GCP)
- Google Kubernetes Engine (GKE)
- HashiCorp `google` Terraform provider (~> 5.0)
- Kubernetes (kubectl)
- gcloud CLI
- GCP IAM (service accounts and project IAM bindings)
- VPC-native networking, Workload Identity, Shielded GKE nodes, private clusters

## Sources Consulted
- Google provider `google_container_cluster` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google provider `google_container_node_pool` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Google provider `google_service_account` and `google_project_iam_member` references
- GKE logging/monitoring components documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/configure-logging and https://cloud.google.com/stackdriver/docs/solutions/gke/managing-metrics
- GKE Workload Identity: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE release channels: https://cloud.google.com/kubernetes-engine/docs/concepts/release-channels
- `gcloud container clusters get-credentials` documentation: https://cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- OpenTofu docs for `terraform` block and `output` semantics: https://opentofu.org/docs/

## Issues Found
- The "Configure kubectl" bash snippet calls `tofu output -raw region`, but the `outputs.tf` snippet did not define a `region` output. As written, the command would fail with "output 'region' not found". Fixed by adding `output "region" { value = var.region }` to the `outputs.tf` snippet so the bash example works as written.

## Review Notes
- `logging_config.enable_components` values (`SYSTEM_COMPONENTS`, `WORKLOADS`) and `monitoring_config.enable_components` value (`SYSTEM_COMPONENTS`) are valid per the provider schema.
- `release_channel.channel = "REGULAR"` and `workload_metadata_config.mode = "GKE_METADATA"` are valid enum values.
- `deletion_protection` is supported on `google_container_cluster` in provider v5.x and defaults to `true`; setting it to `false` here is a deliberate choice for non-production tutorials.
- The post references `google_compute_network.vpc` and `google_compute_subnetwork.nodes` (with secondary ranges named `pods` and `services`) without defining them inline. Readers will need their own VPC/subnetwork module that exposes those secondary IP ranges; the post focuses on GKE specifically, which is a reasonable scope choice but worth flagging for completeness.
- The introduction mentions "node auto-provisioning" but the configuration uses a fixed node pool with autoscaling rather than `cluster_autoscaling { enabled = true ... }` (NAP). This is a minor wording inconsistency rather than a technical error — the configuration shown is autoscaling, not node auto-provisioning. Not changed because it is a stylistic, not technical, issue.
- The IAM role list is a sensible minimum; some setups also add `roles/stackdriver.resourceMetadata.writer`, but the listed roles are sufficient for the features enabled in the post.
