# Validation Summary: How to Use Exactly-Once Event Processing with Knative and Kafka on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Knative Eventing
- Knative Kafka Broker
- Apache Kafka
- Strimzi Operator for Apache Kafka
- Kubernetes
- Python / Flask / psycopg2
- Java Kafka producer client
- PostgreSQL
- Prometheus Python client

## Sources Consulted
- Knative Broker for Apache Kafka documentation: https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/
- Knative event delivery failure and retry documentation: https://knative.dev/docs/eventing/event-delivery/
- Strimzi Operator deployment and KRaft configuration documentation: https://strimzi.io/docs/operators/latest/deploying.html
- Strimzi Custom Resource API Reference: https://strimzi.io/docs/operators/latest/full/configuring
- Apache Kafka design documentation for exactly-once semantics and transactions: https://kafka.apache.org/41/design/design/
- Apache Kafka KIP-98 for idempotent producers and transactional messaging: https://cwiki.apache.org/confluence/display/KAFKA/KIP-98%2B-%2BExactly%2BOnce%2BDelivery%2Band%2BTransactional%2BMessaging
- Apache Kafka producer configuration documentation: https://kafka.apache.org/40/configuration/producer-configs/
- psycopg2 transaction and context manager documentation: https://www.psycopg.org/docs/usage
- Prometheus Python client instrumentation documentation: https://prometheus.github.io/client_python/instrumenting/

## Issues Found
- The post overstated Knative Kafka Broker delivery as exactly-once. Knative Broker retry and dead-letter settings provide at-least-once subscriber delivery, so I revised the wording to describe effectively exactly-once application effects through idempotent handlers and transactional state updates.
- The Kafka explanation implied Kafka provides exactly-once delivery through "idempotent consumers." Kafka's exactly-once primitives are idempotent producers, transactions, read-committed consumers, and transactional offset commits for Kafka-to-Kafka processing. I corrected this explanation.
- The Strimzi Kafka manifest used the older `v1beta2` API with ZooKeeper and set `enable.idempotence` as a broker config. Current Strimzi uses `v1` resources and KRaft node pools, and `enable.idempotence` is a producer setting, not a broker setting. I updated the manifests to `KafkaNodePool` plus `Kafka` with Kafka 4.2.0 metadata version 4.2 and removed the invalid broker-level idempotence setting.
- The `KafkaTopic` manifest used `kafka.strimzi.io/v1beta2`. I updated it to `kafka.strimzi.io/v1`.
- The Python handler checked and marked events in separate transactions from the business side effect, which allowed duplicate side effects after a crash between commits. I changed the example to insert the idempotency row, apply the order/payment side effect, and store the result in one database transaction.
- The Python service deployment defined database environment variables, but the code ignored them. I updated the code to read `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- The Java producer used a random `transactional.id`, which prevents transaction recovery and fencing across restarts. I changed it to accept and use a stable transactional ID.
- The Java producer committed the transaction after an asynchronous `send()` without checking the send result directly. I changed the example to wait on the returned future before committing.
- The Java sample event payload omitted `order_id`, but the Python handler requires it. I updated the sample JSON to include `order_id`.
- The Prometheus metrics example used private Counter internals to set absolute counts. I changed the example to use Gauges and public `.set()` calls, and added a query for duplicate deliveries based on the handler's `duplicate_count`.

## Review Notes
The corrected post now describes practical idempotent processing with Knative at-least-once delivery rather than promising strict end-to-end exactly-once delivery. For production, the sample Flask app should also use a proper connection pool instead of a single global database connection.
