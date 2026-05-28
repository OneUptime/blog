# Validation Summary: How to Design a Folder Hierarchy for Multi-Team GCP Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Resource Manager folders
- Google Cloud IAM
- Google Cloud Organization Policy Service
- Google Cloud Billing reports
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Resource Manager: Resource hierarchy: https://cloud.google.com/resource-manager/docs/overview
- Google Cloud Resource Manager: Create and manage folders: https://cloud.google.com/resource-manager/docs/creating-managing-folders
- Google Cloud Resource Manager: Quotas and usage limits: https://cloud.google.com/resource-manager/docs/limits
- Google Cloud CLI reference: gcloud resource-manager folders create: https://cloud.google.com/sdk/gcloud/reference/resource-manager/folders/create
- Google Cloud CLI reference: gcloud resource-manager folders list: https://cloud.google.com/sdk/gcloud/reference/resource-manager/folders/list
- Google Cloud CLI reference: gcloud resource-manager folders add-iam-policy-binding: https://cloud.google.com/sdk/gcloud/reference/resource-manager/folders/add-iam-policy-binding
- Google Cloud CLI reference: gcloud resource-manager org-policies set-policy: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud CLI reference: gcloud resource-manager org-policies enable-enforce: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/enable-enforce
- Google Cloud Resource Manager: Restricting Resource Locations: https://cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Google Cloud Resource Manager: Organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud Compute Engine: Configure static external IP addresses: https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address
- Google Cloud Billing: Billing reports by project hierarchy: https://cloud.google.com/billing/docs/how-to/reports-project-hierarchy
- Terraform Google provider: google_folder resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder
- Terraform Google provider: google_organization data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/organization

## Issues Found
- The post said there was no hard limit on folders per parent. Google Cloud documents a limit of 300 direct child folders per parent, so the limit bullet was corrected.
- The folder lookup examples captured folder names in `folders/FOLDER_ID` form and reused them with `--folder`, whose documented argument is `FOLDER_ID`. The examples now strip the `folders/` prefix before assigning the shell variables.
- The production external IP example used `gcloud resource-manager org-policies enable-enforce` for `compute.vmExternalIpAccess`. That constraint is a list constraint, not a boolean constraint, so the example was changed to a `set-policy` YAML file with `listPolicy.allValues: DENY`.

## Review Notes
- The post uses legacy `gcloud resource-manager org-policies` examples, which are still documented. Google Cloud also documents newer `gcloud org-policies` commands with v2-style policy YAML; a future refresh could standardize on one command family.
- The IAM examples use broad `roles/editor` grants for simplicity. They are syntactically valid, but a production guide could recommend narrower predefined or custom roles.
