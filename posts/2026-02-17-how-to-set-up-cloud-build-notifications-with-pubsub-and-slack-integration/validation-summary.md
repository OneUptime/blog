# Validation Summary: How to Set Up Cloud Build Notifications with Pub/Sub and Slack Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Pub/Sub
- Cloud Run functions / Cloud Functions
- Google Cloud CLI
- Slack incoming webhooks
- Cloud Build notifiers
- Secret Manager
- JavaScript / Node.js
- YAML and JSON configuration

## Sources Consulted
- Google Cloud Build: Subscribe to build notifications: https://cloud.google.com/build/docs/subscribe-build-notifications
- Google Cloud Build notifiers overview: https://cloud.google.com/build/docs/configuring-notifications/notifiers
- Google Cloud Build notification automation: https://cloud.google.com/build/docs/configuring-notifications/automate
- Google Cloud Build REST Build resource and status enum: https://cloud.google.com/build/docs/api/reference/rest/v1/projects.builds
- Google Cloud Functions gcloud deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Build submit reference: https://cloud.google.com/sdk/gcloud/reference/builds/submit
- GoogleCloudPlatform/cloud-build-notifiers setup script and Slack examples: https://github.com/GoogleCloudPlatform/cloud-build-notifiers
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks

## Issues Found
- The post implied Cloud Build notifications would be available without creating the default Pub/Sub topic. Updated the explanation and setup command to create the `cloud-builds` topic, matching Google Cloud's notification setup requirements.
- The Cloud Build status handling skipped terminal statuses `INTERNAL_ERROR` and `EXPIRED`. Updated the status map, terminal-status filtering, and failure-filter example so those completed builds are not silently ignored.
- The function deployment used `nodejs18`, which is past its Cloud Functions decommission date as of this review. Updated the runtime and package engine example to Node.js 22.
- The Cloud Build notifier example omitted the Slack Block Kit template configuration needed by the Slack notifier. Added a `template` reference and a matching `slack.json` template.
- The notifier deployment command referenced an undefined `setup.yaml` workflow. Replaced it with the official `cloud-build-notifiers` repository setup script flow and included the additional APIs needed for the notifier path.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud CLI flags and workflows were validated against official Google Cloud CLI and product documentation instead. JavaScript and JSON snippets were syntax-checked locally with Node.js 22.
