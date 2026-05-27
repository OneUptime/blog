# Validation Summary: How to Stream Google Cloud Audit Logs to Splunk Using Dataflow on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Audit Logs
- Cloud Logging sinks
- Pub/Sub topics and subscriptions
- Dataflow classic templates
- Splunk HTTP Event Collector (HEC)
- Terraform Google provider
- Cloud Monitoring alert policies
- Secret Manager

## Sources Consulted
- Google Cloud Dataflow Pub/Sub to Splunk template documentation: https://cloud.google.com/dataflow/docs/guides/templates/provided/pubsub-to-splunk
- Google Cloud Logging Data Access audit log configuration documentation: https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Logging sinks CLI reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud architecture guide for streaming logs to Splunk: https://cloud.google.com/architecture/stream-logs-from-google-cloud-to-splunk
- Google Cloud Monitoring filter and alerting documentation: https://cloud.google.com/monitoring/api/v3/filters and https://cloud.google.com/monitoring/alerts/using-alerting-ui
- Google Cloud Dataflow monitoring metrics documentation: https://cloud.google.com/dataflow/docs/guides/using-cloud-monitoring
- Terraform Google provider documentation for google_dataflow_job and Pub/Sub resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dataflow_job and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Splunk HTTP Event Collector documentation: https://help.splunk.com/en/splunk-enterprise/get-data-in/get-started-with-getting-data-in/9.2/get-data-with-http-event-collector/http-event-collector-rest-api-endpoints

## Issues Found
- The Data Access audit logging example wrote an IAM policy file containing only `auditConfigs` and then applied it with `gcloud projects set-iam-policy`. This could remove existing IAM bindings. Updated the example to first fetch the current policy, add only the `auditConfigs` section, preserve existing `bindings` and `etag`, and then apply the edited policy.
- The Dataflow template path used `gs://dataflow-templates/latest/Cloud_PubSub_to_Splunk`. Current Google-provided template documentation uses regional template buckets such as `gs://dataflow-templates-us-central1/latest/Cloud_PubSub_to_Splunk`. Updated both `gcloud` examples and the Terraform `template_gcs_path`.
- The organization-level sink example did not mention granting the organization sink writer identity permission to publish to the Pub/Sub topic. Added a short note to grant `roles/pubsub.publisher` as with the project sink.
- The Cloud Monitoring regex filter used an unsupported-looking shorthand form for alert policy JSON. Updated it to `monitoring.regex.full_match(...)`, matching the documented Monitoring filter syntax.
- The Pub/Sub backlog alert filter omitted the monitored resource type. Added `resource.type="pubsub_subscription"` to make the filter explicit and valid for the Pub/Sub subscription metric.
- The Secret Manager guidance mentioned referencing the HEC token from Dataflow but did not name the required template parameters. Updated it to mention `tokenSource=SECRET_MANAGER` and `tokenSecretId=...`.

## Review Notes
- `gcloud` was not installed in the local environment, so CLI behavior was validated against official Google Cloud CLI and product documentation instead of local `--help` output.
- The post still uses the `latest` Dataflow template version for simplicity. Google recommends pinning production jobs to a dated template version to avoid unexpected breaking changes.
