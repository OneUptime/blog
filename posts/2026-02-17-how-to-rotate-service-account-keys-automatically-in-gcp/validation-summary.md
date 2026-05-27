# Validation Summary: How to Rotate Service Account Keys Automatically in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud IAM service account keys
- Cloud Functions / Cloud Run functions Gen 2
- Cloud Scheduler
- Pub/Sub
- Secret Manager
- Cloud Monitoring
- Security Command Center
- Python Functions Framework
- Google Cloud CLI

## Sources Consulted
- Google Cloud IAM: Create and delete service account keys - https://cloud.google.com/iam/docs/keys-create-delete
- Google Cloud IAM Python client reference - https://cloud.google.com/python/docs/reference/iam/latest/google.cloud.iam_admin_v1.services.iam.IAMClient
- Secret Manager: Add a secret version - https://cloud.google.com/secret-manager/docs/add-secret-version
- Secret Manager: Event notifications - https://cloud.google.com/secret-manager/docs/event-notifications
- Google Cloud SDK: gcloud functions deploy - https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK: gcloud functions logs read - https://cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Google Cloud SDK: gcloud scheduler jobs create pubsub - https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/pubsub
- Cloud Run functions deployment prerequisites - https://cloud.google.com/run/docs/deploy-functions
- Cloud Monitoring metrics for Cloud Functions - https://cloud.google.com/monitoring/api/metrics_gcp_c
- Security Command Center remediation: Service account key not rotated - https://cloud.google.com/security-command-center/docs/how-to-remediate-security-health-analytics-findings

## Issues Found
- The prerequisites and API enablement command omitted services required for Gen 2/Cloud Run functions deployment and Pub/Sub event triggers, including Cloud Build, Artifact Registry, Cloud Run Admin, Cloud Logging, and Eventarc. Added those APIs to the prerequisite list and `gcloud services enable` command.
- The rotation strategy and diagram claimed the function sends a team notification, but the sample function does not implement notifications. Removed that unimplemented step from the strategy and diagram.
- The original function deleted every old key immediately after writing the new key to Secret Manager, which contradicted the downtime-avoidance explanation because consumers might still be using the previous key. Updated the sample to keep the most recent previous key as a fallback and delete only older stale keys.
- The scheduler text described a 30-day cadence while the cron expression runs monthly on the first day of each month. Updated the wording and diagram to say monthly.
- The Python sample included unused imports. Removed them while correcting the rotation logic.

## Review Notes
The sample uses broad `roles/secretmanager.admin` access for simplicity. A production implementation could narrow this to permissions such as adding secret versions on the specific secret. The fallback-key approach assumes consumers switch to the latest Secret Manager version before the next scheduled rotation.
