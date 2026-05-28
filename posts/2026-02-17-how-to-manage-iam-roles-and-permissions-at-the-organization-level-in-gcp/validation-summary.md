# Validation Summary: How to Manage IAM Roles and Permissions at the Organization Level in GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud resource hierarchy
- IAM allow policies and deny policies
- Google Groups for IAM principals
- Google Cloud CLI
- Cloud Asset Inventory
- BigQuery
- IAM Recommender
- Terraform Google provider

## Sources Consulted
- Google Cloud IAM allow policies: https://cloud.google.com/iam/docs/allow-policies
- Google Cloud resource hierarchy access control: https://cloud.google.com/iam/docs/resource-hierarchy-access-control
- Google Cloud IAM deny policies: https://cloud.google.com/iam/docs/deny-overview
- Google Cloud deny access guide: https://cloud.google.com/iam/docs/deny-access
- Google Cloud Resource Manager roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/resourcemanager
- Google Cloud Billing roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/billing
- Google Cloud Billing access control: https://cloud.google.com/billing/docs/how-to/billing-access
- Google Cloud auditing job function roles: https://cloud.google.com/iam/docs/job-functions/auditing
- Google Cloud CLI `gcloud iam policies create`: https://cloud.google.com/sdk/gcloud/reference/iam/policies/create
- Google Cloud CLI `gcloud iam roles create`: https://cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Google Cloud CLI `gcloud resource-manager folders add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/resource-manager/folders/add-iam-policy-binding
- Google Cloud CLI `gcloud asset search-all-iam-policies`: https://cloud.google.com/sdk/gcloud/reference/asset/search-all-iam-policies
- Google Cloud CLI `gcloud asset export`: https://cloud.google.com/sdk/gcloud/reference/asset/export
- Cloud Asset Inventory BigQuery export schema and examples: https://cloud.google.com/asset-inventory/docs/export-bigquery
- Google Cloud CLI `gcloud recommender recommendations list`: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- IAM role recommendations overview: https://cloud.google.com/policy-intelligence/docs/role-recommendations-overview
- Terraform Google provider `google_organization_iam_custom_role`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_organization_iam_custom_role
- Terraform Google provider folder IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder_iam

## Issues Found
- The Cloud Asset Inventory export command used `--output-bigquery-dataset` and `--output-bigquery-table`, which are not the current `gcloud asset export` flags. Changed the command to use `--bigquery-table=projects/my-project/datasets/asset_inventory/tables/iam_policies`, matching the current Google Cloud CLI syntax.
- The BigQuery audit query used `binding.role IN (...) AND name LIKE 'organizations/%' OR name LIKE 'folders/%'`, which has incorrect boolean precedence and may match folder rows regardless of role. It also assumed a `name` format that is less reliable than the exported `asset_type`. Changed the filter to use `asset_type IN ('cloudresourcemanager.googleapis.com/Organization', 'cloudresourcemanager.googleapis.com/Folder')` together with the role predicate.

## Review Notes
- `gcloud` is not installed in the local workspace, so command validation was done against official Google Cloud CLI documentation rather than local `--help` output.
- The deny policy example is syntactically aligned with Google Cloud's deny policy structure. In production, Google recommends considering service agent exceptions when a broad denied principal set such as `principalSet://goog/public:all` could include service agents.
