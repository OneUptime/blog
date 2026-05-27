# Validation Summary: How to Set Up a GCP Billing Account and Link It to Your Project

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Billing
- Google Cloud CLI (`gcloud`)
- Cloud Billing Budgets
- Pub/Sub budget notifications
- IAM billing roles
- BigQuery billing export
- Terraform Google provider
- Compute Engine committed use discounts
- Google Cloud Free Trial and Free Tier

## Sources Consulted
- Google Cloud SDK reference: `gcloud billing`, `gcloud billing accounts`, `gcloud billing projects`, and `gcloud billing budgets create`: https://cloud.google.com/sdk/gcloud/reference/billing
- Google Cloud Billing documentation: enable, disable, or change billing for a project: https://cloud.google.com/billing/docs/how-to/modify-project
- Google Cloud Billing documentation: create a new Cloud Billing account: https://cloud.google.com/billing/docs/how-to/create-billing-account
- Google Cloud Billing documentation: export Cloud Billing data to BigQuery: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-setup
- Google Cloud documentation: Resource-based committed use discounts: https://cloud.google.com/compute/docs/instances/signing-up-committed-use-discounts
- Google Cloud Free Program documentation: https://cloud.google.com/free/docs/free-cloud-features
- Terraform Google provider `google_project` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project

## Issues Found
- The post said billing accounts could be created with the gcloud CLI. Standard Cloud Billing accounts are created in the Cloud Console; gcloud manages existing billing accounts. Updated the wording.
- The project creation section claimed billing was linked "in one step" even though the commands used two steps. Updated the wording and comment.
- Budget examples used the outdated or incorrect `--threshold-rules` and `--notifications-pubsub-topic` flags. Updated them to `--threshold-rule` and `--notifications-rule-pubsub-topic`.
- The default budget notification recipients were described as billing admins only. Updated this to Billing Account Administrators and Billing Account Users.
- The billing user role description omitted that project-side permissions are also required to link a project. Clarified the role table.
- The BigQuery export section implied the BigQuery Data Transfer Service API is required for all billing exports. Updated the comment to note it is needed when exporting pricing data.
- The committed use discount example used `--plan=twelve-month`, which is not a valid `gcloud compute commitments create` plan value. Changed it to `--plan=12-month`.
- The CUD discount claim gave fixed 37% and 55% values. Updated it to current "up to" wording because discounts vary by resource and commitment type.
- The Free Tier examples listed an `f1-micro` VM and used imprecise storage/query units. Updated them to current `e2-micro`, 5GB-months Cloud Storage, and 1TiB BigQuery query limits.
- The command labeled as checking remaining free trial credits only returns whether a billing account is open. Relabeled the command and added the correct console/report guidance for remaining credits.
- The unlink-billing warning said APIs may be deleted. Updated it to state that billable services stop and some resources might be removed.
- The conclusion implied all "access not configured" errors trace back to billing. Updated it to mention disabled APIs or missing permissions as other common causes.

## Review Notes
The workspace does not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference documentation instead of local `--help` output.
