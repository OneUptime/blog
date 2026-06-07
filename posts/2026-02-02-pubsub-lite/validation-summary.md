# Validation Summary: How to Use Pub/Sub Lite for Cost Optimization

## Status
not-technically-relevant

## Post Type
Tutorial / Guide (advocating migration TO Pub/Sub Lite for cost optimization)

## Technologies Covered
- Google Cloud Pub/Sub Lite (deprecated)
- Google Cloud Pub/Sub (Standard)
- Google Cloud Monitoring
- Python client libraries (`google-cloud-pubsublite`, `google-cloud-pubsub`, `google-cloud-monitoring`)
- `gcloud` CLI (`pubsub lite-topics`, `pubsub lite-subscriptions`, `pubsub lite-reservations`)

## Sources Consulted
- [Pub/Sub Lite deprecation notice — Choose Pub/Sub or Pub/Sub Lite](https://cloud.google.com/pubsub/docs/choosing-pubsub-or-lite)
- [Pub/Sub Lite Topics documentation](https://cloud.google.com/pubsub/lite/docs/topics)
- [Pub/Sub Lite Release Notes](https://cloud.google.com/pubsub/lite/docs/release-notes)
- [Pub/Sub Pricing](https://cloud.google.com/pubsub/pricing)
- [DoiT — Navigating the Deprecation of Google Cloud Pub/Sub Lite](https://www.doit.com/blog/navigating-the-deprecation-of-google-cloud-pub-sub-lite/)

## Issues Found
The post is being flagged as `not-technically-relevant` rather than `validated` because its entire premise is now demonstrably harmful advice, and the issue cannot be resolved with minor technical edits.

**Critical issue — service is being shut down:**
- Google Cloud Pub/Sub Lite is officially deprecated.
- **New customers have been unable to use Pub/Sub Lite since September 24, 2024.**
- **Pub/Sub Lite will be turned down on June 30, 2026** — only 23 days after today's validation date (2026-06-07).
- Google's official guidance is to **migrate AWAY** from Pub/Sub Lite to either standard Pub/Sub or Google Cloud Managed Service for Apache Kafka.
- The post does the exact opposite: it provides an extensive `MigrationManager` class and a four-phase migration plan to move workloads **onto** Pub/Sub Lite.

**Why a corrective edit is not sufficient:**
- The post's headline, opening paragraph, every section heading, every code example, the cost calculator, the capacity planner, the deployment advisor, and the migration manager are all built around the recommendation to adopt Pub/Sub Lite.
- The instructions for this review explicitly say not to add new sections or restructure the post — but salvaging this post would require inverting its thesis, which is a structural rewrite rather than a technical fix.
- The post is also dated 2026 and the embedded pricing comment reads `# Pricing (as of 2026):`, so it presents itself as current advice when the service has been in active deprecation for over 18 months and will be gone in three weeks.
- A reader following this guide today would invest significant engineering effort migrating to a service that will be unavailable before the migration could reasonably finish.

**Secondary technical observations (would have been flagged for editing if the post were otherwise salvageable):**
- The cost calculator's claim of "up to 90% cost reduction" is asserted in the introduction without sourcing; Google's own historical materials more conservatively cited "up to ~85%" for high-volume workloads, and current pricing comparisons would need to factor in the deprecation tax of imminent migration.
- The Pub/Sub Lite Python publisher example uses `PublisherClient` inside a `with` block but also re-uses the same client outside the context manager in `publish_with_batching_config()`; while the API itself accepts both patterns, the example mixes them in a confusing way.
- The `lite_subscriber.py` `batched_callback` references `message.message_id.partition.value`. This is the documented `Partition` wrapper accessor for `MessageMetadata`, but in the Cloud Pub/Sub shim the partition is exposed via `MessageMetadata.decode(message.message_id).partition.value` — accessing `.partition.value` directly on the raw `message_id` string would fail at runtime. A working post would need to decode the metadata first.
- The bash example pairs `--throughput-reservation=projects/...` with `--per-partition-publish-mib`/`--per-partition-subscribe-mib` in adjacent commands, but per gcloud docs these are mutually exclusive: reservation-backed topics omit the per-partition throughput flags. The post's two scripts each use one mode correctly, but the surrounding prose does not call out the exclusivity, which is a common source of `gcloud` errors.

None of these are worth fixing given the disposition above.

## Review Notes
Recommendation: remove this post from the blog. Pub/Sub Lite reaches end-of-life on 2026-06-30, so within a month this guide will document a service that no longer exists, and even before then it actively pushes readers toward a costly migration in the wrong direction. If the team wants to keep content in this topic area, the natural replacement would be a post titled along the lines of "Migrating off Pub/Sub Lite before the June 30, 2026 shutdown" covering the official migration paths to standard Pub/Sub and Managed Service for Apache Kafka.
