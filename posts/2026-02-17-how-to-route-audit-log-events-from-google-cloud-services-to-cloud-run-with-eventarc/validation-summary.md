# Validation Summary: How to Route Audit Log Events from Google Cloud Services to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Eventarc
- Cloud Audit Logs
- Cloud Run
- Google Cloud CLI
- Node.js
- Express

## Sources Consulted
- Google Cloud Eventarc: Route audit log events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-audit-logs
- Google Cloud Eventarc: Determine event filters for Cloud Audit Logs: https://cloud.google.com/eventarc/docs/determining-filters-cal
- Google Cloud Eventarc: Roles and permissions for Cloud Run targets: https://docs.cloud.google.com/eventarc/docs/roles-permissions
- Google Cloud Logging: Cloud Audit Logs overview: https://docs.cloud.google.com/logging/docs/audit
- Google Cloud Logging: Enable Data Access audit logs: https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Compute Engine audit logging: https://docs.cloud.google.com/compute/docs/logging/audit-logging
- Google Cloud IAM audit logging: https://docs.cloud.google.com/iam/docs/audit-logging
- Google Cloud Storage audit logging: https://docs.cloud.google.com/storage/docs/audit-logging
- Google Cloud Run: Deploy services from source code: https://docs.cloud.google.com/run/docs/deploying-source-code
- Google Cloud Run Node.js quickstart: https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service

## Issues Found
- The opening claim said every Google Cloud action generates an audit log entry. Changed it to "many actions" and noted that Cloud Storage object access requires Data Access logs, because Cloud Audit Logs coverage and Cloud Storage restrictions are not universal.
- The Eventarc description implied all Admin Activity and Data Access logs can be routed. Changed it to supported Cloud Audit Logs events, matching Eventarc's documented supported event filters.
- The prerequisites omitted `eventarcpublishing.googleapis.com` for Eventarc audit log triggers and `cloudbuild.googleapis.com` for `gcloud run deploy --source`. Added both APIs.
- The Cloud Run Node.js sample only showed `server.js`, so `gcloud run deploy --source=.` would not have dependency or start-script metadata for Express. Added a minimal `package.json`.
- The Eventarc trigger service account was only granted `roles/run.invoker`. Added `roles/eventarc.eventReceiver`, which Eventarc requires for triggers receiving events from providers.
- The IAM policy trigger used `methodName=SetIamPolicy` with `serviceName=iam.googleapis.com`. Changed it to `google.iam.admin.v1.SetIAMPolicy`, the documented IAM audit log method name for IAM service account policy changes.
- The handler's IAM sensitive-action list used `google.iam.admin.v1.SetIamPolicy`. Changed it to `google.iam.admin.v1.SetIAMPolicy` to match the documented method name.

## Review Notes
The JavaScript handler was extracted from the Markdown and validated with `node --check`. The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud documentation instead of local `--help` output.
