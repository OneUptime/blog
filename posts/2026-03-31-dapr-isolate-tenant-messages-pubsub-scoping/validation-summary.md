# Validation Summary: How to Isolate Tenant Messages with Dapr Pub/Sub Scoping

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub components, subscriptions, component scoping)
- Redis (as pub/sub broker)
- Apache Kafka (as pub/sub broker)
- Dapr JavaScript SDK
- Kubernetes (namespaces, YAML manifests)
- CloudEvents (CEL expressions for routing)

## Sources Consulted
- Dapr Pub/Sub Subscription spec documentation (docs.dapr.io/reference/api/pubsub_api/)
- Dapr Component Scoping documentation (docs.dapr.io/operations/components/component-scopes/)
- Dapr Pub/Sub routing rules / content-based routing (docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/)
- Dapr Redis Pub/Sub component spec (docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/)
- Dapr Kafka Pub/Sub component spec (docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/)
- Dapr JavaScript SDK documentation (docs.dapr.io/developing-applications/sdks/js/)

## Issues Found

### Issue 1: Non-existent `filter` field in Subscription spec (Option 4)
**What was wrong:** The Subscription YAML used a `filter` field (`spec.filter`) which does not exist in any version of the Dapr Subscription spec (`v1alpha1` or `v2alpha1`). The YAML also used `apiVersion: dapr.io/v1alpha1` which does not support routing rules at all, and included an unrelated `bulkSubscribe` field.

**What was changed:** Replaced with the correct `v2alpha1` Subscription spec using `routes.rules[].match` with a CEL expression for content-based routing. Removed the unrelated `bulkSubscribe` field. Added a `default` route for non-matching messages. Updated the description text from "content-based filters" to "routing rules" to accurately reflect the Dapr mechanism.

**Why:** The `filter` field would be silently ignored by Dapr, meaning no actual tenant filtering would occur. This is a security-critical error in a post about tenant isolation.

### Issue 2: Missing required `authType` metadata in Kafka component (Option 3)
**What was wrong:** The Kafka pub/sub component YAML omitted the required `authType` metadata field.

**What was changed:** Added `authType: "none"` to the Kafka component metadata.

**Why:** `authType` is a required field for the `pubsub.kafka` component. Without it, the component would fail to initialize.

### Issue 3: Summary text inconsistency
**What was wrong:** The Summary section referenced "subscription filters" which no longer matched the corrected Option 4.

**What was changed:** Updated to "routing rules" for consistency with the corrected content.

## Review Notes
- Option 1 (Component Scoping): The `scopes` field is correctly placed at the root level of the Component resource, consistent with the official Dapr docs.
- Option 2 (Topic Prefixing): The JavaScript SDK usage (`daprClient.pubsub.publish()`) is correct for the current Dapr JS SDK.
- Option 3 (Separate Brokers): Kafka metadata field names (`brokers`, `consumerGroup`) are correct. The example uses namespace-scoped components which is a valid Kubernetes/Dapr pattern.
- The Dapr HTTP publish API endpoint (`/v1.0/publish/<pubsubname>/<topic>`) used in the validation section is correct.
- It's worth noting that Dapr's routing rules (Option 4) route messages to different handler paths within the same application -- they don't prevent message delivery at the broker level. For true isolation, Options 1-3 are stronger. The post's ordering from weakest to strongest isolation is appropriate.
