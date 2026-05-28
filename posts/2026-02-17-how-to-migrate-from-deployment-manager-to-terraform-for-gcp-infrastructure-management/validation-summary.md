# Validation Summary: How to Migrate from Deployment Manager to Terraform

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google Cloud Deployment Manager
- Google Cloud Infrastructure Manager
- Terraform
- HashiCorp Google provider
- Google Cloud Storage remote state backend
- Google Cloud CLI
- Compute Engine VPC networks, subnetworks, firewall rules, and VM instances

## Sources Consulted
- Google Cloud Deployment Manager deprecation: https://cloud.google.com/deployment-manager/docs/deprecations
- Google Cloud Deployment Manager delete deployments documentation: https://docs.cloud.google.com/deployment-manager/docs/deployments/deleting-deployments
- Google Cloud SDK `gcloud deployment-manager deployments delete` reference: https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/delete
- Google Cloud Deployment Manager resources API reference: https://docs.cloud.google.com/deployment-manager/docs/reference/latest/resources
- Google Cloud Infrastructure Manager overview: https://docs.cloud.google.com/infrastructure-manager/docs/overview
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform Google provider `google_compute_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google provider `google_compute_network` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform Google provider `google_compute_subnetwork` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Google provider `google_compute_firewall` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall

## Issues Found
- Deployment Manager status was outdated. The post said Deployment Manager still works fine for simple GCP deployments. Google Cloud documentation says Deployment Manager support was discontinued on March 31, 2026 and users should migrate to Infrastructure Manager or another deployment technology. Updated the intro and migration guidance to reflect that current status.
- The migration strategy said old resources can stay in Deployment Manager until replaced. Updated this to say old resources stay as-is until replaced or imported, which remains accurate after Deployment Manager's end of support.
- The Terraform provider constraint used `~> 5.0`. Updated it to `~> 7.0` to use the current major version of the official HashiCorp Google provider.
- The generated import script produced invalid Compute Engine instance import IDs by using Deployment Manager's numeric resource `id`, and referenced an undefined Python variable named `PROJECT`. Rewrote the script to pass shell arguments into Python, derive instance import IDs from the Deployment Manager resource `url`, and sanitize Terraform resource labels.
- The migration tips said to keep Deployment Manager running during migration. Updated this to account for current post-shutdown access, while preserving the warning not to abandon/delete deployments before Terraform is confirmed.

## Review Notes
The command examples for `terraform import`, the GCS backend configuration, GCS bucket versioning recommendation, and `gcloud deployment-manager deployments delete --delete-policy=ABANDON` were consistent with official documentation. The local environment did not have `gcloud` or `terraform` installed, so CLI behavior was verified against official command and provider documentation instead of local help output.
