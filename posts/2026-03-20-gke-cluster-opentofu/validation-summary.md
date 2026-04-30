# Validation Summary: How to Deploy a GKE Cluster with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Google Cloud
- Google Kubernetes Engine (GKE)
- Google Cloud IAM
- Cloud Logging
- Cloud Monitoring
- Managed Service for Prometheus
- `gcloud` CLI

## Sources Consulted
- OpenTofu settings and version constraints: https://opentofu.org/docs/language/settings/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Google provider `google_container_cluster` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google provider `google_container_node_pool` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool.html
- Google provider `google_project_service` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service
- Google provider `google_compute_subnetwork` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- GKE Terraform guidance: https://cloud.google.com/kubernetes-engine/docs/terraform
- GKE node pools documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/node-pools
- Workload Identity Federation for GKE concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Configure metrics collection for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/configure-metrics
- GKE release channels: https://cloud.google.com/kubernetes-engine/docs/how-to/release-channels
- `gcloud auth application-default login` reference: https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login
- `gcloud container clusters get-credentials` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Service Usage overview: https://cloud.google.com/service-usage/docs/how-to
- Understanding Google Cloud APIs and Terraform: https://cloud.google.com/docs/terraform/understanding-apis-and-terraform

## Issues Found
- The original post did not provision a GKE cluster at all. Step 4 only created a service account and a `roles/viewer` binding. I replaced that section with a valid GKE Standard deployment using `google_container_cluster`, `google_container_node_pool`, a custom VPC, a subnetwork, and secondary IP ranges for Pods and Services.
- The title and description promised node pools and workload identity, but the original configuration had neither. I added a separately managed node pool and enabled Workload Identity Federation for GKE with `workload_identity_config` on the cluster and `workload_metadata_config { mode = "GKE_METADATA" }` on the node pool.
- The original node service account role was incorrect. GKE documents `roles/container.defaultNodeServiceAccount` as the minimum required role for node service accounts, so I replaced `roles/viewer` with that role.
- The provider pin `~> 5.0` was stale relative to the current official Google provider docs. I updated it to `~> 7.0`.
- The monitoring section was not GKE-specific, referenced an undefined variable (`var.notification_channel_ids`), and did not configure the cluster monitoring described in the post. I replaced it with current GKE logging and monitoring settings using `logging_service`, `monitoring_service`, `logging_config`, `monitoring_config`, and Managed Service for Prometheus.
- The original outputs exposed only the project ID and service account email, which was incomplete for a cluster deployment guide. I updated the outputs to expose the cluster name, location, control plane endpoint, and node service account email.
- The deployment commands omitted the one-time bootstrap needed for project service management in a new project and assumed a default `gcloud` project when fetching credentials. I added a `gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com` bootstrap step and made the `get-credentials` command self-contained with explicit `--location` and `--project` flags.

## Review Notes
- The revised example uses a regional Standard cluster because the configuration is driven by a `region` variable. With `node_count = 1`, GKE creates one node per zone in the region for the managed node pool, which affects cost.
- `serviceusage.googleapis.com` still needs a one-time bootstrap before OpenTofu can manage project APIs with `google_project_service`; the post now documents that explicitly.
- `tofu` and `gcloud` were not installed in this workspace, so CLI syntax was verified against the official command reference pages instead of local `--help` output.
