# Validation Summary: How to Fan Out One CloudEvent to Multiple Knative Services Safely

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Knative Eventing Brokers and Triggers
- Knative Serving Services
- Knative Broker for Apache Kafka
- CloudEvents 1.0
- Kubernetes and `kubectl`
- HTTP
- curl

## Sources Consulted

- [Knative Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative Triggers](https://knative.dev/docs/eventing/triggers/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative delivery failure handling](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Kafka Broker](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Kafka Broker feature configuration](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/configuring-kafka-features/)
- [Knative Broker creation and InMemoryChannel production warning](https://knative.dev/docs/eventing/brokers/create-broker/)
- [Knative Event Transformations and Broker reply-loop warning](https://knative.dev/docs/eventing/transforms/)
- [Knative Parallel flows](https://knative.dev/docs/eventing/flows/parallel/)
- [Knative threat model and at-least-once Trigger delivery](https://knative.dev/docs/reference/security/threat-model/)
- [CloudEvents 1.0.2 specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md)
- [CloudEvents HTTP protocol binding 1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [curl command-line reference](https://curl.se/docs/manpage.html)
- [curl release versions](https://curl.se/docs/versions.html)
- [curl 8.12.1 vulnerability report](https://curl.se/docs/vuln-8.12.1.html)
- [curl 8.21.0 vulnerability report](https://curl.se/docs/vuln-8.21.0.html)
- [Official `curlimages/curl` image tags](https://hub.docker.com/r/curlimages/curl/tags)

## Issues Found

- The test command pinned `curlimages/curl:8.12.1`, a February 2025 release for which the curl project now lists 32 published security problems. Updated the image to `curlimages/curl:8.21.0`, the current June 2026 release, whose official curl vulnerability report lists no published security problems. The referenced image tag exists and supports all options used by the command.

## Review Notes

- The Trigger manifests use the backward-compatible `spec.filter.attributes` exact-match filter. Current Knative documentation labels this syntax as the legacy attributes filter but states that it will continue to work. The newer `spec.filters` field is still described as experimental in the Eventing API reference, so retaining the stable compatible form is appropriate.
- Trigger delivery policies are implementation-dependent as the post states. The documented retry, backoff, and dead-letter fields are supported by the Kafka Broker, while `MTChannelBasedBroker` support depends on its backing Channel.
- The manifests, CloudEvents binary-mode request, `kubectl` commands, reply-loop guidance, per-Trigger Kafka consumer-group explanation, at-least-once/idempotency guidance, and Parallel comparison were otherwise technically correct.
