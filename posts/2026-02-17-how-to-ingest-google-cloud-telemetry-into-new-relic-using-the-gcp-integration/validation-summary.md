# Validation Summary: How to Ingest Google Cloud Telemetry into New Relic Using the GCP Integration

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- New Relic GCP integrations
- New Relic NerdGraph API
- New Relic Log API
- New Relic NRQL and alert conditions
- Google Cloud Monitoring
- Google Cloud Logging sinks
- Google Cloud Pub/Sub
- Google Cloud IAM
- Python Cloud Functions

## Sources Consulted
- New Relic docs: Connect Google Cloud Platform services to New Relic - https://docs.newrelic.com/docs/infrastructure/google-cloud-platform-integrations/get-started/connect-google-cloud-platform-services-new-relic/
- New Relic docs: Polling intervals for GCP integrations - https://docs.newrelic.com/docs/infrastructure/google-cloud-platform-integrations/getting-started/polling-intervals-gcp-integrations/
- New Relic docs: GCP integration metrics - https://docs.newrelic.com/docs/infrastructure/google-cloud-platform-integrations/get-started/gcp-integration-metrics/
- New Relic docs: NerdGraph tutorial for cloud integrations - https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-cloud-integrations-api-tutorial/
- New Relic docs: Forward logs from Google Cloud Platform - https://docs.newrelic.com/docs/logs/forward-logs/google-cloud-platform-log-forwarding/
- New Relic docs: NerdGraph tutorial for NRQL alert conditions - https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-api-nrql-condition-alerts/
- Google Cloud SDK docs: gcloud logging sinks create - https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Logging docs: Route logs to Pub/Sub - https://cloud.google.com/logging/docs/export/pubsub

## Issues Found
- The post claimed the guide ingests traces through the GCP integration, but the covered New Relic GCP integration setup is for metrics and separate log forwarding. Removed the trace claim from the description and introduction.
- The authentication section instructed users to create their own GCP service account and upload a JSON key. Current New Relic documentation recommends service account authorization with a New Relic-managed service account. Replaced the key-generation flow with granting the New Relic service account the documented GCP roles.
- The UI setup instructions said to upload a service account key file. Updated them to match the current New Relic service account authorization workflow.
- The NerdGraph GCP account link example included an unsupported `serviceAccountKey` field. Removed it and kept the documented `name` and `projectId` fields.
- The integration enablement example included several unverified GCP integration field names. Narrowed the example to the documented NerdGraph pattern with a Compute Engine example and noted that provider and integration slugs come from NerdGraph.
- The polling section said users can reduce the interval to 1 minute. New Relic documents 5-minute polling for listed GCP integrations with 1-minute metric resolution. Updated the explanation and example to show polling less often.
- The log forwarding example used a fixed `https://newrelic.com/api/logs/pubsub` endpoint. New Relic documents generating a Pub/Sub ingest URL in the logging setup. Replaced the endpoint with a generated ingest URL placeholder.
- The NRQL examples used older sample event attributes. Updated them to query current dimensional metric names from `Metric`.
- The alert example used the older REST v2 NRQL condition endpoint and old Cloud SQL metric attribute. Replaced it with the documented NerdGraph `alertsNrqlConditionStaticCreate` mutation and current dimensional metric name.
- The filtering section referenced tag-based filtering for GCP, while the documented tag key/value filters apply to AWS and Azure. Reworded it to refer to available data collection and filtering settings.

## Review Notes
The Python Cloud Function example was syntax-checked with Python 3. The local environment did not have `gcloud` installed, so Google Cloud CLI command validation was performed against official Google Cloud documentation rather than local `--help` output.
