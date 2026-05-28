# Validation Summary: How to Create an Assured Workloads Folder for FedRAMP Moderate Compliance in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Assured Workloads
- Data Boundary for FedRAMP Moderate
- Google Cloud CLI
- Organization Policy Service
- Cloud KMS
- Cloud Storage
- Cloud Audit Logs

## Sources Consulted
- Google Cloud Assured Workloads overview: https://docs.cloud.google.com/assured-workloads/docs/overview
- Create a new Assured Workloads folder: https://docs.cloud.google.com/assured-workloads/docs/create-folder
- Supported products by control package: https://docs.cloud.google.com/assured-workloads/docs/supported-products
- gcloud assured workloads create reference: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/create
- gcloud assured workloads list and describe references: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/list and https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/describe
- Monitor an Assured Workloads folder for violations: https://docs.cloud.google.com/assured-workloads/docs/monitor-folder
- Organization policy constraints reference: https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Restrict resource locations: https://docs.cloud.google.com/organization-policy/restrict-locations
- gcloud org policy describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- gcloud projects create reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects/create
- gcloud billing projects link reference: https://docs.cloud.google.com/sdk/gcloud/reference/billing/projects/link
- Cloud KMS key ring and key creation references: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keyrings/create and https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- gcloud storage buckets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Enable Data Access audit logs: https://docs.cloud.google.com/logging/docs/audit/configure-data-access

## Issues Found
- The post used the older generic "FedRAMP Moderate" wording for the Assured Workloads package. Updated the relevant text to the current "Data Boundary for FedRAMP Moderate" control package name.
- The `gcloud assured workloads create` example used an invalid `--resource-settings` JSON array for the gcloud flag and omitted the required `billingAccounts/` prefix for the workload billing account. Removed the invalid resource settings and corrected the billing account format.
- The post stated that FedRAMP Moderate automatically requires CMEK. Current Assured Workloads documentation describes encryption key management controls, but Data Boundary for FedRAMP Moderate does not require CMEK by default. Updated the CMEK sections to describe CMEK as optional unless the workload requires it.
- The project creation command supplied both `--folder` and `--organization`. The gcloud reference says to use either a folder or organization parent, so the command was corrected to use only `--folder`.
- The service restriction explanation implied every unsupported service API call is rejected. Updated the wording to match the documented resource usage restriction behavior for supported services and resource types.
- The audit logging section labeled a `get-iam-policy` command as enabling logs. Updated the comment and prose to clarify that the policy must be edited and then written back with `gcloud projects set-iam-policy`.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
