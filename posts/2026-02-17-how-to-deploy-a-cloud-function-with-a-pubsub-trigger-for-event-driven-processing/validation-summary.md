# Validation Summary: Deploy a Cloud Function with a Pub/Sub Trigger for Event-Driven Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Pub/Sub
- Eventarc
- Google Cloud CLI
- Node.js
- Python
- Firestore

## Sources Consulted
- Google Cloud Functions deployment documentation: https://docs.cloud.google.com/functions/docs/deploy
- Google Cloud Functions Pub/Sub CloudEvent sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Google Cloud Pub/Sub subscription retry policy documentation: https://docs.cloud.google.com/pubsub/docs/subscription-retry-policy
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub message ordering documentation: https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publish with ordering keys sample: https://docs.cloud.google.com/pubsub/docs/samples/pubsub-publish-with-ordering-keys
- Google Cloud SDK reference for `gcloud pubsub subscriptions update`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update

## Issues Found
- The retry policy explanation said each retry doubles the wait time. Google documents Pub/Sub retry policy as exponential backoff with progressively longer delays up to the maximum, applied on a best-effort per-message basis, so the wording was changed to avoid an overly exact doubling claim.
- The dead-letter topic setup omitted the IAM grants required for the Pub/Sub service agent to publish to the dead-letter topic and acknowledge forwarded messages. Added the official `roles/pubsub.publisher` and `roles/pubsub.subscriber` bindings.
- The dead-letter behavior was described as exactly moving after 5 failed attempts. Google documents maximum delivery attempts as approximate and forwarding as best-effort, so the wording was corrected.
- The message ordering section incorrectly enabled ordering on the topic with `gcloud pubsub topics update user-events --message-ordering`. Pub/Sub ordering is enabled on subscriptions at creation time, so the command and explanation were corrected to use `gcloud pubsub subscriptions create --enable-message-ordering`.

## Review Notes
- The Node.js and Python CloudEvent examples match the documented Pub/Sub CloudEvent payload shape for 2nd gen functions.
- The deployment command uses supported `gcloud functions deploy` trigger flags for a Pub/Sub-triggered Gen 2 function.
- The local environment did not have `gcloud` installed, so CLI verification used official Google Cloud SDK reference pages and Google Cloud product documentation.
