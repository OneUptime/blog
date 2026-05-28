# Validation Summary: How to Handle Retries and Dead Letter Topics in Cloud Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions Gen 2
- Google Cloud Pub/Sub
- Pub/Sub retry policies and dead letter topics
- Google Cloud CLI
- Node.js Functions Framework
- Firestore

## Sources Consulted
- Google Cloud: Configure event-driven function retries: https://docs.cloud.google.com/functions/docs/bestpractices/retries
- Google Cloud SDK: `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK: `gcloud pubsub subscriptions update`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud Pub/Sub: Subscription retry policy: https://cloud.google.com/pubsub/docs/subscription-retry-policy
- Google Cloud Pub/Sub: Dead-letter topics: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support

## Issues Found
- Gen 2 event-driven Cloud Functions deployed through the Cloud Functions v2 API were described as retrying by default. Current Google Cloud documentation says retries are disabled by default for this deployment path and must be enabled with `--retry`, so the retry behavior and enabling instructions were corrected.
- The post implied Pub/Sub retry delay and dead letter topic settings could be directly applied to the managed subscription created by `--trigger-topic`. Current Google Cloud documentation says direct retry policy customization for Cloud Run functions requires an HTTP function with a Pub/Sub subscription you manage yourself, so the subscription policy sections now state that scope explicitly.
- The retry delay list described exact doubling intervals. Pub/Sub documents exponential backoff as progressively longer, best-effort delivery delays bounded by the configured minimum and maximum, so the explanation was softened to avoid overpromising exact timings.
- The dead letter handler used `CloudPubSubDeadLetterSourceTopic`, which is not one of the documented dead-letter attributes. It now stores `CloudPubSubDeadLetterSourceSubscription`, which is documented.
- The deploy example used `nodejs20`. As of 2026-05-28, Google Cloud lists Node.js 20 as deprecated as of 2026-04-30, so the example now uses `nodejs22`.

## Review Notes
The local environment did not have `gcloud` installed, so command validation was performed against the official Google Cloud SDK command reference instead of local `--help` output. The JavaScript snippets use current APIs, but a production implementation should strip Pub/Sub dead-letter metadata attributes before republishing if downstream consumers should only see the original message attributes.
