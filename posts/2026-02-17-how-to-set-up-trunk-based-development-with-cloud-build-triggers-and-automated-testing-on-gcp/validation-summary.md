# Validation Summary: How to Set Up Trunk-Based Development with Cloud Build Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Cloud Build triggers
- Google Cloud CLI
- Cloud Run
- Artifact Registry
- Pub/Sub push subscriptions
- GitHub branch protection API and GitHub CLI
- Node.js and npm
- Docker and Kaniko
- Slack Web API
- Trunk-based development and feature flags

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build step ordering documentation: https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Google Cloud Build data sharing between steps: https://docs.cloud.google.com/build/docs/configuring-builds/pass-data-between-steps
- Google Cloud Build notifications and Pub/Sub topics: https://docs.cloud.google.com/build/docs/subscribe-build-notifications
- Google Cloud Build overview, including the `cloudbuild` Docker network: https://docs.cloud.google.com/build/docs/overview
- `gcloud builds triggers create github` reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- `gcloud run services describe` reference: https://cloud.google.com/sdk/gcloud/reference/run/services/describe
- `gcloud run services update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- Pub/Sub push subscription documentation: https://docs.cloud.google.com/pubsub/docs/push
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CLI `gh api` help output from the local CLI
- Slack `chat.postMessage` API documentation: https://docs.slack.dev/reference/methods/chat.postMessage
- npm audit documentation: https://docs.npmjs.com/cli/v10/commands/npm-audit/

## Issues Found
- The integration test examples used `localhost` for PostgreSQL but did not start a database in Cloud Build. Added a Docker-based PostgreSQL test container on the `cloudbuild` network and changed `DATABASE_URL` to use the container name.
- The smoke test step used the `node:20` image to run `gcloud`, but that image does not provide the Google Cloud CLI. Split the staging URL lookup into a `gcr.io/cloud-builders/gcloud` step and passed the URL to the Node smoke-test step through `/workspace`.
- The staging deployment used `--no-traffic` and a tag, then tested `status.url`, which points at the service URL rather than specifically at the tagged revision. Removed the no-traffic/tag flags so the smoke test checks the deployed staging revision.
- The GitHub branch protection command passed nested JSON objects through `--field`, which would send them as strings. Replaced it with `gh api --input -` and a JSON request body.
- The build notification commands created a custom Pub/Sub topic without setting `options.pubsubTopic` in the Cloud Build configs. Changed the commands to use Cloud Build's default `cloud-builds` topic.
- The notification function was written like a direct Pub/Sub event handler, but the setup created a Pub/Sub push subscription to an HTTP endpoint. Updated the example to an HTTP Cloud Function that reads the wrapped Pub/Sub push body and returns a success status.
- The Kaniko optimization snippet included a `DOCKER_BUILDKIT` environment variable and a comment about regional artifacts, neither of which applied to the Kaniko step. Removed the inaccurate option.

## Review Notes
The examples remain illustrative and still assume the reader has created the Artifact Registry repository, granted Cloud Build permissions to deploy to Cloud Run and push images, installed the Slack SDK dependency, and configured Slack credentials. Those prerequisites are outside the scope of the existing post but would be useful additions in a future revision.
