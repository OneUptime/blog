# Validation Summary: How to Simulate Pub/Sub Broker Failures for Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, sidecar, components, subscriptions, metrics)
- Apache Kafka (broker, consumer groups, console consumer)
- Chaos Mesh (NetworkChaos for Kubernetes network partitions)
- Toxiproxy (TCP proxy for fault injection)
- Kubernetes (kubectl, StatefulSets, pod management)
- Prometheus (PromQL metrics queries)

## Sources Consulted
- Dapr pub/sub Kafka component specification — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr subscription spec (v1alpha1) — https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr publish API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr observability metrics — https://docs.dapr.io/operations/observability/metrics/
- Chaos Mesh NetworkChaos documentation — https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh Go source types (api/v1alpha1/networkchaos_types.go)
- Toxiproxy CLI source (Shopify/toxiproxy cmd/cli/cli.go)
- Toxiproxy toxic types source (toxics/latency.go, toxics/reset_peer.go)

## Issues Found
1. **Deprecated `authRequired` field in Kafka component**: The `authRequired: "false"` metadata field in the Dapr Kafka pub/sub component spec is deprecated. Replaced with `authType: "none"`, which is the current recommended field per the Dapr Kafka component documentation.

## Review Notes
- The Chaos Mesh NetworkChaos YAML is fully correct: `chaos-mesh.org/v1alpha1` API version, `partition` action, `direction: both`, selector/target structure, and Go duration string format are all valid.
- All Toxiproxy CLI commands use correct syntax: `toxiproxy-cli create` with `--listen`/`--upstream` flags, `toxiproxy-cli toxic add` with `-t`/`-a`/`-n` flags, and both `latency` and `reset_peer` toxic types with correct attributes.
- The Dapr publish API endpoint (`/v1.0/publish/pubsub/orders`) is correct.
- The Dapr metric `dapr_component_pubsub_egress_count` with `app_id` and `success` labels is a real metric.
- The Subscription spec's `deadLetterTopic`, `bulkSubscribe`, and `route` fields are valid for `dapr.io/v1alpha1`.
- The `kubectl` commands for pod deletion and log tailing are standard and correct.
