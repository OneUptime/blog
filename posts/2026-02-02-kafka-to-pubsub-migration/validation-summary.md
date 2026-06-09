# Validation Summary: How to Migrate from Kafka to Pub/Sub

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Apache Kafka (kafka-python client)
- Google Cloud Pub/Sub (google-cloud-pubsub Python client)
- Terraform (Google provider — `google_pubsub_topic`, `google_pubsub_subscription`, `google_pubsub_schema`)
- Apache Beam (`ReadFromKafka`, `WriteToPubSub`)
- Google Cloud Monitoring (`monitoring_v3`)
- Python (dataclasses, enums, signal handling, futures)

## Sources Consulted
- Google Cloud Pub/Sub documentation — message ordering, ordering keys, retention, dead letter policies: https://cloud.google.com/pubsub/docs
- Pub/Sub quotas & limits (topic retention up to 31 days, subscription retention up to 31 days): https://cloud.google.com/pubsub/quotas
- google-cloud-pubsub Python client reference (`PublisherClient.publish`, `SubscriberClient.subscribe`, `PublisherOptions`, `FlowControl`, `BatchSettings`, `ThreadScheduler`): https://cloud.google.com/python/docs/reference/pubsub/latest
- Terraform `google_pubsub_subscription` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- kafka-python documentation (`KafkaProducer`, `KafkaConsumer`, `TopicPartition`, `committed`, `end_offsets`, `offsets_for_times`): https://kafka-python.readthedocs.io/
- Apache Beam Python SDK Kafka IO (`ReadFromKafka` parameters — `consumer_config`, `topics`, `start_read_time`, `timestamp_policy`): https://beam.apache.org/releases/pydoc/current/apache_beam.io.kafka.html
- Apache Beam Python SDK Pub/Sub IO (`WriteToPubSub`, `PubsubMessage`): https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html

## Issues Found
1. **`_publish_to_pubsub` keyword-argument collision (Python TypeError).** The code added `attributes['ordering_key'] = key` and then called `self.pubsub_publisher.publish(..., ordering_key=..., **attributes)`. Unpacking `**attributes` would duplicate the `ordering_key` kwarg and raise `TypeError: publish() got multiple values for keyword argument 'ordering_key'`. Renamed the traceability attribute to `kafka_key` (which is also the convention used later in the Beam pipeline).

2. **`MigrationMonitor` used plain tuples where `kafka.TopicPartition` is required.** `KafkaConsumer.end_offsets`, `committed`, and `offsets_for_times` accept `TopicPartition` namedtuples, not plain `(topic, partition)` tuples. Added `TopicPartition` to the `kafka` import and constructed `TopicPartition(topic, partition)` in both `get_kafka_consumer_lag` and `_get_kafka_message_count`.

3. **`_get_kafka_message_count` passed a float `timestamp_ms` to `offsets_for_times`.** `(time.time() - time_window_seconds) * 1000` yields a float; `offsets_for_times` expects integer milliseconds. Wrapped the expression with `int(...)`.

4. **Beam pipeline put `start_timestamp` into the Kafka `consumer_config`.** `start_timestamp` is not a valid Kafka consumer property. To filter Kafka records by timestamp in Beam, the value must be passed as the `start_read_time` parameter on the `ReadFromKafka` transform itself (milliseconds since epoch). Restructured the call to build a `read_kafka_kwargs` dict and pass `start_read_time` to `ReadFromKafka` when supplied.

## Review Notes
- The `compare_message_counts` method approximates Kafka message counts via `offsets_for_times` and end offsets. This is only an approximation since it does not account for compacted/deleted records; the post correctly says "approximate."
- `KafkaConsumer.committed(tp)` return type has varied across kafka-python versions (int in newer 2.x with `metadata=False` default, `OffsetAndMetadata` in older calls). The current `committed(tp) or 0` pattern works with kafka-python ≥ 2.0 default behavior.
- The Pub/Sub ordering-key requirement of "messages must be acknowledged in order" is slightly loose phrasing — the precise rule is that a `nack` (or processing-deadline lapse) for one ordering-key message blocks delivery of subsequent same-key messages until resolved. This is correct enough for the audience.
- `enable_idempotence=True` on `KafkaProducer` is supported by recent kafka-python (it forwards to Java-style broker semantics — `acks=all`, `retries>0` required). The configuration shown satisfies those preconditions.
- Subscription `message_retention_duration = "1209600s"` (14 days) is within the current 31-day Pub/Sub subscription maximum (it used to be 7 days; the limit was raised). Acceptable.
- `beam.window.Timestamp` resolves to `apache_beam.utils.timestamp.Timestamp` via re-export in `apache_beam.transforms.window`; `Timestamp.now()` and `.micros` are both supported in modern Beam releases.
- The Terraform `google_service_account.pubsub_invoker` is referenced but not defined in the snippet; this is a deliberate omission for brevity and not a technical error.
