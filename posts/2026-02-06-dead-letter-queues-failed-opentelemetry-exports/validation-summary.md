# Validation Summary: How to Configure Dead Letter Queues for Failed OpenTelemetry Exports

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector exporter retry and sending queue behavior
- OpenTelemetry File exporter and OTLP JSON File receiver
- OpenTelemetry Kafka exporter and Kafka receiver
- OpenTelemetry AWS S3 exporter and AWS S3 receiver
- Apache Kafka topic configuration
- Amazon S3 lifecycle policies
- Prometheus alerting and PromQL

## Sources Consulted
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector File exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector OTLP JSON File receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otlpjsonfilereceiver/README.md
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector AWS S3 exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/README.md
- OpenTelemetry Collector AWS S3 receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/awss3receiver/README.md
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Apache Kafka topic-level configuration docs: https://kafka.apache.org/41/configuration/topic-configs/
- AWS S3 lifecycle configuration docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html

## Issues Found
- The post described true failed-export routing to a DLQ, but the OpenTelemetry Collector does not provide native failed-export routing. Updated the wording and diagrams to describe these as DLQ-style durable secondary-copy patterns.
- The sending queue behavior said a full persistent queue drops the oldest batches. The exporter helper docs describe enqueue failures/rejections when the queue or storage cannot accept data, so this was corrected to "rejecting new batches."
- The file replay example used the `filelog` receiver and a logs pipeline, which would ingest JSON file-exporter output as logs instead of replaying traces. Replaced it with the `otlp_json_file` receiver and a traces pipeline.
- The Kafka exporter and receiver examples used top-level `topic` and `encoding` fields. Current Kafka component docs use signal-specific fields, so the examples now use `traces.topic` / `traces.encoding` and `traces.topics` / `traces.encoding`.
- The S3 exporter example used an invalid `s3_partition` field and omitted the receiver and processors used by its service pipeline. Replaced it with `s3_partition_format` and added the missing Collector components.
- The S3 replay script referenced a non-standard `otel-replay-tool`. Replaced it with an AWS S3 receiver replay collector configuration.
- The Kafka replay example used a nonexistent standalone `rate_limiting` processor. Removed it and used batch sizing plus exporter queue consumer limits to avoid overwhelming the backend.
- OTLP exporter examples used plaintext `host:4317` endpoints without disabling client transport security. Added `tls.insecure: true` to the examples so they work with plaintext in-cluster endpoints.
- Monitoring text claimed any non-zero DLQ exporter send rate means primary export failure, but these examples write every telemetry batch to the DLQ path. Updated the monitoring notes and alert description accordingly.
- The metadata description overclaimed that the setup ensures telemetry is never permanently lost. Adjusted it to say the patterns reduce permanent telemetry loss.

## Review Notes
The architecture is valid as a secondary-copy/replay design, but it is not a true failed-only DLQ unless a future Collector component or custom connector adds explicit failed-export routing. The AWS S3 exporter and receiver are alpha components, so production users should pin Collector versions and test replay behavior before relying on them.
