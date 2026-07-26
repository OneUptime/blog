# Validation Summary: How to Preserve Kafka Partition Ordering in Knative Eventing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Knative Eventing
- Knative KafkaSource
- Knative Broker for Apache Kafka
- Knative Trigger and delivery configuration
- Apache Kafka partitioning and consumer groups
- CloudEvents 1.0 and the partitioning extension
- HTTP and JSON CloudEvents content modes
- curl
- Kubernetes YAML

## Sources Consulted
- [Knative Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Apache Kafka Source](https://knative.dev/docs/eventing/sources/kafka-source/)
- [Knative Trigger filtering](https://knative.dev/docs/eventing/triggers/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative Channel types and defaults](https://knative.dev/docs/eventing/channels/channel-types-defaults/)
- [Knative eventing-kafka-broker KafkaSource API and implementation](https://github.com/knative-extensions/eventing-kafka-broker)
- [CloudEvents partitioning extension v1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/extensions/partitioning.md)
- [CloudEvents HTTP protocol binding v1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [CloudEvents JSON event format v1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/formats/json-format.md)
- [Apache Kafka documentation](https://kafka.apache.org/documentation/)
- [Apache Kafka 4.2 producer configuration](https://kafka.apache.org/42/configuration/producer-configs/)
- [curl command-line documentation](https://curl.se/docs/manpage.html)

## Issues Found
- The post described KafkaSource partition ordering as unconditional. KafkaSource defaults to `spec.ordering: ordered` but also supports `unordered`; the relevant statements now identify the default ordered setting required by the described behavior.
- The Trigger manifest used the legacy `filter.attributes` syntax. It was replaced with the current `filters` list and `exact` dialect recommended by the Knative Trigger documentation.
- The direct-producer guidance only required consistent Kafka record keys. Because Kafka clients can use custom or otherwise different partitioning strategies, it now also requires compatible partitioning behavior across producers.
- The Broker-class guidance referred generically to the native Kafka class. It now explicitly identifies both supported native classes, `Kafka` and `KafkaNamespaced`.

## Review Notes
The command, JSON CloudEvent, and Trigger YAML are syntactically valid. The delivery fields `retry`, `backoffPolicy`, `backoffDelay`, and `deadLetterSink` are supported by the Kafka Broker. All documentation links in the post returned successfully during validation. KafkaSource ordered delivery and Kafka Broker ordered Trigger delivery are at-least-once paths, so the post's idempotency and duplicate-handling guidance remains important.
