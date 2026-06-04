# Validation Summary: How to Use Event Filtering and Transformation with Knative Eventing Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Knative Eventing
- Kubernetes custom resources
- Apache Kafka Broker for Knative
- CloudEvents
- JavaScript / Express
- Python / Flask
- Prometheus
- kubectl

## Sources Consulted
- Knative documentation: Using Triggers - https://knative.dev/docs/eventing/triggers/
- Knative Eventing API reference - https://knative.dev/v1.20-docs/eventing/reference/eventing-api/
- Knative documentation: Broker for Apache Kafka - https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/
- Knative documentation: Handling delivery failure - https://knative.dev/docs/eventing/event-delivery/
- Knative Eventing metrics reference - https://knative.dev/docs/eventing/observability/metrics/eventing-metrics/
- Knative documentation: About Brokers - https://knative.dev/docs/eventing/brokers/
- Knative documentation: Subscriptions - https://knative.dev/docs/eventing/channels/subscriptions/

## Issues Found
- The development broker was described as an in-memory broker, but the shown Broker manifest uses whatever default broker class is configured in the cluster. Changed the wording to "default broker for development."
- Several Trigger examples used a top-level `reply` field. The current `eventing.knative.dev/v1` Trigger spec supports `broker`, `brokerRef`, `filter`, `filters`, `subscriber`, and `delivery`, but not `reply`. Removed those invalid fields and changed the examples to use the Broker reply path plus follow-up triggers.
- The transformation example returned a JSON body without declaring CloudEvents structured content mode, and it assumed incoming events were always structured. Updated the JavaScript example to reconstruct CloudEvents from binary-mode headers when needed and to return `application/cloudevents+json`.
- The transformed order event kept the original event type, which could cause the same trigger to match it again. Updated the transformed event type to `com.company.order.enriched` and added a second trigger for processing enriched orders.
- The prefix filtering example used the legacy `filter.attributes` syntax, which performs exact matching rather than prefix matching. Updated it to the supported `filters: - prefix:` syntax.
- The DLQ handler used an undocumented `Ce-Knativedeliveryattempts` header. Updated it to read the documented Knative dead-letter extension attributes `knativeerrordest`, `knativeerrorcode`, and `knativeerrordata` when the delivery implementation adds them.
- The Prometheus broker query used `namespace` as a label, but Knative Eventing metrics document `namespace_name`. Updated the query and adjusted the failed-delivery query to use `response_code_class`.

## Review Notes
The post now uses technically valid Knative Eventing Trigger API examples. The newer `filters` field is documented but still described by the API reference as experimental, and Knative notes that these filter dialects are currently supported by Apache Kafka Broker and MTChannelBasedBroker; other broker implementations may still require the legacy exact-match `filter.attributes` form.
