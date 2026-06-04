# Validation Summary: How to Set Up Dead Letter Queues for Failed Log Delivery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Fluent Bit
- Vector
- Grafana Loki
- Kafka
- Python
- Prometheus alerting rules

## Sources Consulted
- Fluent Bit rewrite_tag filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/rewrite-tag
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/loki
- Fluent Bit file output documentation: https://docs.fluentbit.io/manual/4.2/data-pipeline/outputs/file
- Fluent Bit buffering and storage documentation: https://docs.fluentbit.io/manual/4.1/administration/buffering-and-storage
- Fluent Bit backpressure documentation: https://docs.fluentbit.io/manual/administration/backpressure
- Vector Loki sink documentation: https://vector.dev/docs/reference/configuration/sinks/loki/
- Vector file sink documentation: https://vector.dev/docs/reference/configuration/sinks/file/
- Vector Kafka sink documentation: https://vector.dev/docs/reference/configuration/sinks/kafka/
- Vector route transform documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector internal metrics documentation: https://vector.dev/docs/reference/configuration/sources/vector/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/3.0/configuration/recording_rules/

## Issues Found
- Fluent Bit examples incorrectly claimed failed Loki deliveries could be routed to a file DLQ. Fluent Bit does not expose output failures as a routeable event stream, so the section now uses filesystem buffering for retry and clearly describes the file output as a mirror, not a conditional DLQ.
- The Fluent Bit rewrite_tag example generated `primary-$TAG` but matched `primary.*`, and it implied failed logs would be tagged. It now uses `dlq.$TAG` for a mirror stream and filesystem emitter buffering.
- Vector was described as having built-in DLQ routing for sink failures. The post now states that Vector has per-sink buffering and retries, but not automatic failure routing to another sink.
- Vector retry comments described exponential backoff and used `retry_jitter_mode = "full"`. Vector documents Fibonacci retry backoff and enum values `Full` / `None`, so the snippet was corrected.
- Vector adaptive concurrency fields included unsupported settings. The snippet now uses `concurrency = "adaptive"` and documented adaptive concurrency configuration.
- The file replay sidecar sent raw JSON file contents directly to Loki, which is not a valid `/loki/api/v1/push` payload. It now converts JSON log lines into Loki `streams` payloads with string timestamps.
- The Kafka Vector example used a route transform as if sink failures could be routed to Kafka. It now presents Kafka as an archive/replay topic with metadata.
- The Python DLQ consumer posted raw log entries to Loki and did not retry the same message in-process after a failure. It now builds a valid Loki push payload and retries before committing the Kafka offset.
- The CronJob example used `python:3.9`, which lacks the required `requests` and `kafka-python` packages. It now references a custom image containing the script dependencies.
- Prometheus metric names and labels used older or incorrect Vector metric conventions. The examples now use current `vector_component_*` metrics and `component_id` labels, and the multiline expression uses YAML block syntax.

## Review Notes
The corrected post distinguishes durable buffering and replay archives from true failure-only DLQs. Fluent Bit and Vector can reduce loss through buffering and retries, but a strict "only failed events go to DLQ" design generally needs an external acknowledgement/replay architecture or a downstream system that explicitly emits failed events.
