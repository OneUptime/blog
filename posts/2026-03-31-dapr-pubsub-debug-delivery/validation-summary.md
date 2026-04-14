# Validation Summary: How to Debug Pub/Sub Message Delivery Issues in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar runtime, pub/sub building block)
- Kubernetes (annotations, deployments)
- Zipkin (distributed tracing)
- Dapr CLI (`dapr run`, `dapr dashboard`)
- Dapr HTTP API (publish, health, metadata, subscribe endpoints)
- Dapr declarative Subscriptions (v2alpha1)

## Sources Consulted
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI reference — `dapr dashboard`: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Zipkin tracing setup: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Subscription spec reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr dead letter topics documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/

## Issues Found
- **Dead-letter topic Subscription YAML used wrong field name for v2alpha1 API**: The original post used `route: /orders` in the declarative Subscription YAML with `apiVersion: dapr.io/v2alpha1`. The v2alpha1 Subscription spec requires `routes` (plural) with a nested `default` key, not the singular `route` field (which was the v1alpha1 syntax). Changed `route: /orders` to `routes:` with `default: /orders` nested underneath.

## Review Notes
- The Dapr Dashboard description mentions a "Components tab" and "Metadata section." While the dashboard does expose component and metadata information, the exact UI tab/section names are not precisely documented and may vary by dashboard version.
- The "broker connection timeouts causing silent drops" pitfall is plausible but not specifically documented in Dapr's official troubleshooting guides. It is a reasonable operational concern but not sourced from Dapr docs.
- All other technical claims — CLI flags, Kubernetes annotations, API endpoints, tracing configuration, subscription discovery format, and publish API format — were verified as accurate against official Dapr documentation.
