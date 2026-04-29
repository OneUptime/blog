# Validation Summary: How to Manage Multiple GCP Projects with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Google Cloud projects and provider aliases
- HashiCorp Google provider
- Shared VPC
- Google Cloud Storage (`gcs`) backend
- Google Cloud authentication, ADC, and Workload Identity Federation

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu module `providers` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/module-providers/
- OpenTofu `gcs` backend docs: https://opentofu.org/docs/language/settings/backends/gcs/
- Terraform Registry page for the Google provider (latest version reference): https://registry.terraform.io/providers/hashicorp/google/latest
- Official Google provider configuration reference (upstream provider docs): https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/guides/provider_reference.html.markdown
- Official `google_compute_network` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_network.html.markdown
- Official `google_compute_shared_vpc_host_project` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_shared_vpc_host_project.html.markdown
- Official `google_compute_shared_vpc_service_project` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_shared_vpc_service_project.html.markdown
- Google Cloud Terraform authentication docs: https://docs.cloud.google.com/docs/terraform/authentication
- Workload Identity Federation for GKE docs: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Official Google GitHub Actions auth action docs: https://github.com/google-github-actions/auth

## Issues Found
- The post pinned the `hashicorp/google` provider to `~> 5.0`. As of 2026-04-29, the official registry lists major version 7 as the current line, so I updated the example to `~> 7.0` to avoid teaching a stale provider baseline while keeping the rest of the configuration valid.
- The authentication snippet led with a service account key example even though Google Cloud's current Terraform guidance recommends Application Default Credentials for local development. I changed the local example to `gcloud auth application-default login`.
- The `GOOGLE_APPLICATION_CREDENTIALS` example was narrowed to a service account key file. I changed it to a generic `credentials.json` path because Google documents this variable for both service account key files and external credential configuration files used with Workload Identity Federation.
- The GKE note used older `Workload Identity` wording. I updated it to `Workload Identity Federation for GKE` and clarified that no explicit credential file is needed because ADC uses the GKE metadata server in that environment.

## Review Notes
- The core multi-project pattern in the post is correct: multiple `provider "google"` blocks with aliases, resource-level `provider = google.<alias>` selection, and module-level provider remapping through the `providers` meta-argument all match current OpenTofu behavior.
- The Shared VPC resource examples are syntactically correct and align with the current Google provider documentation. One caveat from the provider docs is that folder-level Shared VPC Admin permissions may require `google-beta`; the post's project-level example remains valid as written.
- The `gcs` backend example is valid for OpenTofu. The backend bucket must already exist, and OpenTofu recommends enabling Object Versioning on that bucket for recovery, but the existing example itself is technically correct.
