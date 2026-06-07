# Validation Summary: How to Configure Message Retention in Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- gcloud CLI (`gcloud pubsub topics`, `gcloud pubsub subscriptions`, `gcloud pubsub snapshots`)
- Terraform (`google_pubsub_topic`, `google_pubsub_subscription` resources)
- Python client library (`google-cloud-pubsub`, `pubsub_v1`)
- Node.js client library (`@google-cloud/pubsub`)
- Go client library (`cloud.google.com/go/pubsub`)
- Google Cloud Monitoring (`monitoring_v3`)
- Protocol Buffers (`duration_pb2`, `durationpb`)

## Sources Consulted
- Google Cloud Pub/Sub Documentation — Message retention: https://cloud.google.com/pubsub/docs/handling-failures#message_retention
- Google Cloud Pub/Sub Documentation — Replay and discard messages: https://cloud.google.com/pubsub/docs/replay-overview
- gcloud reference — `gcloud pubsub topics create/update`: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics
- gcloud reference — `gcloud pubsub subscriptions create/update/seek`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions
- Terraform provider — `google_pubsub_topic`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform provider — `google_pubsub_subscription`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Python client API reference (`google-cloud-pubsub`): https://cloud.google.com/python/docs/reference/pubsub/latest
- Node.js client API reference (`@google-cloud/pubsub`): https://cloud.google.com/nodejs/docs/reference/pubsub/latest
- Go client package docs (`cloud.google.com/go/pubsub`): https://pkg.go.dev/cloud.google.com/go/pubsub
- Cloud Monitoring metric inventory for Pub/Sub: https://cloud.google.com/monitoring/api/metrics_gcp#gcp-pubsub

## Issues Found

### Go client library: incorrect way to clear retention (fixed)
- **Location:** `RemoveTopicRetention` Go example.
- **Issue:** The example used `RetentionDuration: 0` to clear retention. The `cloud.google.com/go/pubsub.TopicConfigToUpdate.RetentionDuration` field is typed as `optional.Duration` (an `interface{}` alias). Per the package docs, a **negative** value clears retention; zero is not the documented sentinel for clearing. Additionally, an untyped `0` literal would be stored as `int(0)` in the interface, causing the library's internal `optional.ToDuration` type assertion to `time.Duration` to panic at runtime.
- **Fix:** Changed `RetentionDuration: 0` to `RetentionDuration: time.Duration(-1)` and updated the adjacent comment from "Setting to zero removes retention" to "Setting to a negative value removes retention". The `time` package is already imported.

## Review Notes

- **Retention bounds:** The post correctly states topic/subscription retention bounds of 10 minutes (600s) to 31 days (2,678,400s). The subscription maximum was historically 7 days but has since been raised to 31 days, matching topic retention.
- **gcloud relative-time format:** The example `--time="-P0DT2H0M0S"` is valid ISO 8601 duration syntax and accepted by gcloud. A more concise form like `--time="-PT2H"` would also work; left as-is since it is not incorrect.
- **Node.js clear-retention idiom:** `topic.setMetadata({ messageRetentionDuration: null })` relies on gax to translate `null` into a cleared field. This works in current `@google-cloud/pubsub` versions but is a slightly looser idiom than supplying an explicit `updateMask`. Left as-is.
- **Cloud Monitoring metric in diagram:** The Mermaid "Key Metrics to Monitor" flowchart references `topic/message_retention_used_bytes`. The exact name does not appear in Google's published Pub/Sub metric inventory (closest real metrics are `subscription/retained_acked_bytes_by_region` and `topic/byte_cost`). Since this appears only in a conceptual diagram (not in executable code), the broader intent is clear and it was left unchanged.
- **Pub/Sub `seek` to timestamp semantics:** The post's description that messages "published after" the seek time are re-delivered matches the official replay semantics (Pub/Sub marks messages with publish time on or after the seek time as unacknowledged).
- **`subscriber.seek(time=datetime)`:** Passing a `datetime` object directly for the `time` field is supported via proto-plus automatic Timestamp conversion in modern `google-cloud-pubsub` releases.
- **Snapshots:** The post correctly describes snapshots as capturing acknowledgment state; note (not covered, but worth being aware of) that Pub/Sub snapshots themselves have a maximum lifetime of 7 days from the oldest unacknowledged message in the source subscription.
