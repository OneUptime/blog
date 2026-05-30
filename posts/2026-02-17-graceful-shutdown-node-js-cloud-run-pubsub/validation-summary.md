# Validation Summary: How to Use Graceful Shutdown in a Node.js Cloud Run Service with Active Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Pub/Sub
- Node.js
- Express
- Google Cloud CLI

## Sources Consulted
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract#instance-shutdown
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Pub/Sub Node.js SubscriberOptions reference: https://docs.cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/subscriberoptions
- Pub/Sub Node.js Message reference: https://docs.cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/message
- Pub/Sub Node.js Duration reference: https://docs.cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/duration
- Pub/Sub Node.js client overview and samples: https://docs.cloud.google.com/nodejs/docs/reference/pubsub/latest
- Node.js local parser check using Node v22.22.0

## Issues Found
- The post said Cloud Run's shutdown period is configurable up to 60 seconds. Cloud Run service shutdown is a 10-second SIGTERM-to-SIGKILL period, so the wording and timeout examples were changed to stay under 10 seconds.
- The post used `--timeout 300` as if it increased the termination grace period. That flag configures request timeout, not shutdown grace. The deploy example was changed to focus on CPU allocation for background Pub/Sub processing.
- The post used `--cpu-throttling=false`. The current documented gcloud form is `--no-cpu-throttling`, so the command was updated.
- The post claimed CPU throttling slows shutdown cleanup. Cloud Run allocates CPU during the shutdown period; the relevant issue for this pattern is CPU allocation outside request handling for background pull subscribers. The explanation and common-mistakes bullet were corrected.
- The request-tracking middleware decremented `activeRequests` in both `finish` and `close` handlers, which can double-count a single response. A one-time decrement guard was added.
- The Pub/Sub shutdown code called `subscription.close()` without awaiting it. The example now awaits the close operation before waiting on active message handlers.
- The complete shutdown example waited for the HTTP server to close before stopping Pub/Sub. It now starts HTTP close, Pub/Sub stop, and request waiting in the same shutdown window.
- The Pub/Sub subscriber example used `ackDeadline` for lease extension configuration. The current Pub/Sub docs recommend `minAckDeadline` and `maxAckDeadline` for new code, so the example now uses `maxAckDeadline`.

## Review Notes
The examples are syntactically valid JavaScript. The article still describes an advanced pattern: running a long-lived Pub/Sub pull subscriber inside a Cloud Run service. For production systems, push subscriptions, Eventarc, Cloud Run jobs, or worker pools may be more operationally natural depending on workload shape.
