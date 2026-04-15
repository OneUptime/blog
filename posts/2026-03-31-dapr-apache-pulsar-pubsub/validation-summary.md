# Validation Summary: How to Configure Dapr with Apache Pulsar Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Pulsar (messaging and streaming platform)
- Dapr (Distributed Application Runtime) pub/sub component
- Dapr JavaScript SDK (`@dapr/dapr`)
- Kubernetes / Helm
- pulsar-admin CLI

## Sources Consulted
- Dapr Pulsar pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-pulsar/
- Dapr JS SDK source and docs: https://github.com/dapr/js-sdk
- Dapr JS SDK pub/sub docs: https://docs.dapr.io/developing-applications/sdks/js/js-pubsub/
- Apache Pulsar Helm chart: https://pulsar.apache.org/docs/helm-deploy/ and https://github.com/apache/pulsar-helm-chart
- Apache Pulsar admin API (tenants): https://pulsar.apache.org/docs/admin-api-tenants/
- Apache Pulsar admin API (namespaces): https://pulsar.apache.org/docs/admin-api-namespaces/
- Apache Pulsar admin API (topics): https://pulsar.apache.org/docs/admin-api-topics/
- Apache Pulsar architecture overview: https://pulsar.apache.org/docs/concepts-architecture-overview/
- Apache Pulsar multi-tenancy: https://pulsar.apache.org/docs/concepts-multi-tenancy/
- Apache Pulsar tiered storage: https://pulsar.apache.org/docs/tiered-storage-overview/

## Issues Found

1. **Wrong metadata field name `subscriptionType`**: The Dapr Pulsar pub/sub component uses `subscribeType`, not `subscriptionType`. Changed to the correct field name. The value `"shared"` is valid and is the default.

2. **Non-existent metadata field `partitionedTopic`**: This field does not exist in the Dapr Pulsar pub/sub component. It is not documented, nor present in the component source code. Removed the field entirely.

3. **Non-existent metadata field `tlsTrustCertsFilePath`**: This field does not exist in the Dapr Pulsar pub/sub component metadata. While this is a native Pulsar client configuration option, it is not exposed through Dapr's component configuration. TLS is enabled via the `enableTLS` boolean only. Removed the field from the TLS configuration example.

## Review Notes
- The `maxConcurrentHandlers` default is `100` per the Dapr docs, while the post sets it to `10`. This is valid but worth noting — readers may want a higher value for throughput-sensitive workloads.
- The Helm chart values are all correct. The default `bookkeeper.replicaCount` in the chart is `4`, while the post uses `3` — this is a valid override, not an error.
- All pulsar-admin CLI commands use correct syntax and argument names.
- The JS SDK code examples use correct API signatures for both publishing and subscribing.
- The architectural claims about Pulsar (BookKeeper storage separation, multi-tenancy, tiered storage) are all accurate per official documentation.
