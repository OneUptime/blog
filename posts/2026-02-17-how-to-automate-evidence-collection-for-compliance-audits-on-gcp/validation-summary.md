# Validation Summary: How to Automate Evidence Collection for Compliance Audits on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Platform
- Python Google Cloud client libraries
- Cloud Storage
- Cloud Resource Manager IAM policies
- IAM service accounts and service account keys
- Cloud KMS
- BigQuery
- Compute Engine VPC networks and firewall rules
- Cloud Logging log sinks
- Cloud Monitoring alert policies
- Cloud Functions
- Cloud Scheduler and Pub/Sub
- gcloud CLI

## Sources Consulted
- Google Cloud KMS Python client reference: https://cloud.google.com/python/docs/reference/cloudkms/latest/google.cloud.kms_v1.services.key_management_service.KeyManagementServiceClient
- Google Cloud IAM Python client reference: https://cloud.google.com/python/docs/reference/iam/latest/google.cloud.iam_admin_v1.services.iam.IAMClient
- Google Cloud IAM service account key listing docs: https://cloud.google.com/iam/docs/keys-list-get
- Cloud Resource Manager projects.getIamPolicy REST reference: https://cloud.google.com/resource-manager/reference/rest/v3/projects/getIamPolicy
- BigQuery Dataset Python client reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.dataset.Dataset
- Compute Engine FirewallsClient Python reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.firewalls.FirewallsClient
- Compute Engine NetworksClient Python reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.networks.NetworksClient
- Cloud Logging Python client reference: https://cloud.google.com/python/docs/reference/logging/latest/google.cloud.logging_v2.client.Client
- Cloud Monitoring alerting API docs: https://cloud.google.com/monitoring/alerts/using-alerting-api
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Scheduler Pub/Sub job creation docs: https://cloud.google.com/scheduler/docs/creating
- Cloud Functions runtime support docs: https://cloud.google.com/functions/docs/runtime-support

## Issues Found
- The Cloud KMS Python import used `from google.cloud import kms`, but the official current client namespace is `kms_v1`. Updated the import and `KeyManagementServiceClient` construction accordingly.
- The service account key code treated `list_service_account_keys` as an iterable. The official Python client returns a `ListServiceAccountKeysResponse` with a `keys` field. Updated the snippet to read `keys_response.keys` and include useful key metadata.
- The encryption section claimed the snippet proved encryption in transit, but the code only collects KMS and BigQuery encryption-at-rest configuration. Revised the sentence to accurately describe encryption-at-rest evidence and key management controls.
- The Cloud Functions deployment command assumes packaged source with a `main` entry point and dependency file. Added a short command comment to make that precondition explicit.

## Review Notes
- The examples remain project-scoped. Organization-level IAM, folder-level log sinks, Security Command Center findings, Cloud Asset Inventory snapshots, and resources in additional KMS locations would be useful future enhancements, but they are not required for the shown project-level tutorial.
- `python311` is currently a supported Cloud Functions / Cloud Run functions runtime, but it has a published runtime lifecycle, so this should be rechecked during future reviews.
