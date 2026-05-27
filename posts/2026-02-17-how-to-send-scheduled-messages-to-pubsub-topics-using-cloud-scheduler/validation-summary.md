# Validation Summary: How to Send Scheduled Messages to Pub/Sub Topics Using Cloud Scheduler

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Scheduler
- Google Cloud Pub/Sub
- Google Cloud CLI
- Cloud Run functions / Cloud Functions gen 2
- Node.js
- Python

## Sources Consulted
- Google Cloud CLI reference for `gcloud scheduler jobs create pubsub`: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/pubsub
- Google Cloud CLI reference for `gcloud pubsub subscriptions create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Pub/Sub subscription filter documentation: https://docs.cloud.google.com/pubsub/docs/subscription-message-filter
- Google Cloud CLI reference for `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run functions runtime support documentation: https://cloud.google.com/functions/docs/runtime-support
- Cloud Run functions Pub/Sub CloudEvent sample documentation: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Google Cloud CLI reference for `gcloud pubsub subscriptions pull`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/pull
- Pub/Sub subscription listing documentation: https://cloud.google.com/pubsub/docs/list-subscriptions

## Issues Found
- Corrected the explanation that messages are stored in a topic until subscribers acknowledge them. Pub/Sub acknowledgement and backlog retention are subscription-level concepts, so the post now says messages are stored in each subscription backlog until acknowledged or retention expires.
- Clarified that independent fan-out happens through multiple subscriptions, not multiple subscribers sharing one subscription.
- Updated the optional dead-letter topic note so it does not imply that creating a topic alone configures dead-letter delivery.
- Changed the message attributes example from the undeclared `report-requests` topic to the existing `scheduled-tasks` topic so the command works in the tutorial flow.
- Updated the Cloud Functions runtime from `nodejs20` to `nodejs22` because Node.js 20 is deprecated as of April 30, 2026 in Cloud Run functions runtime support.
- Added placeholder `run_sync` and `run_cleanup` functions to the Python subscriber example so the example does not fail with undefined function errors.
- Replaced invalid Pub/Sub subscription filter flags from `--filter` to `--message-filter`, which is the current `gcloud pubsub subscriptions create` flag for Pub/Sub message filters.
- Corrected the monitoring command label so it accurately describes subscription retention and acknowledgement settings instead of claiming to show backlog count.

## Review Notes
The post is technically valid after these fixes. Future improvements could show a complete dead-letter subscription configuration and use Cloud Monitoring metrics for actual backlog counts, but those are enhancements rather than correctness fixes required for this review.
