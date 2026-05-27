# Validation Summary: How to Route Pub/Sub Messages to Cloud Run Services Using Eventarc

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Eventarc
- Google Cloud Pub/Sub
- Cloud Run
- Google Cloud CLI
- Node.js
- Express
- CloudEvents

## Sources Consulted
- Eventarc: Route Cloud Pub/Sub events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-pubsub
- Cloud Run: Create triggers from Pub/Sub events: https://cloud.google.com/run/docs/triggering/pubsub-triggers
- Eventarc CloudEvents format: https://docs.cloud.google.com/eventarc/docs/cloudevents
- Google Cloud CLI reference for `gcloud eventarc triggers create`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Google Cloud CLI reference for `gcloud pubsub topics publish`: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/publish
- Google Cloud CLI reference for `gcloud run services logs read`: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Pub/Sub push subscriptions: https://docs.cloud.google.com/pubsub/docs/push
- Cloud Run deploy from source: https://cloud.google.com/run/docs/deploying-source-code
- Cloud Run Node.js quickstart: https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service
- Pub/Sub Node.js client library `Topic.publishMessage`: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/topic.html

## Issues Found
- The prerequisites enabled only Cloud Run, Eventarc, and Pub/Sub APIs, but the post deploys from source and reads logs. I added `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, and `logging.googleapis.com` so the setup matches Cloud Run source deployment and logging requirements.
- The Cloud Run service example used Express but did not include a `package.json`, so `gcloud run deploy --source=.` would not have enough information to install dependencies and start `server.js`. I added a minimal `package.json` with a `start` script and Express dependency.
- The acknowledgment section said any HTTP 2xx acknowledges a Pub/Sub push message and only 4xx or 5xx nacks it. Pub/Sub documents the acknowledgment status codes as 102, 200, 201, 202, and 204; any other status code is a negative acknowledgment. I updated the bullets accordingly.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI flags were verified against the official Google Cloud CLI reference instead of local `--help` output.
- For older Google Cloud projects, Eventarc/Pub/Sub service-agent IAM setup can require additional permissions, but the main trigger flow and commands in the post are correct for current projects.
