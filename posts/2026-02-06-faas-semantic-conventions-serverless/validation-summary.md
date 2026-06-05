# Validation Summary: How to Implement FaaS Semantic Conventions for Serverless Functions

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OTLP trace export
- AWS Lambda
- AWS API Gateway, SQS, DynamoDB Streams, and EventBridge triggers
- Azure Functions
- Google Cloud Functions

## Sources Consulted
- OpenTelemetry FaaS semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/
- OpenTelemetry FaaS span semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/faas-spans/
- OpenTelemetry FaaS resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/faas/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry AWS SQS semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/sqs/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- AWS Lambda environment variables documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- Azure App Service environment variables reference: https://learn.microsoft.com/azure/app-service/reference-app-settings
- Firebase / Google Cloud Functions reserved environment variables: https://firebase.google.com/docs/functions/config-env

## Issues Found
- The post described `faas.max_memory` as megabytes and set the Lambda memory value directly. OpenTelemetry defines `faas.max_memory` as bytes, and AWS provides `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` in MB, so the code now multiplies by 1,048,576 and the table says bytes.
- The post described `faas.version` as a version or alias. The semantic convention describes provider-specific versions or revisions, so the wording now says version or revision.
- The Python setup imported and used `SimpleSpanExporter`, which is not the OpenTelemetry Python SDK processor API. It now uses `SimpleSpanProcessor` with `OTLPSpanExporter`.
- The prose recommended `SimpleSpanExporter`; this was corrected to `SimpleSpanProcessor`.
- The code called `span.set_status(trace.StatusCode.ERROR, str(e))`, but the Python documentation shows importing `Status` and `StatusCode` and setting `Status(StatusCode.ERROR, ...)`. The example now follows that API.
- The text implied that all resource attributes came from AWS-provided Lambda environment variables and used `AWS_ACCOUNT_ID`, which AWS does not list as a reserved Lambda environment variable. The resource setup now omits that non-existent environment variable, and the handler derives `cloud.account.id` from `context.invoked_function_arn`.
- The DynamoDB Streams example lowercased AWS event names directly, producing `modify` and `remove`, while OpenTelemetry lists datasource operations as `insert`, `edit`, and `delete`. The code now maps `INSERT` to `insert`, `MODIFY` to `edit`, and `REMOVE` to `delete`.

## Review Notes
- The FaaS semantic conventions consulted are currently marked Development by OpenTelemetry, so names and requirement levels may evolve.
- The Python snippets were syntax-checked after editing. The sample still assumes the reader provides application-specific functions such as `process_order`.
