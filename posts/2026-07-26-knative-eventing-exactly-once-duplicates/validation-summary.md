# Validation Summary: Does Knative Eventing Guarantee Exactly-Once Delivery? Design for Duplicates Instead

## Status
validated

## Post Type
Technical reliability guide

## Technologies Covered

- Knative Eventing Brokers, Triggers, Subscriptions, and dead letter sinks
- Knative Broker for Apache Kafka
- CloudEvents 1.0 identity and HTTP binding
- Apache Kafka consumer offsets, rebalancing, and retention
- PostgreSQL transactions, unique constraints, and `INSERT ... ON CONFLICT`
- Idempotent consumers, transactional inbox/outbox patterns, and external side effects

## Sources Consulted

- [Knative threat model](https://knative.dev/docs/reference/security/threat-model/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Kafka installation and consumer offset behavior](https://knative.dev/docs/install/eventing/kafka-install/)
- [Knative Eventing delivery design](https://github.com/knative/eventing/blob/main/docs/delivery/README.md)
- [Knative Eventing selective HTTP retry implementation](https://github.com/knative/eventing/blob/main/pkg/kncloudevents/retries.go)
- [CloudEvents 1.0.2 specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents 1.0.2 HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [Apache Kafka documentation](https://kafka.apache.org/documentation/)
- [PostgreSQL `INSERT` documentation](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL transaction documentation](https://www.postgresql.org/docs/current/tutorial-transactions.html)

## Issues Found
No technical issues found.

## Review Notes
The post accurately distinguishes Knative's at-least-once delivery contract from application-level exactly-once effects. Knative's current Kafka documentation explicitly warns that applications may receive duplicate events, including after a consumer restarts from its last committed offset. The CloudEvents identity guidance matches the 1.0.2 specification, and the PostgreSQL deduplication pattern is valid provided the stated unique constraint exists and the application continues only when the insert affects a row. The post does not pin a Knative release; it was reviewed against the current documentation available on the validation date.
