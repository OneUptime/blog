# Validation Summary: How to Use Dapr Pub/Sub for Real-Time Data Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr pub/sub building block
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr state management
- Dapr programmatic subscriptions
- Dapr bulk subscribe
- Apache Kafka (as pub/sub broker)
- Express.js (Node.js)
- Prometheus metrics for Dapr

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr JavaScript SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Bulk Subscribe: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Apache Kafka component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md

## Issues Found

### Issue 1: Incorrect bulk subscribe configuration (Backpressure section)
- **What was wrong:** The YAML showed bulk subscribe settings (`maxBulkSubCount`, `maxBulkSubAwaitDurationMs`) placed as metadata fields inside a `pubsub.kafka` Component resource. Both the field names and the resource type were incorrect. Bulk subscribe is configured in a Subscription resource (apiVersion `dapr.io/v2alpha1`), not in the component metadata. The correct field names are `maxMessagesCount` and `maxAwaitDurationMs` under a `bulkSubscribe` block.
- **What was changed:** Replaced the Component YAML with a correct `dapr.io/v2alpha1` Subscription resource using the `bulkSubscribe` block with the correct field names. Updated the introductory text to say "configure bulk subscribe in the subscription" instead of "configure max concurrency in the component."
- **Why:** The original configuration would not work and would be silently ignored by Dapr, misleading readers.

### Issue 2: Fabricated Dapr metric names (Pipeline Monitoring section)
- **What was wrong:** The PromQL examples used `dapr_pubsub_incoming_messages_total` and `dapr_pubsub_processing_latency_ms_bucket`, which are not real Dapr metrics. Dapr pub/sub metrics use the `dapr_component_pubsub_` prefix.
- **What was changed:** Corrected to `dapr_component_pubsub_ingress_count` and `dapr_component_pubsub_ingress_latencies_bucket`, which are the actual metric names exposed by Dapr.
- **Why:** Using non-existent metric names would result in empty query results, leaving readers unable to monitor their pipelines.

## Review Notes
- The programmatic subscription via `GET /dapr/subscribe` is a valid but older pattern. Dapr also supports declarative subscriptions via Subscription CRDs and streaming subscriptions via the SDK. The programmatic approach shown is still supported and correct.
- Stage 2 (Enrichment) redefines `app.get("/dapr/subscribe")` which in a real application would override the Stage 1 handler. This is fine in context since the code snippets are meant to illustrate separate microservices, but readers combining them into a single service would need to merge the subscription arrays.
- The `client.state.get()` call returns the raw value from the state store. Depending on how the data was stored, `userProfile?.country` may need to access the value differently (e.g., if the state store returns a string that needs parsing). This is a minor practical consideration, not an error.
