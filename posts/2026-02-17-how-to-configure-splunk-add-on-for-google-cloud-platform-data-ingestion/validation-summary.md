# Validation Summary: How to Configure Splunk Add-On for Google Cloud Platform Data Ingestion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Google Cloud Pub/Sub
- Cloud Logging log sinks
- Cloud Monitoring
- Google Cloud IAM service accounts and roles
- Splunk Enterprise
- Splunk Add-on for Google Cloud Platform
- Splunk configuration files and SPL searches

## Sources Consulted
- Splunk Add-on for Google Cloud Platform documentation: https://splunk.github.io/splunk-add-on-for-google-cloud-platform/
- Configure Google Cloud account: https://splunk.github.io/splunk-add-on-for-google-cloud-platform/ConfigureGoogleCloudAccount/
- Set up the Splunk Add-on for Google Cloud Platform: https://splunk.github.io/splunk-add-on-for-google-cloud-platform/SetupvAddOn/
- Configure Cloud Pub/Sub inputs: https://splunk.github.io/splunk-add-on-for-google-cloud-platform/ConfigureCloudPubSub/
- Configure Cloud Monitoring inputs: https://splunk.github.io/splunk-add-on-for-google-cloud-platform/ConfigureCloudMonitoring/
- Source types for the Splunk Add-on for Google Cloud Platform: https://splunk.github.io/splunk-add-on-for-google-cloud-platform/Sourcetypes/
- Splunk Add-on performance reference: https://splunk.github.io/splunk-add-on-for-google-cloud-platform/Performancereference/
- Splunk validated architecture for GCP ingestion: https://help.splunk.com/en/data-management/splunk-validated-architectures/getting-data-in-forwarding-and-preprocessing/getting-google-cloud-platform-data-into-the-splunk-platform
- Google Cloud IAM Pub/Sub roles: https://docs.cloud.google.com/iam/docs/roles-permissions/pubsub
- gcloud logging sinks create reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- gcloud Pub/Sub subscriptions update reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- gcloud Pub/Sub subscriptions pull reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/pull
- Pub/Sub dead-letter topics: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Splunk indexes.conf reference: https://docs.splunk.com/Documentation/Splunk/9.4.2/Admin/Indexesconf

## Issues Found
- The credentials example incorrectly said the service account JSON should be base64 encoded and included `google_project` in `google_cloud_credentials.conf`. Updated it to use one-line JSON and `account_type = service_account`, matching the add-on documentation.
- The Pub/Sub input example used `inputs.conf`, a modular input stanza name, explicit sourcetype, `disabled`, and `max_messages`. Updated it to use `google_pubsub_inputs.conf` with the documented plain stanza and supported fields.
- The Cloud Monitoring input example used an `inputs.conf`-style stanza and unsupported field names. Updated it to use `google_cloud_monitor_inputs.conf`, `google_monitored_projects`, `google_metrics`, `polling_interval`, `oldest`, and `index`.
- The validation searches only matched `google:gcp:pubsub:message`, which misses the newer granular Pub/Sub sourcetypes introduced in add-on 4.0.0. Updated the searches to match `google:gcp:pubsub:*`.
- The troubleshooting command used `--auto-ack=false`. Updated it to the documented `--no-auto-ack` boolean form.
- The production tuning section referred to a non-documented `max_messages` Pub/Sub input setting. Replaced it with guidance based on the add-on performance reference and the 60-second acknowledgment deadline recommendation.
- The dead-letter topic example omitted required Pub/Sub service agent IAM bindings. Added publisher access on the dead-letter topic and subscriber access on the source subscription.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud CLI syntax was verified against official Google Cloud SDK documentation instead of local `--help` output. The post remains a general tutorial and does not pin a specific Splunk Add-on version; the corrections align with the current Splunk Add-on for Google Cloud Platform documentation available during review.
