# Validation Summary: How to Trace AWS SQS and SNS Message Flows with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry botocore instrumentation
- OpenTelemetry boto3sqs instrumentation
- AWS SDK for Python (boto3/botocore)
- Amazon SQS
- Amazon SNS
- OpenTelemetry Collector
- Python
- YAML

## Sources Consulted
- OpenTelemetry Python Contrib: Botocore instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/botocore/botocore.html
- OpenTelemetry Python Contrib: Boto3 SQS instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/boto3sqs/boto3sqs.html
- OpenTelemetry Python Contrib source for boto3sqs message injection/extraction behavior: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/boto3sqs.html
- Boto3 SQS `receive_message` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/receive_message.html
- Boto3 SNS `publish` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/publish.html
- Amazon SNS raw message delivery documentation: https://docs.aws.amazon.com/sns/latest/dg/large-payload-raw-message.html

## Issues Found
- The post incorrectly said `opentelemetry-instrumentation-botocore` automatically handles SQS and SNS message-attribute propagation. Updated the setup to install and use `opentelemetry-instrumentation-boto3sqs` for SQS message propagation, while keeping botocore instrumentation for AWS SDK call spans.
- The SNS publish example incorrectly claimed SNS trace-context injection was automatic. Updated the example to explicitly inject OpenTelemetry context into SNS `MessageAttributes` with `propagate.inject(..., setter=Boto3SQSSetter())`.
- The SNS-to-SQS explanation omitted the raw message delivery requirement for automatic SQS-side extraction of SNS message attributes. Added the raw delivery caveat and the SNS limit of 10 message attributes for raw-delivery SQS subscriptions.
- The SQS batch send section attributed per-entry message propagation to botocore. Updated it to attribute that behavior to the SQS instrumentation.
- The custom processing span section attributed message context extraction to botocore. Updated it to describe the SQS processing span context created by the SQS instrumentation.
- The SNS envelope section said propagation works regardless of the envelope. Updated it to explain that automatic SQS extraction works when trace context is available as SQS message attributes, and that non-raw SNS envelopes require manual extraction.
- The DLQ example used `AttributeNames` to request SQS system attributes. Updated it to use the current `MessageSystemAttributeNames` parameter recommended by boto3.
- The FIFO section claimed the instrumentation captures `MessageGroupId` and `MessageDeduplicationId` as span attributes. Updated it to state that consumers can request those system attributes and add them to their own processing spans.

## Review Notes
The code examples were checked for Python syntax with `python3`; all Python snippets parse successfully. The examples still use placeholder business functions such as `validate_payment_details`, `charge_customer`, and `handle_failed_message`, which is appropriate for a tutorial but means the snippets are not standalone runnable programs.
