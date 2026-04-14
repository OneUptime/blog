# Validation Summary: How to Configure Dapr with KubeMQ Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- KubeMQ (Kubernetes-native message broker)
- Kubernetes
- Docker
- Node.js / Express
- gRPC

## Sources Consulted
- Dapr KubeMQ pubsub component documentation: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-kubemq/
- Dapr pubsub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Subscription CRD schema: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr components-contrib source code (pubsub/kubemq/metadata.go): https://github.com/dapr/components-contrib/blob/master/pubsub/kubemq/metadata.go
- KubeMQ Quick Start documentation: https://docs.kubemq.io/getting-started/quick-start
- KubeMQ gRPC interface documentation: https://docs.kubemq.io/configuration/cluster/set-grpc-interface

## Issues Found

1. **Incorrect KubeMQ installation URL**: The post used `kubectl apply -f https://get.kubemq.io/deploy`. The official KubeMQ docs specify a two-step process using `https://deploy.kubemq.io/init` followed by `https://deploy.kubemq.io/key/<license-key>`. Fixed to match official documentation.

2. **Wrong metadata field name `defaultStore`**: The post used `defaultStore` as the metadata field name for enabling persistent event stores. The correct field name is `store`, as confirmed by both the official Dapr documentation and the component source code (`mapstructure:"store"` in the `kubemqMetadata` struct). Fixed in both the component configuration and the store mode section.

3. **Non-existent metadata fields `storeMaxMessages` and `storeMaxRetention`**: The "Using Store Mode for Persistence" section included `storeMaxMessages` and `storeMaxRetention` as Dapr component metadata fields. These fields do not exist in the Dapr KubeMQ pubsub component (verified against source code struct definition and official docs). Removed these invalid fields.

4. **Deprecated Subscription CRD apiVersion**: The post used `dapr.io/v1alpha1` for the Subscription resource, which is deprecated. Updated to `dapr.io/v2alpha1` with the corresponding `routes.default` syntax replacing the old `route` field.

## Review Notes
- The Docker image `kubemq/kubemq-community:latest` is valid for the free community edition. The licensed version uses `kubemq/kubemq:latest`.
- Port 50000 (gRPC) and 9090 (REST) are confirmed correct for KubeMQ. The official Docker docs also expose port 8080 for the web UI, but this is optional and not needed for the Dapr integration shown.
- The Dapr publish API endpoint format `v1.0/publish/{pubsubname}/{topic}` is correct.
- The Express.js subscription handler correctly accesses `req.body.data` for the CloudEvents payload delivered by Dapr.
- The `dapr run` command syntax is correct for Dapr CLI.
