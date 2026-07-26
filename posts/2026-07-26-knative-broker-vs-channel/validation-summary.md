# Validation Summary: Knative Eventing Broker vs Channel: Which Production Routing Model Should You Choose?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Knative Eventing
- Kubernetes
- Knative Broker and Trigger APIs
- Knative Channel and Subscription APIs
- CloudEvents
- MTChannelBasedBroker
- InMemoryChannel
- Kafka Broker, RabbitMQ Broker, and KafkaChannel
- `kubectl`

## Sources Consulted
- Knative Brokers — https://knative.dev/docs/eventing/brokers/
- Knative Creating a Broker — https://knative.dev/docs/eventing/brokers/create-broker/
- Knative Available Broker Types — https://knative.dev/docs/eventing/brokers/broker-types/
- Knative Channel-Based Broker — https://knative.dev/docs/eventing/brokers/broker-types/channel-based-broker/
- Knative Broker for Apache Kafka — https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/
- Knative Channels — https://knative.dev/docs/eventing/channels/
- Knative Channel Types and Defaults — https://knative.dev/docs/eventing/channels/channel-types-defaults/
- Knative Creating a Channel Using Cluster or Namespace Defaults — https://knative.dev/docs/eventing/channels/create-default-channel/
- Knative Subscriptions — https://knative.dev/docs/eventing/channels/subscriptions/
- Knative Triggers — https://knative.dev/docs/eventing/triggers/
- Knative Handling Delivery Failure — https://knative.dev/docs/eventing/event-delivery/
- Knative `DeliverySpec.timeout` Feature — https://knative.dev/docs/eventing/features/delivery-timeout/
- Knative Eventing API Reference — https://knative.dev/docs/eventing/reference/eventing-api/
- Knative Event Transformations (Broker reply behavior) — https://knative.dev/docs/eventing/transforms/
- Kubernetes JSONPath Support — https://kubernetes.io/docs/reference/kubectl/jsonpath/
- CloudEvents Specification 1.0 — https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md

## Issues Found
1. **Broker reply routing was described too vaguely and implied configurable destinations:** A Trigger has no `reply` destination field equivalent to a Subscription's `spec.reply`. A valid CloudEvent returned by a Trigger subscriber uses the Broker's built-in reply behavior and is republished to the same Broker. Updated the comparison table to state this behavior explicitly.

## Review Notes
- The stable `eventing.knative.dev/v1` Broker and Trigger APIs and `messaging.knative.dev/v1` generic Channel and Subscription APIs used in the examples are current.
- The legacy `spec.filter.attributes` form remains supported. The newer `spec.filters` field is still experimental in the Eventing API reference and currently has implementation-specific support, as the post correctly warns.
- KafkaChannel remains a `messaging.knative.dev/v1beta1` implementation-specific resource in the current documentation; the post appropriately tells readers to verify its exact API version and configuration instead of hard-coding them.
- The Eventing API reference marks `DeliverySpec.timeout` experimental; its feature page lists the `delivery-timeout` feature as Beta and enabled by default. The post does not show the field in configuration, but production users should still confirm implementation and version support before treating delivery timeouts as portable.
- The generic Channel and default Broker examples depend on administrator-selected defaults. Their YAML is valid, but their production suitability cannot be determined from the manifests alone, which the post correctly emphasizes.
