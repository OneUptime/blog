# Validation Summary: How to Automate Firewall Rule Auditing Across GCP Projects

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Asset Inventory
- Compute Engine VPC firewall rules
- Cloud Functions
- Cloud Scheduler
- Pub/Sub
- BigQuery
- Python Google Cloud client libraries
- gcloud CLI

## Sources Consulted
- Cloud Asset Inventory list assets documentation: https://cloud.google.com/asset-inventory/docs/list-assets
- Cloud Asset Inventory SearchAllResources REST reference: https://cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/searchAllResources
- Cloud Asset Inventory IAM roles and permissions: https://cloud.google.com/asset-inventory/docs/roles-permissions
- Cloud Asset Inventory supported asset types: https://cloud.google.com/asset-inventory/docs/asset-types
- Compute Engine firewalls REST resource reference: https://cloud.google.com/compute/docs/reference/rest/v1/firewalls
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- gcloud scheduler jobs create pubsub reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/pubsub
- BigQuery Python client insert_rows_json reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client#google_cloud_bigquery_client_Client_insert_rows_json
- Pub/Sub Python publisher client reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client

## Issues Found
- The title used "Network Security Group," which is not the GCP resource being audited in the post. Changed it to "Firewall Rule" to match Compute Engine VPC firewall rules.
- The API enablement commands described enabling Cloud Asset Inventory at the organization level, but `gcloud services enable` enables services on a project. Changed the text and command to enable the required APIs in the auditor project.
- The service account permissions omitted Pub/Sub publish access even though the function publishes alert messages. Added `roles/pubsub.publisher`.
- The code used `SearchAllResources` as if it returned the full firewall rule body, but official docs describe it as a search metadata API and warn against programmatically consuming `additionalAttributes`. Changed the example to use `ListAssets` with `ContentType.RESOURCE`.
- The main function referenced `_get_firewall_details` and `_count_by_type` without defining them. Added helper functions.
- The firewall checks missed Compute Engine firewall semantics where an allowed rule with no `ports` applies to all ports for that protocol. Updated the SSH/RDP and wide-port-range checks accordingly.
- The wide-port-range calculation did not count both endpoints of a port range. Updated it to use inclusive range width.
- The deploy command used a hyphenated Cloud Function resource name without specifying the Python entry point. Added `--entry-point audit_firewall_rules` and made the deployment explicitly first generation to match the `(event, context)` Pub/Sub function signature.
- The deployment steps assumed Pub/Sub topics existed. Added commands to create the trigger and alert topics.
- The alert publisher did not wait on the publish future. Added `future.result()` so the sample waits for publish completion before function termination.
- The custom policy example checked firewall rule `labels`, but the Compute Engine firewall resource does not expose a generic `labels` field. Replaced it with a description-based ownership metadata check.

## Review Notes
Cloud Asset Inventory documentation notes that listing assets might not meet the performance needs of very large environments; for very large organizations, exporting assets and processing the export may be a better future enhancement.
