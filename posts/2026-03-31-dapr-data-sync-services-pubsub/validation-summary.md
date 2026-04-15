# Validation Summary: How to Implement Data Synchronization Between Services with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Apache Kafka (as Dapr pub/sub component)
- PostgreSQL (UPSERT / ON CONFLICT syntax)
- Dapr service invocation API

## Sources Consulted
- Dapr JavaScript Client SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JavaScript Server SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr Apache Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Component spec schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

1. **Kafka component YAML missing required `authType` metadata field.** The Dapr Kafka pub/sub component requires the `authType` metadata field. Added `authType: "none"` to the component spec YAML to match the minimum required configuration per official docs.

2. **SQL ON CONFLICT UPDATE clause missing `category_id` column.** The INSERT statement includes `category_id` as one of the columns, but the ON CONFLICT DO UPDATE SET clause did not update it. This means category changes from the publisher would be silently dropped in the replica. Added `category_id = EXCLUDED.category_id` to the UPDATE SET clause.

## Review Notes
- The `server.pubsub.subscribe` callback signature in the Dapr JS SDK is `async (data, headers) => {...}` with two parameters. The blog uses a single `event` parameter, which works in JavaScript (extra arguments are simply ignored) but readers won't learn that headers/metadata are available. This is a style choice rather than a bug, so it was left as-is.
- The initial full sync approach has a potential race condition: events published between the start of the full sync and the subscription start could be missed. The post does not mention this caveat. This is an architectural consideration rather than a code error.
- The version-based conflict resolution is sound and correctly demonstrated in both the SQL WHERE clause and the application-level check.
