# Validation Summary: How to Configure Apache Pulsar for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar (messaging platform)
- Dapr (Distributed Application Runtime) pub/sub component
- Kubernetes (Helm deployment)
- Docker (local development)
- Java (Dapr SDK publisher example)
- Node.js / Express (subscriber example)
- Pulsar CLI (pulsar-admin topic and tenant management)

## Sources Consulted
- Dapr Pulsar pub/sub component documentation: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-pulsar/
- Dapr components-contrib source code for Pulsar component (metadata.yaml, metadata.go, pulsar.go): https://github.com/dapr/components-contrib/tree/master/pubsub/pulsar
- Apache Pulsar Helm chart repository: https://pulsar.apache.org/charts
- Apache Pulsar documentation for pulsar-admin CLI: https://pulsar.apache.org/docs/
- Dapr Java SDK publishEvent API: https://docs.dapr.io/developing-applications/sdks/java/
- Dapr subscription spec documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/

## Issues Found

### 1. Non-existent metadata field: `tlsTrustCertsFilePath`
- **What was wrong:** The advanced configuration example included a `tlsTrustCertsFilePath` metadata field. This field does not exist in the Dapr Pulsar component metadata. While the underlying Pulsar Go client has a `TLSTrustCertsFilePath` option, Dapr does not expose it as a component metadata field.
- **What was changed:** Removed the `tlsTrustCertsFilePath` entry from the advanced configuration YAML.
- **Why:** Using a non-existent field would be silently ignored and mislead readers into thinking TLS cert paths can be configured this way.

### 2. Non-existent metadata field: `partitionedTopic`
- **What was wrong:** The advanced configuration example included a `partitionedTopic` metadata field set to `"true"`. This field does not exist in the Dapr Pulsar component. Topic partitioning in Pulsar is managed at the broker level using `pulsar-admin topics create-partitioned-topic`, not through Dapr component metadata.
- **What was changed:** Removed the `partitionedTopic` entry from the advanced configuration YAML.
- **Why:** This field would be silently ignored and mislead readers into thinking they can control partitioning through Dapr config.

### 3. Incorrect use of `deliverAfter` and `deliverAt` in Subscription metadata
- **What was wrong:** The Dead Letter Configuration section included `deliverAfter: "5s"` and `deliverAt: ""` in the Subscription spec's metadata block. These are actually per-message publish-time metadata fields (set when calling `publishEvent`), not subscription-level configuration options.
- **What was changed:** Removed the `metadata` block containing `deliverAfter` and `deliverAt` from the Subscription YAML.
- **Why:** Placing these in subscription metadata is incorrect and would not have any effect. They only work when passed as metadata during message publishing.

## Review Notes
- The Helm chart repo URL `https://pulsar.apache.org/charts` is correct and the chart is actively maintained.
- The Docker image `apachepulsar/pulsar:3.1.0` is a valid release, though newer versions are available. This is acceptable for a tutorial.
- The Java publisher uses the reactive `.block()` pattern which is correct for the Dapr Java SDK.
- The Node.js subscriber correctly implements the programmatic subscription pattern via `/dapr/subscribe` GET endpoint.
- The `pulsar-admin` CLI commands for tenant creation, namespace management, retention policies, and partitioned topic creation are all syntactically correct.
- The `receiverQueueSize` default is actually 1000 (matching the blog's value), and `maxConcurrentHandlers` default is 100 (the blog uses 10, which is a valid custom value).
