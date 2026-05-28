# Validation Summary: How to Configure Approval Gates in Cloud Build to Require Manual Approval

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Cloud Build triggers and approvals
- Google Cloud CLI
- Cloud Build REST API
- IAM roles and permissions
- Pub/Sub
- Cloud Functions
- Cloud Run
- Artifact Registry
- Cloud Logging

## Sources Consulted
- Cloud Build: Gate builds on approval: https://docs.cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- Cloud Build: Create and manage build triggers: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- gcloud builds triggers create github reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- gcloud builds triggers update github reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/update/github
- Cloud Build IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/cloudbuild
- Cloud Build REST API projects.builds.approve: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.builds/approve
- Cloud Build Build resource and ApprovalResult schema: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.builds
- Cloud Build notifications with Pub/Sub: https://docs.cloud.google.com/build/docs/subscribe-build-notifications
- Deploying to Cloud Run using Cloud Build: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Artifact Registry transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown

## Issues Found
- The post claimed the console provides per-trigger approver and required-comment settings. Cloud Build approval access is controlled by IAM, and the approval dialog supports optional message/URL fields. Updated the console section and approval instructions.
- The IAM role identifier was incorrect (`roles/cloudbuild.builds.approve`). Updated it to the documented Cloud Build Approver role, `roles/cloudbuild.builds.approver`.
- The trigger update command omitted the trigger type. Updated it to use `gcloud builds triggers update github deploy-production --require-approval`.
- The Cloud Run deployment build steps invoked `gcloud` as an argument instead of using the documented `entrypoint: gcloud` pattern. Updated both staging and production snippets.
- The image examples used `gcr.io/$PROJECT_ID/...`, which can imply deprecated Container Registry writes. Updated the examples to use an Artifact Registry Docker repository URL.
- The Pub/Sub notification setup created an HTTP push subscription but used Pub/Sub-triggered Cloud Function handler code. Updated the commands and JavaScript example to use a Pub/Sub-triggered Cloud Functions gen 2 function.
- The approval timeout section claimed approval timeout is configurable in trigger settings. Updated it to the documented limitation that pending builds older than 2 months cannot be approved or rejected.
- The Cloud Logging query used the wrong approval result field path. Updated it to `jsonPayload.approval.result.decision` and `jsonPayload.approval.result.approverAccount`.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI verification was performed against official Google Cloud CLI reference documentation rather than local `gcloud --help` output.
