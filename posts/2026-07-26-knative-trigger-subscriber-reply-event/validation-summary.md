# Validation Summary: What Happens to a Knative Trigger Subscriber’s Reply Event?

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered
- Knative Eventing
- Knative Brokers and Triggers
- MTChannelBasedBroker
- Knative Apache Kafka Broker
- Kubernetes custom resources and YAML
- CloudEvents 1.0
- CloudEvents HTTP protocol binding
- HTTP response and retry semantics
- Dead letter sinks

## Sources Consulted
- [Knative Eventing overview](https://knative.dev/docs/eventing/)
- [Knative Event Transformations and Broker reply feature](https://knative.dev/docs/eventing/transforms/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Broker concepts](https://knative.dev/docs/eventing/brokers/)
- [Knative Subscription reply destinations](https://knative.dev/docs/eventing/channels/subscriptions/)
- [Knative shared event dispatcher implementation](https://github.com/knative/eventing/blob/main/pkg/kncloudevents/event_dispatcher.go)
- [Knative MTChannelBasedBroker filter response handling](https://github.com/knative/eventing/blob/main/pkg/broker/filter/filter_handler.go)
- [Knative MTChannelBasedBroker reply TTL implementation](https://github.com/knative/eventing/blob/main/pkg/broker/ttl.go)
- [Knative Apache Kafka Broker response handling](https://github.com/knative-extensions/eventing-kafka-broker/blob/main/data-plane/dispatcher/src/main/java/dev/knative/eventing/kafka/broker/dispatcher/impl/BaseResponseHandler.java)
- [CloudEvents 1.0.2 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents 1.0.2 JSON event format](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/formats/json-format.md)
- [CloudEvents 1.0.2 HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)

## Issues Found
- The post said that any successful response with a non-CloudEvent body succeeds and is discarded. That is not portable and is false for the current MTChannelBasedBroker and Apache Kafka Broker data planes: both reject an unknown CloudEvents encoding when the response body is non-empty. The response table and encoding discussion now state that this is a delivery failure on those implementations and can cause the original event to be retried.
- The reply-forwarding explanation described an HTTP Broker reply URL as though every Broker implementation used it. The post now distinguishes the shared Go dispatcher’s HTTP reply path from the Apache Kafka Broker’s reply-to-topic implementation.
- The dead-letter behavior involving the original input event and `knativeerrordest` came specifically from the shared Knative dispatcher. The claim is now scoped to data-plane paths that use that dispatcher instead of being presented as universal across Broker implementations.
- The `RequestReply` API was described only as experimental. The post now gives its current, verifiable API lifecycle explicitly as `eventing.knative.dev/v1alpha1`.

## Review Notes
- Both Trigger manifests use the current `eventing.knative.dev/v1` API and valid exact-match `filter.attributes` syntax.
- The structured and binary HTTP examples are valid CloudEvents 1.0 encodings. The structured event contains all required attributes, and `correlationid` is a valid extension attribute name.
- Knative documents the built-in Broker reply behavior and explicitly warns about reply loops. MTChannelBasedBroker also carries an internal reply TTL, but loop prevention should remain structural because delivery mechanics and safeguards vary by Broker implementation.
- Broker ingress success status codes are implementation-dependent; the post correctly uses `202 Accepted` only as an example.
- The retry, dead-letter, deduplication, outbox, correlation, fan-out, and asynchronous request/response guidance is technically sound after the corrections above.
