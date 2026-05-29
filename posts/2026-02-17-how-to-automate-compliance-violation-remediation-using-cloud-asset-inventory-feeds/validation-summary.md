# Validation Summary: How to Automate Compliance Violation Remediation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Asset Inventory feeds
- Pub/Sub
- Cloud Run functions / Cloud Functions 2nd gen
- Python Functions Framework
- Cloud Storage Python client
- Compute Engine Python client
- Cloud Firestore Python client
- Cloud Logging logs-based metrics
- Cloud Monitoring alerting policies
- Terraform Google provider

## Sources Consulted
- Google Cloud SDK reference for `gcloud asset feeds create`: https://docs.cloud.google.com/sdk/gcloud/reference/asset/feeds/create
- Cloud Asset Inventory documentation for monitoring asset changes with Pub/Sub: https://docs.cloud.google.com/asset-inventory/docs/monitor-asset-changes
- Google Cloud SDK reference for `gcloud functions deploy`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run logging documentation: https://docs.cloud.google.com/run/docs/logging
- Google Cloud SDK reference for `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Storage Python client `IAMConfiguration` reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.IAMConfiguration
- Cloud Storage documentation for setting a default KMS key: https://docs.cloud.google.com/storage/docs/samples/storage-set-bucket-default-kms-key
- Compute Engine Python `FirewallsClient` reference: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.firewalls.FirewallsClient
- Cloud SQL Admin API `IpConfiguration` reference: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1/instances
- Terraform `google_cloud_asset_project_feed` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_asset_project_feed
- Terraform `google_cloudfunctions2_function` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The opening example said a Cloud Storage bucket could be created "without encryption." Cloud Storage encrypts data by default, so this was changed to refer to a missing required customer-managed encryption key.
- The Pub/Sub dead-letter topic was presented as if creating the topic alone captured failed Cloud Function processing. The wording now clarifies that the topic must be attached to subscriptions that use a dead-letter policy.
- The IAM policy feed command omitted an asset selector, but `gcloud asset feeds create` requires asset names, asset types, or relationship types. Added `--asset-types="cloudresourcemanager.googleapis.com/Project"`.
- The Python sample claimed to handle storage encryption but did not implement that check. Added a Cloud Storage default KMS key compliance check and remediation using `bucket.default_kms_key_name`.
- Removed an unused `MessageToDict` import from the Python sample.
- The Cloud SQL SSL check used the legacy `requireSsl` field only. Updated it to prefer `sslMode` and fall back to `requireSsl` for compatibility.
- The deployment command used CloudEvent-style code but did not explicitly deploy a 2nd gen function. Added `--gen2`.
- The logs-based metric filters used the 1st gen `cloud_function` resource type. Updated them for 2nd gen / Cloud Run function logs with `cloud_run_revision` and the service name label.
- The alerting policy command used non-existent `--condition-threshold-value` and `--condition-threshold-comparison` flags. Replaced them with the documented `--if`, `--duration`, and `--combiner` flags.

## Review Notes
The snippets are still examples and require project-specific setup, including enabling required APIs, creating the service account, packaging the function source, granting Cloud Asset Inventory permission to publish to the Pub/Sub topic when needed, and granting the relevant Cloud KMS permissions for the selected key. The embedded Python snippet was syntax-checked successfully.
