# Validation Summary: How to Design Event-Driven Architecture with Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub building block, declarative subscriptions, component scoping)
- Apache Kafka (as Dapr pub/sub broker)
- JavaScript / Node.js (@dapr/dapr SDK)
- Python (dataclasses, event envelope pattern)
- CloudEvents specification
- Kubernetes-style YAML (Dapr CRDs)

## Sources Consulted
- Dapr Component Schema Reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Scoping: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Subscription Schema Reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Message Routing: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr JavaScript SDK Client: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Raw Payload Publishing: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-raw/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow

## Issues Found

1. **Component YAML `scopes` placement (line ~57):** `scopes` was incorrectly nested under `spec`. In Dapr Component definitions, `scopes` is a top-level field (sibling to `metadata` and `spec`), not a child of `spec`. Fixed by moving `scopes` to the root level of the YAML document.

2. **Subscription apiVersion for routing rules (line ~69):** The notification subscription used `apiVersion: dapr.io/v1alpha1` with the `routes` field (containing `rules` and `default`). Routing rules require `apiVersion: dapr.io/v2alpha1`. The `v1alpha1` Subscription CRD only supports the simple `route` (singular) field. Fixed by changing `apiVersion` to `dapr.io/v2alpha1`.

3. **CloudEvents double-wrapping in JavaScript publish (line ~111):** The code manually constructs a CloudEvents envelope (with `specversion`, `type`, `source`, `id`, `time` fields) but published with `rawPayload: 'false'`. With `rawPayload` set to false (the default), Dapr unconditionally wraps the entire payload in a new CloudEvents envelope, causing double-wrapping. Since the code intentionally constructs its own CloudEvents payload, `rawPayload` should be `'true'` so Dapr passes it through without re-wrapping. Fixed by changing `rawPayload` from `'false'` to `'true'`.

4. **Python `datetime.utcnow()` deprecation (line ~178):** `datetime.utcnow()` was deprecated in Python 3.12 (October 2023) because it returns a naive datetime with no timezone info. Fixed by importing `timezone` from `datetime` and replacing `datetime.utcnow()` with `datetime.now(timezone.utc)`, which returns a timezone-aware UTC datetime.

## Review Notes
- The fan-out pattern subscriptions correctly use `v1alpha1` with `route` (singular), which is the appropriate apiVersion for simple single-route subscriptions.
- The event taxonomy table correctly distinguishes domain events, integration events, and command events, though "Command Event" is sometimes considered an anti-pattern in strict EDA circles (commands are typically sent point-to-point, not published). The post's categorization is reasonable for a practical guide.
- The Kafka component configuration uses `$(APP_ID)` for consumer group templating, which is a valid Dapr feature for per-app consumer groups.
