# Validation Summary: How to Set Up Batch Job Notifications Using Pub/Sub and Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Batch
- Pub/Sub
- Cloud Run functions / Cloud Functions 2nd gen
- Python
- BigQuery
- Cloud Monitoring and Cloud Logging
- Slack webhooks
- PagerDuty Events API

## Sources Consulted
- Google Cloud Batch: Create and run a job that sends Pub/Sub status notifications: https://docs.cloud.google.com/batch/docs/enable-notifications
- Google Cloud Batch: Monitor job status using Pub/Sub notifications and BigQuery: https://docs.cloud.google.com/batch/docs/monitor-jobs-using-notifications
- Google Cloud SDK: gcloud batch jobs submit: https://cloud.google.com/sdk/gcloud/reference/batch/jobs/submit
- Google Cloud SDK: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Logging: Configure log-based alerting policies: https://docs.cloud.google.com/logging/docs/alerting/log-based-alerts
- Cloud Logging monitored resource types: https://cloud.google.com/logging/docs/api/v2/resource-list
- Google Cloud SDK: gcloud alpha monitoring channels create: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/channels/create
- Cloud Run functions Pub/Sub trigger tutorial: https://docs.cloud.google.com/run/docs/tutorials/pubsub-eventdriven

## Issues Found
- The Cloud Function parsed Batch notifications as a nested JSON job object in Pub/Sub message data. Google Cloud Batch documents job notification details as Pub/Sub attributes such as `JobName`, `JobUID`, `NewJobState`, and `Region`. Updated the handler to read message attributes, while keeping a JSON data fallback for custom messages.
- The Slack and BigQuery examples used `task_count`, but Batch job-state notifications don't provide task counts in the documented attributes. Replaced `task_count` with `region` throughout the handler and BigQuery schema.
- The failure Slack console link hardcoded `us-central1`. Updated it to use the notification region attribute.
- The Pub/Sub subscription comment implied the manually created pull subscription was for the Cloud Function. Updated the comment to describe it as optional manual testing, because the function deployment creates its own trigger subscription.
- The Cloud Function source omitted required Python dependencies. Added a minimal `requirements.txt` snippet for `functions-framework`, `google-cloud-bigquery`, and `requests`.
- The Cloud Monitoring email alert command used metric-threshold flags with a log filter and included unsupported flags. Replaced it with the documented log-based alerting policy file using `conditionMatchedLog` and `gcloud monitoring policies create --policy-from-file`.
- The Cloud Logging resource type in the alert filter was corrected to the documented Batch monitored resource type, `batch.googleapis.com/Job`.

## Review Notes
The post is technically relevant and salvageable. The Batch notification configuration, `gcloud batch jobs submit --config -` usage, Pub/Sub topic creation, email notification channel command, BigQuery query, and Cloud Functions 2nd gen Pub/Sub trigger pattern were otherwise consistent with current official documentation.
