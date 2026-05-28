# Validation Summary: How to Create an Eventarc Trigger to Route Cloud Storage Events to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Eventarc
- Cloud Storage
- Cloud Run
- CloudEvents
- Google Cloud CLI
- IAM
- Node.js
- Express
- `@google-cloud/storage`

## Sources Consulted
- Google Cloud Run tutorial: Use Eventarc to receive events from Cloud Storage: https://docs.cloud.google.com/run/docs/tutorials/eventarc
- Eventarc Standard: Route Cloud Storage events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-storage
- Eventarc roles and permissions for Cloud Run targets: https://docs.cloud.google.com/eventarc/docs/roles-permissions
- Cloud Run: Create triggers from Cloud Storage events: https://docs.cloud.google.com/run/docs/triggering/storage-triggers
- Google Cloud SDK reference for `gcloud eventarc triggers create`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Google Cloud SDK reference for `gcloud run deploy`: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference for `gcloud run services logs read`: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Google Cloud Buildpacks Node.js documentation: https://docs.cloud.google.com/docs/buildpacks/nodejs
- Eventarc: Determine event filters for Cloud Audit Logs: https://cloud.google.com/eventarc/docs/determining-filters-cal

## Issues Found
- The prerequisite API list was incomplete for the documented source deployment and Eventarc path. Added `artifactregistry.googleapis.com`, `cloudbuild.googleapis.com`, `eventarcpublishing.googleapis.com`, and `logging.googleapis.com` to match Google Cloud's Eventarc and Cloud Run source-deploy guidance.
- The trigger used `eventarc-sa@YOUR_PROJECT.iam.gserviceaccount.com` before creating that service account or granting `roles/eventarc.eventReceiver`. Added service account creation and the Eventarc Event Receiver role to the prerequisites.
- The Cloud Run handler downloads, copies, and deletes Cloud Storage objects, but the post did not grant the runtime service account storage object permissions. Added `roles/storage.objectUser` for the default Compute Engine service account used by Cloud Run unless a custom runtime service account is specified.
- The Cloud Run source deployment only showed `server.js`. Added the minimal `package.json` required for the Node.js buildpack to install `express` and `@google-cloud/storage` and start `server.js`.
- The trigger setup for an authenticated Cloud Run service was missing the required `roles/run.invoker` binding before Eventarc sends requests. Added the `gcloud run services add-iam-policy-binding` command before trigger creation.
- The post did not mention the location constraint for direct Cloud Storage triggers. Added a note that the bucket must be in the same project and region or multi-region as the Eventarc trigger.
- The audit-log event explanation said audit logs capture any GCS API call. Adjusted it to say they capture Cloud Storage operations that generate matching audit log entries and can be filtered by `serviceName`, `methodName`, and `resourceName`.
- The opening claimed the post covered audit-log-based events, but the implementation focuses on direct events. Adjusted the wording to avoid implying a full audit-log trigger walkthrough.

## Review Notes
- The JavaScript example is syntactically valid; the main code block passed `node --check` locally.
- The `package.json` snippet is valid JSON.
- The Google Cloud CLI is not installed in this workspace, so CLI validation was performed against official Google Cloud SDK references rather than local `gcloud --help` output.
- The post uses `gsutil cp`, which still works, but Google Cloud's newer examples generally prefer `gcloud storage cp`.
