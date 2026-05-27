# Validation Summary: How to Use Cost Allocation Labels to Track Spending Across Teams and Projects

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud labels and tags
- Google Cloud Billing export to BigQuery
- Google Cloud CLI (`gcloud`, `bq`)
- Compute Engine
- Google Kubernetes Engine
- Cloud Storage
- BigQuery
- Cloud SQL
- Terraform Google provider
- Organization Policy Service
- Cloud Asset Inventory

## Sources Consulted
- Google Cloud Resource Manager labels overview: https://cloud.google.com/resource-manager/docs/labels-overview
- Google Cloud Resource Manager tags overview: https://cloud.google.com/resource-manager/docs/tags/tags-overview
- Google Cloud Billing standard usage export schema and query examples: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- Google Cloud SDK reference for `gcloud compute instances update`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/update
- Google Cloud SDK reference for `gcloud container clusters update`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud Storage bucket labels documentation: https://cloud.google.com/storage/docs/using-bucket-labels
- BigQuery label update documentation: https://cloud.google.com/bigquery/docs/updating-labels
- Cloud SQL label instances documentation: https://cloud.google.com/sql/docs/mysql/label-instance
- GKE cluster and node pool labels documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/creating-managing-labels
- Cloud Asset Inventory search resources documentation: https://cloud.google.com/asset-inventory/docs/search-resources
- Cloud Asset Inventory search query syntax: https://cloud.google.com/asset-inventory/docs/search-query-syntax
- Terraform Google provider documentation for Compute Engine and Cloud SQL resources: https://registry.terraform.io/providers/hashicorp/google/latest
- Terraform JSON output documentation: https://developer.hashicorp.com/terraform/internals/json-format

## Issues Found
- Label requirements were incomplete and slightly misleading. Updated the rules to note that values can be empty, keys can start with a lowercase or international character, and UTF-8 international characters are allowed.
- The Cloud SQL `gcloud sql instances patch --update-labels` command was inaccurate for labels. Updated it to `gcloud beta sql instances patch`, matching the current Cloud SQL label documentation.
- The organization policy section incorrectly said Google Cloud organization policies can require labels directly. Updated it to explain that labels are not directly supported by organization policies, while mandatory Resource Manager tags can be enforced on supported resources with custom organization policy constraints.
- The organization policy command used `gcloud org-policies set-policy ... --organization=ORGANIZATION_ID`, which is not the documented flow for custom constraints. Updated the example to create the custom constraint with `set-custom-constraint` and then apply a policy with `set-policy`.
- The CI/CD pre-commit example would have flagged every Google Terraform resource because it searched resource declaration lines and filtered out lines that did not contain `labels`. Replaced it with a Terraform plan JSON check using `terraform show -json` and `jq`, covering `labels`, `user_labels`, and `resource_labels`.
- The Cloud SQL unlabeled-resource search used `settings.userLabels.team` in a `gcloud sql instances list` filter. Updated it to the documented beta Cloud SQL labels filter syntax, `--filter="NOT labels:team"`.
- The best-practices section recommended organization policies for label enforcement. Updated the wording to recommend mandatory tags where appropriate instead.

## Review Notes
The BigQuery examples use the documented Cloud Billing export fields (`labels`, `cost`, `credits`, `usage_start_time`, `service.description`, and `project.name`) and follow the current pattern of adding credits to cost for net cost. The unlabeled-cost query intentionally finds rows with no labels at all; a future improvement could add a separate query for rows that have labels but are missing a required key such as `team`.
