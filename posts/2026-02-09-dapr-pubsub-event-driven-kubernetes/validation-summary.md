# Validation Summary: How to Build Event-Driven Microservices with Dapr Pub/Sub on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr pub/sub
- Kubernetes
- Helm
- Redis Streams pub/sub component
- Apache Kafka pub/sub component
- CloudEvents
- Prometheus
- Node.js and Express
- Python and Flask
- Go HTTP services

## Sources Consulted
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr CloudEvents pub/sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr publish/subscribe how-to: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr subscription schema: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr pub/sub routing documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr bulk pub/sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Kubernetes deployment documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr CLI init reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr pub/sub component setup documentation: https://docs.dapr.io/operations/components/setup-pubsub/
- Dapr Apache Kafka pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Redis pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr runtime metric definitions: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go

## Issues Found
- The Node.js publisher sent the business event type inside the JSON payload while subscribers and routing rules read `event.type`, which is the CloudEvent type. Updated the Dapr publish URL to set `metadata.cloudevent.type` and publish the business object as the CloudEvent data.
- The Python publisher had the same CloudEvent type issue. Updated it to send `metadata.cloudevent.type` as Dapr publish metadata and publish the business object directly.
- The programmatic `/dapr/subscribe` example used the older single `route` shape. Updated it to the current `routes.default` structure used by Dapr programmatic subscriptions.
- The declarative routing example matched `order.paid`, but the post publishes order status changes as `order.status.changed`. Updated the route and path so the example matches an event emitted elsewhere in the tutorial.
- The Go bulk subscriber imported `fmt` without using it, which would prevent the example from compiling. Removed the unused import.
- The dashboard command assumed a `dapr-dashboard` Kubernetes service was installed. Updated it to the documented `dapr dashboard -k` command.
- The Prometheus failed-delivery query used `dapr_component_pubsub_ingress_error_count`, which is not a current Dapr runtime metric. Updated it to filter `dapr_component_pubsub_ingress_count` by `process_status!="success"`.
- The latency query used HTTP server latency instead of pub/sub ingress latency. Updated it to use `dapr_component_pubsub_ingress_latencies_bucket`.

## Review Notes
The examples remain intentionally illustrative and still assume supporting infrastructure such as Redis or Kafka topics, Kubernetes secrets, container images, and application databases are supplied by the reader.
