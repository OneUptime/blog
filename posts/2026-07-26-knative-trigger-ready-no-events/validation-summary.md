# Validation Summary: Trigger Is Ready but No Events Arrive: A Knative Eventing Debugging Checklist

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Knative Eventing
- Knative Brokers and Triggers
- Knative event sources
- Apache Kafka Broker
- MTChannelBasedBroker
- CloudEvents 1.0
- Kubernetes
- kubectl
- Kubernetes Services and EndpointSlices
- NetworkPolicy and service meshes
- Event delivery, retries, and dead-letter sinks
- Knative Eventing logs and metrics

## Sources Consulted
- [Knative Triggers](https://knative.dev/docs/eventing/triggers/)
- [Knative Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative event sources](https://knative.dev/docs/eventing/sources/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Eventing feature flags](https://knative.dev/docs/eventing/features/)
- [Knative cross-namespace event links](https://knative.dev/docs/eventing/features/cross-namespace-event-links/)
- [Knative Eventing troubleshooting](https://knative.dev/docs/eventing/troubleshooting/)
- [Knative Eventing metrics reference](https://knative.dev/docs/eventing/observability/metrics/eventing-metrics/)
- [Knative Eventing log collection](https://knative.dev/docs/eventing/observability/logging/collecting-logs/)
- [Knative Apache Kafka Broker documentation](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative MTChannelBasedBroker ingress implementation](https://github.com/knative/eventing/blob/main/pkg/broker/ingress/ingress_handler.go)
- [Knative channel fan-out implementation](https://github.com/knative/eventing/blob/main/pkg/channel/fanout/fanout_event_handler.go)
- [Knative MTChannelBasedBroker Trigger reconciler](https://github.com/knative/eventing/blob/main/pkg/reconciler/broker/trigger/trigger.go)
- [CloudEvents 1.0.2 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents 1.0.2 HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes kubectl run reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes EndpointSlice documentation](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes Endpoints API deprecation notice](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)

## Issues Found
- The route-recording section referred to three control-plane objects even though it captures two objects, a Broker and a Trigger, plus a description of the Trigger. Corrected the count and wording.
- The Broker selection check treated `brokerRef` as an unrestricted alternative to `spec.broker`, while every Broker lookup still forced the Trigger namespace. Clarified that `spec.broker` selects a same-namespace Broker, cross-namespace `brokerRef` is feature-gated, and Broker commands must use the referenced Broker namespace.
- The Source inspection command named three specific resource types in one request. That command fails if an optional CRD such as `KafkaSource` is not installed. Replaced it with `kubectl get sources -o yaml`, which uses the Knative `sources` resource category and expands only to installed Source kinds.
- A pod created by `kubectl run` is in the producer's namespace but does not automatically share the producer's labels or service account. Clarified that equivalent labels and identity must be assigned when NetworkPolicy or mesh authorization depends on them.
- The HTTP response guidance attributed every Broker `5xx` only to its receiver or backing implementation and categorically said that `2xx` could not be an end-to-end subscriber acknowledgement. Broker implementations differ: durable brokers can acknowledge after enqueueing, while a synchronous channel-based path can surface downstream failure or success. Corrected both statements and retained the portable rule that ingress `2xx` alone must not be assumed to prove subscriber acceptance.
- The discussion of the newer `spec.filters` field omitted its Broker implementation limitation. Added the documented caveat that these filter dialects are currently supported by the Apache Kafka Broker and MTChannelBasedBroker; other implementations should use the legacy attributes filter unless they document support.
- Receiving the probe through a catch-all Trigger was presented as proof that a filtered Trigger's problem must be filter semantics. A catch-all delivery proves ingress but does not exclude stale registration or subscriber delivery failure for the other Trigger. Corrected the conclusion and retained those additional checks.
- The Kubernetes Event command sorted on `.lastTimestamp`, while current Kubernetes guidance sorts Events by `.metadata.creationTimestamp`. Updated the sort key.
- `kubectl logs` returns only a small default tail per pod when a label selector is used. Added `--tail=-1` so the stated 30-minute log window is actually available for correlation.
- The subscriber inspection command queried the deprecated core/v1 `Endpoints` API. Removed it and retained the stable `EndpointSlice` API.
- The metrics section implied that Eventing always publishes usable metrics and that a flat ingress counter necessarily identifies an upstream fault. Knative metric export can be disabled and collection can fail, so the text now requires verifying export and collection before interpreting counters.
- The isolation sequence reused the Broker probe's CloudEvents `id` for a direct subscriber test. An idempotent subscriber can discard that duplicate and hide a successful direct path, so the direct probe now uses an equivalent event with a second unique `id`.
- The isolation sequence said that each step bypasses exactly one layer, but direct subscriber testing bypasses multiple Eventing layers and some steps do not bypass a layer at all. Reworded the conclusion to say that the sequence isolates the path layer by layer.

## Review Notes
- The Trigger and Broker fields, including `spec.broker`, feature-gated `spec.brokerRef`, `spec.filter`, `spec.filters`, `status.subscriberUri`, `status.observedGeneration`, and `status.address.url`, match the current Knative Eventing API.
- The legacy attributes filter correctly matches CloudEvents attributes and extensions exactly, is case-sensitive, and cannot inspect event `data`. The stated AND and override semantics for `spec.filters` are correct.
- The curl request is a valid binary-mode CloudEvent. Its required CloudEvents attributes are supplied through `ce-*` HTTP headers, the extension attribute is valid, and `Content-Type: application/json` describes the JSON event data.
- A successful Broker ingress response is not a portable end-to-end acknowledgement from a Trigger subscriber; delivery mechanics vary by Broker implementation.
- Trigger-level delivery configuration overrides Broker-level delivery configuration. Supported retry, backoff, timeout, and dead-letter features remain Broker-implementation and Knative-version dependent, as the post notes.
- The metrics guidance correctly avoids hard-coding metric names because the official metrics reference warns that names and behavior are evolving during the OpenTelemetry migration.
- All external documentation links in the post resolve to the intended official Knative pages.
