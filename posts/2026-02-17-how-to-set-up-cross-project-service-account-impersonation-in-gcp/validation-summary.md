# Validation Summary: How to Set Up Cross-Project Service Account Impersonation in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service accounts
- IAM Service Account Credentials API
- gcloud CLI
- Python google-auth
- BigQuery Python client
- Terraform Google provider
- Cloud Audit Logs
- IAM Conditions

## Sources Consulted
- Google Cloud: Service account impersonation: https://docs.cloud.google.com/iam/docs/service-account-impersonation
- Google Cloud: Use service account impersonation: https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation
- Google Cloud: IAM Credentials generateAccessToken API: https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken
- Google Cloud: Audit logging examples for service accounts: https://docs.cloud.google.com/iam/docs/audit-logging/examples-service-accounts
- Google Cloud: IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud: Authentication for Terraform: https://docs.cloud.google.com/docs/terraform/authentication
- Google Cloud: BigQuery running jobs programmatically: https://docs.cloud.google.com/bigquery/docs/running-jobs
- Google Cloud: BigQuery jobs.insert API: https://docs.cloud.google.com/bigquery/docs/reference/rest/v2/jobs/insert
- Google Cloud SDK: gcloud auth print-access-token reference: https://cloud.google.com/sdk/gcloud/reference/auth/print-access-token
- google-auth: impersonated_credentials reference: https://google-auth.readthedocs.io/en/latest/reference/google.auth.impersonated_credentials.html

## Issues Found
- Corrected the impersonation permission explanation to distinguish access tokens (`iam.serviceAccounts.getAccessToken`) from ID tokens (`iam.serviceAccounts.getOpenIdToken`).
- Corrected the IAM Service Account Credentials API enablement guidance from the target project to the calling or quota project used for the impersonation request.
- Added `roles/bigquery.jobUser` to the BigQuery example because running query jobs requires `bigquery.jobs.create`, not only table data access.
- Changed the Python BigQuery impersonated credential scope from `bigquery.readonly` to `bigquery`, because the query job creation API requires the BigQuery or Cloud Platform OAuth scope.
- Corrected the gcloud test command comment so it describes printing an access token rather than running a BigQuery query.
- Updated the Terraform example to impersonate an infrastructure-management service account instead of the read-only BigQuery example service account.
- Removed the unverified claim that delegation chains support up to four service accounts and changed the delegate value to the IAM Credentials API resource-name format.
- Corrected audit logging language to state that credential-generation logs require IAM Data Access audit logs to be enabled.
- Narrowed the IAM Conditions guidance by removing unsupported broad claims about restricting impersonation by IP ranges or VPC networks.

## Review Notes
The examples use placeholder project IDs and service account names. They are syntactically valid patterns, but real deployments still need project-specific roles, enabled APIs, and billing/quota configuration.
