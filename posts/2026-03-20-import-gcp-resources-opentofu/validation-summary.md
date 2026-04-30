# Validation Summary: How to Generate OpenTofu Configuration from Existing GCP Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Platform
- Google Cloud CLI (`gcloud`)
- Google Terraform provider resource import workflows

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- OpenTofu configuration generation documentation: https://opentofu.org/docs/language/import/generating-configuration/
- OpenTofu CLI import documentation: https://opentofu.org/docs/cli/import/
- Google provider `google_compute_instance` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Google provider `google_storage_bucket` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google provider `google_sql_database_instance` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Google provider `google_container_cluster` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google provider `google_service_account` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account
- Google provider `google_compute_network` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Google provider `google_compute_subnetwork` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Google provider `google_cloud_run_service` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service
- Google provider `google_project_iam` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- `gcloud compute instances list` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/list
- `gcloud sql instances list` reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/list
- `gcloud container clusters list` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/list
- `gcloud run services list` reference: https://cloud.google.com/sdk/gcloud/reference/run/services/list
- `gcloud topic formats` reference: https://cloud.google.com/sdk/gcloud/reference/topic/formats

## Issues Found
- Clarified the import workflow in the introduction. The original text did not clearly distinguish config generation from state-only CLI import, and current OpenTofu docs state that `tofu import` only imports into state and requires matching `resource` blocks to already exist. I updated the wording to separate `tofu import` from import-block-based config generation.
- Replaced `google_compute_instance.web["web-1"]` with `google_compute_instance.web_1` in the multi-resource import example. The original keyed address would require pre-existing `for_each`-style resource configuration that the example did not show, while the surrounding example was demonstrating generated configuration from import blocks. The revised address now matches the shown generation workflow.
- Corrected the IAM import format comments from `project/{project}` to `{project_id}`. The Google provider expects space-delimited identifiers such as `"my-project roles/storage.objectViewer serviceAccount:..."` and `"my-project roles/editor"`, without a literal `project/` prefix.
- Corrected the `gcloud compute instances list` formatting in both the discovery example and the bulk-import script to use `zone.basename()`. Google Cloud CLI formatting docs show URI-like fields should use `.basename()` when you need plain zone names such as `us-central1-a`, which is what the provider import IDs require.

## Review Notes
- `tofu plan -generate-config-out=...` is still marked experimental in current OpenTofu documentation, even though import blocks are the recommended way to generate configuration for existing resources.
- Several of the Google provider resources in the post accept shorter import ID forms in addition to the fully qualified IDs shown. The post now consistently uses valid, explicit formats.
