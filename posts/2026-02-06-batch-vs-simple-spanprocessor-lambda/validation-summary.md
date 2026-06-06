# Validation Summary: How to Choose Between BatchSpanProcessor and SimpleSpanProcessor for Lambda

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry span processors
- OTLP Python exporters
- AWS Lambda
- Python

## Sources Consulted
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python SDK trace export source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/export.html
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python exporters guide: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python AWS Lambda instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/aws_lambda.html
- AWS Lambda execution environment lifecycle documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html

## Issues Found
- The `force_flush` Lambda example could pass a negative `timeout_millis` value when `context.get_remaining_time_in_millis()` returned less than 500 ms. I changed the example to compute `flush_timeout_ms` and call `provider.force_flush()` only when the computed timeout is positive.
- The force-flush section described Lambda as handling many requests in a single invocation. I changed this to many records in a single invocation, which better matches the batch-event example and AWS Lambda's invocation model.

## Review Notes
The processor behavior described in the post matches the OpenTelemetry Trace SDK specification and the current OpenTelemetry Python SDK documentation: `SimpleSpanProcessor` exports ended spans directly through the configured exporter, while `BatchSpanProcessor` queues ended spans and exports them in batches. The AWS Lambda freeze risk and the use of `force_flush` before function exit are consistent with AWS Lambda lifecycle documentation and OpenTelemetry's Python AWS Lambda instrumentation.
