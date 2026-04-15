# Validation Summary: How to Create a Dapr Adoption Plan for Your Organization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (annotations, kubectl)
- Redis (as Dapr state store)
- Apache Kafka (as Dapr pub/sub)
- jq (JSON processing)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr state store component specs (state.redis): https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr pub/sub component specs (pubsub.kafka): https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr building blocks overview: https://docs.dapr.io/concepts/building-blocks-concept/
- Dapr resiliency policies: https://docs.dapr.io/operations/resiliency/
- Dapr secrets API: https://docs.dapr.io/developing-applications/building-blocks/secrets/

## Issues Found
1. **Missing `dapr.io/enabled` annotation in required annotations list**: The YAML standards template listed `dapr.io/app-id`, `dapr.io/config`, and `dapr.io/log-level` as required annotations but omitted `dapr.io/enabled`. This is the most fundamental Dapr Kubernetes annotation — it must be set to `"true"` for the Dapr sidecar injector to inject the sidecar into a pod. Without it, all other Dapr annotations are ignored. Added `dapr.io/enabled` as the first entry in the required annotations list.

## Review Notes
- The kubectl/jq command to count Dapr-enabled pods is technically correct but counts individual pods, not unique Dapr app IDs. For organizations with replicated deployments, this will overcount "services." A more precise count of unique services could use `unique_by` on the app-id annotation value, but the current command is adequate for tracking general adoption progress.
- The Dapr runtime version referenced (1.14.0) is valid. Organizations should check for the latest stable release at adoption time.
- The component type names `state.redis` and `pubsub.kafka` are correct Dapr component type identifiers.
- The relative link to the proof of concept guide (`../2026-03-31-dapr-start-proof-of-concept/`) resolves to an existing post in this blog.
