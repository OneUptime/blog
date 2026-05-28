# Validation Summary: How to Implement GDPR Data Processing Compliance Controls in Google Cloud

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud
- GDPR compliance controls
- Cloud Storage
- BigQuery and bq CLI
- Cloud SQL for PostgreSQL
- Organization Policy
- Sensitive Data Protection / Cloud DLP
- Security Command Center
- Cloud Monitoring
- Cloud Asset Inventory
- Cloud Logging
- Terraform Google provider
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud GDPR overview: https://cloud.google.com/privacy/gdpr
- Google Cloud Data Processing Addendum: https://cloud.google.com/terms/data-processing-addendum
- gcloud storage buckets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- BigQuery bq CLI reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Cloud SQL for PostgreSQL create instance documentation: https://docs.cloud.google.com/sql/docs/postgres/create-instance
- Organization Policy resource location restriction documentation: https://docs.cloud.google.com/organization-policy/restrict-locations
- Sensitive Data Protection storage inspection documentation: https://docs.cloud.google.com/sensitive-data-protection/docs/inspecting-storage
- Sensitive Data Protection inspectTemplates.create REST reference: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/projects.locations.inspectTemplates/create
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring BigQuery metrics and monitored resource references: https://docs.cloud.google.com/bigquery/docs/monitoring-dashboard and https://docs.cloud.google.com/monitoring/api/resources
- gcloud scc manage services update reference: https://docs.cloud.google.com/sdk/gcloud/reference/scc/manage/services/update
- BigQuery audit logs overview: https://cloud.google.com/bigquery/docs/reference/auditlogs/
- BigQuery Python Client reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- Terraform Google provider resources for org policies and BigQuery datasets: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset

## Issues Found
- The Cloud SQL example used the legacy `--require-ssl` flag. Changed it to `--ssl-mode=ENCRYPTED_ONLY`, which Google Cloud currently recommends for SSL/TLS enforcement.
- The Cloud DLP examples used unsupported stable `gcloud dlp jobs create` and `gcloud dlp inspect-templates create` command forms. Replaced them with documented Sensitive Data Protection REST API calls using `curl` and `gcloud auth print-access-token`.
- The Python erasure example used `datetime.utcnow()` without importing `datetime`. Added the missing imports and changed the timestamp generation to timezone-aware `datetime.now(timezone.utc).isoformat()`.
- The scheduled query example used `--display_name` with `bq query`, but that flag is not documented for `bq query`. Removed the unsupported flag.
- The Cloud Monitoring alert example used invalid flags `--condition-threshold-value` and `--condition-threshold-duration`. Replaced them with documented `--if` and `--duration` flags.
- The Cloud Monitoring alert filter used `resource.type="bigquery_dataset"` for the BigQuery scanned bytes metric. Changed it to `resource.type="bigquery_project"`, which matches the BigQuery metric resource type.
- The Security Command Center example used `gcloud scc settings services enable` with an unsupported stable command form and uppercase service name. Replaced it with `gcloud scc manage services update event-threat-detection --enablement-state=ENABLED`.
- The Cloud Logging DPIA export used a dataset resource type and legacy lowercase method name for BigQuery job insert logs. Updated it to `resource.type="bigquery_project"` and `protoPayload.methodName="google.cloud.bigquery.v2.JobService.InsertJob"`.

## Review Notes
- The examples remain illustrative and assume prerequisite IAM roles, enabled APIs, existing KMS keys, service agents with key permissions, pre-created audit tables, and configured private services access for Cloud SQL private IP.
- `constraints/gcp.resourceLocations` restricts supported resource creation locations; Google notes that it is not itself a data storage commitment for every service.
