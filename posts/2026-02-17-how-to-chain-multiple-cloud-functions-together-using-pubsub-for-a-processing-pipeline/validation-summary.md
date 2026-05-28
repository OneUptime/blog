# Validation Summary: How to Chain Multiple Cloud Functions Together Using Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Pub/Sub
- Cloud Storage triggers
- Pub/Sub dead-letter topics
- Node.js
- @google-cloud/pubsub
- @google-cloud/storage
- @google-cloud/vision
- @google-cloud/firestore
- sharp
- gcloud CLI

## Sources Consulted
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Functions Node.js runtime documentation: https://cloud.google.com/functions/docs/concepts/nodejs-runtime
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Functions Pub/Sub subscribe sample: https://cloud.google.com/functions/docs/samples/functions-pubsub-subscribe
- Cloud Functions Cloud Storage tutorial: https://cloud.google.com/functions/1stgendocs/tutorials/storage-1st-gen
- Pub/Sub Node.js Topic API reference: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/topic.html
- Pub/Sub dead-letter topics documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- gcloud pubsub subscriptions update reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Pub/Sub subscription overview: https://cloud.google.com/pubsub/docs/subscription-overview
- Pub/Sub message ordering documentation: https://cloud.google.com/pubsub/docs/ordering
- Pub/Sub exactly-once delivery documentation: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Cloud Vision API text detection documentation: https://cloud.google.com/vision/docs/ocr

## Issues Found
- The deployment commands used the `nodejs18` runtime, which is decommissioned as of the current Google Cloud runtime support schedule. Updated all deployment commands to `nodejs22`, which is currently supported for 1st gen Cloud Functions / Cloud Run functions.
- The architecture diagram and topic-creation commands included a `validate-image` Pub/Sub topic, but the validation function is actually triggered directly by Cloud Storage. Removed the unused topic from the setup commands and changed the diagram to show Cloud Storage invoking the validation function directly.
- The OCR function assumed `result.textAnnotations` was always present. Updated it to default to an empty array so images with no text annotations do not throw.
- The notification function had code but no deployment command, making the end-to-end tutorial incomplete. Added a `gcloud functions deploy notifyUser` command with a `notify-user` Pub/Sub trigger.
- The dead-letter example used a brittle auto-created subscription name and omitted the required Pub/Sub service account permissions. Replaced the concrete subscription name with `SUBSCRIPTION_ID` and added the required IAM caveat.
- The idempotency section stated that Pub/Sub guarantees at-least-once delivery and not exactly-once delivery. Pub/Sub supports exactly-once delivery for pull subscriptions, but Cloud Functions triggers should still be treated as at-least-once/retryable. Updated the wording to describe the default and Cloud Functions trigger behavior accurately.

## Review Notes
The corrected post remains a 1st gen/background-function style tutorial. A future update could show the newer CloudEvents/Eventarc function signatures for Cloud Run functions, but the current examples are technically valid with the deployment style shown. The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference documentation instead of local `gcloud --help` output.
