# Validation Summary: How to Implement Stream Processing with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, state management building block)
- Apache Kafka (as pub/sub broker)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr declarative subscriptions with content-based routing (CEL expressions)
- Dapr bulk subscribe API

## Sources Consulted
- Apache Kafka Pub/Sub Component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr JavaScript Client SDK: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JavaScript Server SDK: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr Bulk Publish and Subscribe: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr content-based routing: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr JS SDK GitHub examples: https://github.com/dapr/js-sdk

## Issues Found

1. **`initialOffset` value incorrect**: The Kafka component config used `initialOffset: earliest`, but Dapr's Kafka component accepts `"oldest"` or `"newest"` — not `"earliest"` or `"latest"` (which are native Kafka terms). Changed `earliest` to `oldest`.

2. **`authRequired` metadata field deprecated**: The field `authRequired` was deprecated in Dapr v1.6 and replaced by `authType`. Changed `authRequired: "false"` to `authType: "none"`. Valid `authType` values include `"none"`, `"password"`, `"mtls"`, `"oidc"`, and `"awsiam"`.

3. **Subscription apiVersion incorrect for routing rules**: The declarative subscription YAML used `apiVersion: dapr.io/v1alpha1`, but the `routes` structure with `rules` and `default` is a feature of `dapr.io/v2alpha1`. The v1alpha1 spec only supports a single `route` field. Changed to `apiVersion: dapr.io/v2alpha1`.

## Review Notes
- The `DaprClient()` and `DaprServer()` constructors are called with no arguments, which works when Dapr environment variables (e.g., `DAPR_HTTP_ENDPOINT`) are set — typical in a Dapr sidecar environment. This is acceptable for a tutorial but readers should be aware that explicit host/port configuration may be needed in some setups.
- The `client.state.get()` return value handling with `JSON.parse(current)` is correct since the JS SDK returns the raw stored value.
- The bulk subscribe callback structure with `entryId` and `status: 'SUCCESS'` return values is correct per the JS SDK API.
- The CEL expression `event.data.temperature > 30` is valid. For strict type safety, `30.0` could be used instead of `30` since temperature values are floating-point, but CEL handles this comparison correctly as-is.
