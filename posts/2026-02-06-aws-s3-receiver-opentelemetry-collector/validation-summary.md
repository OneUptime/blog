# Validation Summary: How to Configure the AWS S3 Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib AWS S3 receiver
- OpenTelemetry Collector processors and exporters
- OpenTelemetry Collector encoding extensions
- Amazon S3
- Amazon SQS
- AWS IAM policies

## Sources Consulted
- OpenTelemetry Collector AWS S3 receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/awss3receiver/README.md
- OpenTelemetry Collector AWS S3 receiver config schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/awss3receiver/config.schema.yaml
- OpenTelemetry Collector AWS S3 receiver implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/awss3receiver
- OpenTelemetry Collector components registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry text encoding extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/encoding/textencodingextension/README.md
- OpenTelemetry JSON log encoding extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/encoding/jsonlogencodingextension/README.md
- AWS S3 event notification documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
- AWS S3 event notification types and destinations documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- AWS S3 bucket notification walkthrough for SQS policies: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ways-to-add-notification-config-to-bucket.html

## Issues Found
- The post described the receiver as polling S3 on `poll_interval` with `s3_pattern`, `max_files_per_poll`, `delete_on_read`, `logs.parser`, `timestamp_field`, CSV parsing, and regex parsing options. These fields are not part of the current `awss3receiver` schema. Updated the examples to use the documented `starttime`/`endtime` time-range mode and `s3downloader` block.
- The post claimed arbitrary JSON, regex text, and CSV metrics parsing were built into the receiver. The receiver supports OTLP JSON and OTLP Protocol Buffers by default, plus custom unmarshaling through encoding extensions. Replaced those examples with OTLP JSON, OTLP protobuf, and encoding-extension examples.
- The SQS example used unsupported top-level fields such as `sqs_queue_url`, `max_messages`, and `visibility_timeout`. Updated it to the documented `sqs.queue_url`, `sqs.region`, `sqs.max_number_of_messages`, and `sqs.wait_time_seconds` structure.
- The object checkpointing examples used unsupported `mark_processed` and `processed_tag` fields. Replaced them with `tag_object_after_ingestion` and `skip_ingesting_tagged_objects`, and documented the actual `otel-collector:status=ingested` tag behavior.
- The IAM section omitted permissions needed for optional tagging and SQS mode. Added `s3:GetObjectTagging`, `s3:PutObjectTagging`, `sqs:ReceiveMessage`, and `sqs:DeleteMessage` examples.
- The production filter processor example used an older nested filter shape. Updated it to current `log_conditions` OTTL syntax.
- The internal metrics examples used the removed `service.telemetry.metrics.address` style. Updated them to the current `service.telemetry.metrics.readers` Prometheus configuration.
- The Lambda deployment example implied a standard Lambda could run the Collector as shown. Replaced it with a more general scheduled container task pattern to avoid an unsupported deployment example.

## Review Notes
The AWS S3 receiver is currently alpha for traces, metrics, and logs in the OpenTelemetry Collector Contrib distribution. The corrected post now assumes telemetry objects are stored in receiver-supported encodings; ingesting arbitrary application JSON or CSV from S3 still requires an appropriate encoding extension or another preprocessing step.
