# Validation Summary: How to Build a Microservice Choreography Architecture on GCP Using Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Functions / Cloud Run functions
- Google Cloud CLI
- Node.js
- Firestore
- SendGrid Node.js mail client
- Event-driven microservice choreography

## Sources Consulted
- Google Cloud Functions 1st gen Pub/Sub sample: https://cloud.google.com/functions/docs/samples/functions-helloworld-pubsub
- Google Cloud Functions Pub/Sub subscribe sample: https://cloud.google.com/functions/docs/samples/functions-pubsub-subscribe
- Google Cloud Functions deployment documentation: https://cloud.google.com/functions/docs/deploy
- Google Cloud Functions runtime support schedule: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud event-driven function retries: https://docs.cloud.google.com/functions/docs/bestpractices/retries
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud SDK `gcloud pubsub subscriptions update` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud Pub/Sub Node.js client `Topic` reference: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/topic

## Issues Found
- The Pub/Sub-triggered Cloud Function examples called `message.ack()`, but Cloud Functions event handlers are acknowledged by the platform when the function completes successfully. Removed manual acknowledgements from the welcome email, account provisioner, and referral tracker examples.
- The failure-handling comment said throwing always causes redelivery. In Cloud Functions, event retry behavior must be enabled. Updated the comment and deploy commands to use `--retry`.
- The setup created named Pub/Sub subscriptions, but the later `gcloud functions deploy --trigger-topic` commands create and manage the trigger subscriptions for Cloud Functions. Replaced the manual subscription setup with an explanation of the managed trigger subscriptions.
- The referral-tracking example created only a Pub/Sub subscription for a Cloud Function-style handler. Changed it to deploy the new function with a trigger on the existing topic.
- The dead-letter example updated named subscriptions that were no longer connected to the deployed Cloud Functions. Clarified that dead-letter policies apply to subscriptions managed directly, and that Cloud Functions trigger subscriptions are managed by the platform.
- The deploy commands used `nodejs20`, which entered deprecation on April 30, 2026. Updated the examples to `nodejs22`, which is still supported as of May 28, 2026.
- The code uses the 1st gen Cloud Functions background handler shape. Made the deploy commands explicit with `--no-gen2` so the runtime model matches the code examples.

## Review Notes
The post is now technically consistent for Cloud Functions 1st gen with Pub/Sub triggers. `gcloud` was not installed in the local workspace, so CLI syntax was checked against official Google Cloud SDK documentation instead of local `--help` output.
