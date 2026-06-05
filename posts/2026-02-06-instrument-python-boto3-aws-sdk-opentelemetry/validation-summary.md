# Validation Summary: How to Instrument Python boto3 AWS SDK Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- boto3
- botocore
- OpenTelemetry Python API and SDK
- OpenTelemetry botocore instrumentation
- AWS S3
- Amazon DynamoDB
- AWS Lambda
- Amazon SQS
- OTLP trace export

## Sources Consulted
- OpenTelemetry Python botocore instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/botocore.html
- OpenTelemetry AWS SDK semantic conventions: https://opentelemetry.io/docs/specs/semconv/cloud-providers/aws-sdk/
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace/sampling.html
- boto3 DynamoDB guide: https://docs.aws.amazon.com/boto3/latest/guide/dynamodb.html
- boto3 DynamoDB Table.query reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/query.html
- OpenTelemetry botocore instrumentation source for service extensions: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-botocore/src/opentelemetry/instrumentation/botocore/extensions

## Issues Found
- The post overstated that boto3 instrumentation automatically captures sanitized request parameters and detailed metrics for every AWS call. Updated the language to match the botocore instrumentation behavior: spans include service, operation, region/peer details, response metadata, and timing, with service-specific enrichment only for supported services.
- The S3 section claimed automatic capture of bucket names, object keys, and storage class. Current Python botocore instrumentation does not provide an S3-specific extension, so the post now explains that S3-specific attributes should be added manually or through hooks.
- The DynamoDB `query` example used a raw string for `KeyConditionExpression`. Updated it to import `boto3.dynamodb.conditions.Key` and use `Key('status').eq(status)`, matching boto3's documented resource API.
- The DynamoDB, Lambda, and SQS comments overstated which attributes are automatically captured. Adjusted them to describe the documented and source-supported enrichment more precisely.
- The sensitive-data hook example mutated request parameters, which can alter the AWS call rather than just redact telemetry. Replaced it with an example that only adds safe custom span attributes.
- The performance section included unverified microsecond overhead numbers and a claim of no AWS API latency impact. Replaced those with a measurement-oriented statement and kept the sampling guidance.
- The multiple-service example accessed the current span context via `.context.trace_id`. Updated it to use the documented `.get_span_context().trace_id` API.

## Review Notes
The post is technically relevant and the main setup flow is valid. The package names, OTLP exporter usage, tracer provider setup, manual span status calls, and `ParentBasedTraceIdRatio` sampler usage are consistent with current OpenTelemetry Python documentation. Some snippets assume imports and clients from earlier snippets remain in scope, which is acceptable for a tutorial but would need consolidation for a standalone runnable script.
