# Validation Summary: How to Implement Pub/Sub Snapshot and Seek for Replay

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Pub/Sub (snapshot and seek)
- Python client library (`google-cloud-pubsub` / `pubsub_v1.SubscriberClient`)
- Node.js client library (`@google-cloud/pubsub`)
- `gcloud pubsub` CLI
- Google Cloud Monitoring (`monitoring_v3`)
- Redis (for idempotency tracking)
- GitHub Actions (CI/CD workflow)

## Sources Consulted
- Google Cloud Pub/Sub replay overview: https://cloud.google.com/pubsub/docs/replay-overview
- Pub/Sub snapshot reference (`Snapshot.expire_time` semantics): https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.snapshots
- Pub/Sub message retention docs: https://cloud.google.com/pubsub/docs/replay-overview#retention
- Pub/Sub seek behavior: https://cloud.google.com/pubsub/docs/replay-overview#seek
- Python client `pubsub_v1.SubscriberClient` API (create_snapshot, seek, list_snapshots, delete_snapshot)
- Node.js client `@google-cloud/pubsub` Subscription/Snapshot APIs
- gRPC canonical status codes (3=INVALID_ARGUMENT, 5=NOT_FOUND, 6=ALREADY_EXISTS, 9=FAILED_PRECONDITION)
- `gcloud pubsub snapshots` / `gcloud pubsub subscriptions seek` CLI reference
- google-github-actions/auth@v2 and setup-gcloud@v2 action references

## Issues Found

1. **Snapshot expiration semantics were inverted/incorrect.**
   - Original: "Snapshots expire after 7 days by default but can retain messages for up to 7 days beyond the oldest unacknowledged message."
   - Issue: This implies snapshots can extend beyond 7 days. In reality, 7 days is a hard maximum, and the lifetime is *reduced* by the age of the oldest unacked message at creation (`lifetime = 7 days - age of oldest unacked message`).
   - Fix: Rewrote the Snapshot Expiration bullet to reflect the actual formula and the hard 7-day cap.

2. **Seek operations claim was wrong.**
   - Original: "Seeking resets the acknowledgment state, causing previously acknowledged messages to be redelivered. All pending messages are also dropped."
   - Issue: Pub/Sub seek does not "drop pending messages." Seek changes ack state based on publish time relative to the target — messages published before the target are marked acked, messages published after are marked unacked. The "all pending messages dropped" assertion is not part of the documented behavior.
   - Fix: Rewrote to accurately describe seek semantics (publish-time-relative ack state changes, with backward vs forward seek effects).

3. **Message retention default/max attribution was conflated.**
   - Original: "Topics retain messages for a configurable period (default 7 days, max 31 days)."
   - Issue: Topic message retention has no default (unset unless configured) and a max of 31 days. The "default 7 days" actually corresponds to *subscription* message retention (which is also the maximum). The post conflated two separate settings.
   - Fix: Clarified that subscriptions have a 7-day default/max for unacked message retention, while topic retention is a separate setting configurable up to 31 days to extend the replay window.

## Review Notes

- All Python code samples use current, non-deprecated `pubsub_v1.SubscriberClient` APIs: `create_snapshot`, `seek`, `list_snapshots`, `delete_snapshot`, `subscription_path`, `snapshot_path`. The `request={...}` dict pattern is the documented form.
- Node.js code uses correct `@google-cloud/pubsub` v3+ APIs: `pubsub.subscription()`, `subscription.createSnapshot()`, `subscription.seek()`, `pubsub.snapshot()`. The destructured `[snapshot]` / `[metadata]` return shape is correct for that library.
- gRPC status code numbers used in the Node.js error handling (3, 5, 6, 9) match the canonical gRPC codes for INVALID_ARGUMENT, NOT_FOUND, ALREADY_EXISTS, FAILED_PRECONDITION.
- `gcloud pubsub snapshots create/list/delete` and `gcloud pubsub subscriptions seek` commands in the GitHub Actions YAML use correct subcommand names and flags. The `--sort-by="~expireTime"` syntax (with `~` for descending) is valid gcloud format.
- GitHub Actions versions (`actions/checkout@v4`, `google-github-actions/auth@v2`, `google-github-actions/setup-gcloud@v2`) are current as of mid-2026.
- Monitoring metric types (`pubsub.googleapis.com/subscription/num_undelivered_messages` and `.../subscription/oldest_unacked_message_age`) are valid Pub/Sub metrics in Cloud Monitoring.
- 7-day retention math is correct in the code (7 × 86400 = 604800 seconds; 6 × 86400 = 518400 seconds).
- Minor non-blocking observation: in the Node.js `createSnapshot` ALREADY_EXISTS branch, the function returns `pubsub.snapshot(snapshotName)` (a Snapshot object) rather than metadata, which is inconsistent with the JSDoc `@returns` of "snapshot metadata." Functional, but a minor type inconsistency — left as-is since it does not affect runtime correctness.
- The `subscriber.create_snapshot` call uses a naive `datetime.datetime.now()` for label values, which is fine for label strings; the seek-by-timestamp example correctly uses tz-aware UTC datetime before converting to protobuf Timestamp.
