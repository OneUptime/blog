# Validation Summary: How to Set Up Pub/Sub Notifications for Security Command Center Findings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Security Command Center
- Pub/Sub topics and subscriptions
- Google Cloud CLI
- Cloud Functions / Pub/Sub-triggered Python processing
- Slack incoming webhooks

## Sources Consulted
- Google Cloud Security Command Center: Enable finding notifications for Pub/Sub: https://docs.cloud.google.com/security-command-center/docs/how-to-notifications
- Google Cloud Security Command Center: Creating and managing Notification Configs: https://docs.cloud.google.com/security-command-center/docs/how-to-api-manage-notifications
- Google Cloud Security Command Center: Filtering notifications: https://docs.cloud.google.com/security-command-center/docs/how-to-api-filter-notifications
- Google Cloud Security Command Center REST reference for NotificationConfig: https://docs.cloud.google.com/security-command-center/docs/reference/rest/v1/organizations.notificationConfigs
- Google Cloud Security Command Center quotas and limits: https://cloud.google.com/security-command-center/quotas
- Google Cloud SDK reference for `gcloud pubsub subscriptions create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK reference for `gcloud pubsub subscriptions pull`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/pull

## Issues Found
- The original post used an outdated SCC service account format and instructed readers to manually grant `roles/pubsub.publisher`. Updated the section to use the current SCC notification service account format, `service-org-ORGANIZATION_ID@gcp-sa-scc-notification.iam.gserviceaccount.com`, and explain that Google Cloud grants the required service-agent role when creating the notification config if the caller has Pub/Sub Admin permissions.
- The original `gcloud scc notifications` examples omitted the current `--location` flag and used a bare organization ID. Updated create, list, describe, and delete examples to use `--organization=organizations/ORGANIZATION_ID` and `--location=global`, matching current Google documentation.
- The original push subscription wording implied any Cloud Function or Slack webhook could be used directly as a Pub/Sub push endpoint. Updated the wording and example endpoint to clarify that the destination must be an HTTPS endpoint that accepts Pub/Sub push requests.
- The original gotcha said notification configs are only organization-level resources. Updated it to note that notification configs can be organization-, folder-, or project-level resources.
- Added Pub/Sub Admin (`roles/pubsub.admin`) as a prerequisite because current Google documentation requires it on the Pub/Sub topic used by the notification config setup flow.

## Review Notes
The Python function is syntactically valid for a legacy Pub/Sub-triggered Cloud Function style. For new deployments, Cloud Run functions / Cloud Functions 2nd gen commonly use CloudEvents-style handlers, but the example remains technically valid as a simple Pub/Sub-triggered function pattern when deployed with the matching runtime and trigger style.
