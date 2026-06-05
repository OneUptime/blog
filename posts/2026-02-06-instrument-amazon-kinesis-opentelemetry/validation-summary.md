# Validation Summary: How to Instrument Amazon Kinesis with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon Kinesis Data Streams
- AWS Lambda Kinesis event source mappings
- Amazon CloudWatch Kinesis metrics
- OpenTelemetry Python tracing and propagation
- OpenTelemetry semantic conventions
- OpenTelemetry Collector
- Boto3 Kinesis client APIs

## Sources Consulted
- AWS Kinesis Data Streams PutRecord API: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecord.html
- AWS Kinesis Data Streams PutRecords API: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- AWS Kinesis Data Streams GetRecords API: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetRecords.html
- AWS Lambda Kinesis event source documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Kinesis CloudWatch metrics documentation: https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html
- OpenTelemetry Python propagation API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry FaaS semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/faas-spans/
- OpenTelemetry Collector Contrib AWS CloudWatch receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/awscloudwatchreceiver

## Issues Found
- The OTLP gRPC exporter example used an HTTP endpoint without `insecure=True`. Updated the example to match the OpenTelemetry Python gRPC exporter documentation for a local plaintext Collector endpoint.
- The producer and consumer examples used older messaging attributes such as `messaging.operation`, `messaging.source.name`, and `messaging.kinesis.*`. Updated them to current messaging semantic convention attributes such as `messaging.operation.name`, `messaging.operation.type`, `messaging.destination.name`, `messaging.message.id`, and Kinesis-specific custom attributes under `messaging.aws_kinesis.*`.
- The Lambda example set `faas.trigger` to `datasource` for a Kinesis-triggered function. Updated it to `pubsub`, which is the OpenTelemetry well-known value for functions triggered by messages sent to a messaging system.
- The Lambda example used `cloud.resource_id` for the Kinesis stream ARN. Replaced it with `messaging.aws_kinesis.stream.arn` to avoid misusing a cloud resource attribute that is generally used for the monitored cloud resource.
- The OpenTelemetry Collector AWS CloudWatch receiver configuration used an outdated/incorrect metrics schema with `poll_interval`, `metrics.named`, `statistics`, and list-style dimensions. Updated it to the current `metrics.collection_interval`, `period`, `queries`, `stats`, and map-style `dimensions` schema.
- The metrics section described the sample as shard-level monitoring even though the configuration queries stream-level metrics by `StreamName`. Updated the wording to distinguish stream-level metrics from optional enhanced shard-level metrics.
- The batch `PutRecords` example used the old propagator import and outdated attributes. Updated it to use `opentelemetry.propagate.inject` and current messaging attributes.

## Review Notes
The Python snippets were parsed with `ast` for syntax validation, and the YAML snippet was parsed with PyYAML. The examples remain illustrative and assume surrounding application setup such as installed dependencies, AWS credentials, a valid shard iterator, and a `handle_event` function.
