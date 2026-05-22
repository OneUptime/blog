# Validation Summary: How to Migrate from Google Deployment Manager to Terraform

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Google Cloud Deployment Manager
- Google Cloud CLI
- Terraform
- Terraform Google provider
- Google Cloud Compute Engine
- Google Cloud Storage
- Deployment Manager YAML, Jinja2, and Python templates

## Sources Consulted
- Google Cloud Deployment Manager deprecation: https://cloud.google.com/deployment-manager/docs/deprecations
- Google Cloud Deployment Manager documentation: https://docs.cloud.google.com/deployment-manager/docs
- Google Cloud Deployment Manager manifest documentation: https://docs.cloud.google.com/deployment-manager/docs/deployments/viewing-manifest
- Google Cloud Deployment Manager manifest API reference: https://docs.cloud.google.com/deployment-manager/docs/reference/latest/manifests
- gcloud deployment-manager deployments delete reference: https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/delete
- gcloud deployment-manager manifests describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/deployment-manager/manifests/describe
- gcloud compute instances list reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/list
- gcloud projections reference: https://cloud.google.com/sdk/gcloud/reference/topic/projections
- Deployment Manager Python and Jinja template documentation: https://cloud.google.com/deployment-manager/docs/configuration/templates/create-basic-template
- Terraform import language documentation: https://developer.hashicorp.com/terraform/language/import
- Google Cloud Terraform import documentation: https://cloud.google.com/docs/terraform/resource-management/import
- Terraform Google provider google_compute_instance documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google provider google_compute_subnetwork documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Google provider google_storage_bucket documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform Google provider google_service_account documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account
- Related OneUptime links in the post were checked and are reachable.

## Issues Found
- Deployment Manager was described as a current native Google infrastructure as code service. Updated the introduction and migration rationale to state that Google discontinued Deployment Manager support on March 31, 2026, and scoped the guide to environments where deployments and APIs remain accessible during transition.
- The command labeled as exporting the deployment configuration used `gcloud deployment-manager deployments describe`, which exports deployment metadata rather than the original manifest configuration. Replaced it with `gcloud deployment-manager manifests describe --format='value(config.content)'`.
- The delete policy examples used `ABANDON`, while the official gcloud reference documents the accepted value as `abandon`. Updated the command and prose to use `--delete-policy=abandon`.
- The Python template example generated Compute Engine instances without required disk and network interface properties. Added minimal boot disk and default network interface properties so the generated resources are valid.
- The Terraform provider snippet referenced `var.project_id` without declaring the variable. Added a minimal `variable "project_id" {}` block.
- The automation script used `--format='value(zone)'` for VM zones, which can return a full zone URI. Changed it to `zone.basename()` so the generated Terraform import ID contains only the zone name.

## Review Notes
Deployment Manager is past its official support discontinuation date as of this validation date. The migration process remains technically coherent for users who still have access to their Deployment Manager data, exported configs, or any remaining accessible APIs, but future revisions should consider adding a more explicit path for teams that can no longer query Deployment Manager directly.
