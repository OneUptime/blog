# Validation Summary: How to Subscribe and Receive Messages from Pub/Sub

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Google Cloud Pub/Sub
- `@google-cloud/pubsub` Node.js client library
- `google-cloud-pubsub` Python client library
- `google-auth-library` (JWT verification for push subscriptions)
- Express.js (push endpoint handler)
- gcloud CLI (`gcloud pubsub subscriptions`)
- Cloud Monitoring API (`google-cloud-monitoring`)

## Sources Consulted
- Google Cloud Pub/Sub subscriber client docs: https://cloud.google.com/pubsub/docs/pull
- `@google-cloud/pubsub` Subscription/Subscriber class reference: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/subscription-class
- `@google-cloud/pubsub` source `src/subscriber.ts` (`SubscriberOptions` interface): https://github.com/googleapis/nodejs-pubsub/blob/main/src/subscriber.ts
- googleapis/nodejs-pubsub issue #1213 — semantics of `allowExcessMessages`
- Pub/Sub handling failures (dead letter policy / `maxDeliveryAttempts` range): https://cloud.google.com/pubsub/docs/handling-failures
- Authentication for push subscriptions (JWT issuer values): https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- python-pubsub `SubscriberClient` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.client.Client
- Pub/Sub pull troubleshooting (`return_immediately` deprecation): https://cloud.google.com/pubsub/docs/pull-troubleshooting
- gcloud `pubsub subscriptions` reference (duration syntax): https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Cloud Monitoring metrics list (`pubsub.googleapis.com/subscription/...`): https://cloud.google.com/monitoring/api/metrics_gcp

## Issues Found

1. **Misleading comment on `flowControl.allowExcessMessages`** — The code commented this option as "Allow messages to be processed after subscription is closed", which does not describe its behavior. The flag actually controls whether the client lets excess messages received beyond `maxMessages`/`maxBytes` flow through to the handler vs. holding them back until the lease frees capacity. Rewrote the comment to describe the real behavior.

2. **Invalid `ackDeadline: 60` key in `SubscriberOptions`** — The flow-control example passed `ackDeadline: 60` to `pubsub.subscription(name, options)`. That key is not part of the `SubscriberOptions` interface in `@google-cloud/pubsub` (valid keys: `minAckDeadline`, `maxAckDeadline`, `maxExtensionTime`, `flowControl`, `streamingOptions`, `batching`, `useLegacyFlowControl`, `closeOptions`). It would have been silently ignored. Note that `ackDeadlineSeconds` is a separate field used at subscription *creation* time, not for the subscriber client. Removed the misleading line to keep the example correct and minimal. Lease auto-extension is handled by the client library by default.

## Review Notes

- **`return_immediately` is deprecated** in the synchronous pull request (`subscriber.pull(request={..., "return_immediately": False})`). It still works, and `False` is the safer setting (long-polling), but Google now recommends streaming pull (`subscriber.subscribe(...)`) for most cases. Left as-is since the post's intent is to demonstrate the batch/synchronous pull pattern explicitly.
- **Python `modify_ack_deadline` is largely redundant** when using `subscriber.subscribe()` — the streaming pull client automatically extends ack deadlines via lease management. The example is still valid as a demonstration but explicit deadline extension is rarely needed in practice. Left as-is; the example is correct.
- **Unused imports**: `from google.cloud.pubsub_v1.types import PullRequest` in the batch pull section and `from google.protobuf import timestamp_pb2` in the monitoring section are imported but never used. Minor code-smell, not a technical error. Left as-is.
- **`maxDeliveryAttempts: 5`** — verified as the minimum (and default) for Pub/Sub dead-letter policy; valid range 5–100.
- **JWT issuer check** accepts both `accounts.google.com` and `https://accounts.google.com`, which matches Google's official sample guidance.
- **`message.deliveryAttempt`** in the dead-letter example is the correct property name and is populated when a dead-letter policy is configured on the subscription.
- **`--message-retention-duration=7d`** is valid gcloud duration syntax (subscriptions allow 10 minutes–7 days for default retention; up to 31 days when extended retention is enabled).
