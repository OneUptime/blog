# Validation Summary: How to Trace AWS Step Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Step Functions
- AWS Lambda
- AWS Distro for OpenTelemetry (ADOT) Lambda layers
- OpenTelemetry Python SDK
- OpenTelemetry context propagation
- OpenTelemetry Protocol (OTLP)
- AWS CLI
- Amazon States Language (ASL)

## Sources Consulted
- AWS Lambda: Instrumenting Python code in AWS Lambda: https://docs.aws.amazon.com/lambda/latest/dg/python-tracing.html
- AWS Distro for OpenTelemetry Lambda documentation: https://aws-otel.github.io/docs/getting-started/lambda/
- AWS Distro for OpenTelemetry Lambda support for Python: https://aws-otel.github.io/docs/getting-started/lambda/lambda-python/
- AWS Step Functions ResultPath documentation: https://docs.aws.amazon.com/step-functions/latest/dg/input-output-resultpath.html
- AWS Step Functions Context object documentation: https://docs.aws.amazon.com/step-functions/latest/dg/input-output-contextobject.html
- AWS Step Functions Parallel state documentation: https://docs.aws.amazon.com/step-functions/latest/dg/state-parallel.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python trace SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html

## Issues Found
- The Lambda layer command used an old collector-layer ARN and `/opt/otel-handler`, which does not match the Python examples in the post. Updated the command to use the current AWS-managed ADOT Python layer ARN for `us-east-1`, changed the wrapper to `/opt/otel-instrument`, and replaced the collector config variable with `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`.
- The post described extracted-context spans as "linked spans." In OpenTelemetry Python, passing `context=parent_context` to `start_as_current_span` creates a child span in the same trace, not a span link. Updated the text and code comment.
- The decorator example returned `isValid` as `order["total"] > 0 and order["items"]`, which can evaluate to a list instead of a boolean. Updated it to `order["total"] > 0 and bool(order["items"])` so it matches the ASL `BooleanEquals` choice.
- The parallel-state trace diagram could imply that Step Functions automatically emits an OpenTelemetry span for the `Parallel` state. Clarified that this is a conceptual workflow node and that Step Functions does not emit that span automatically.

## Review Notes
- The ASL examples use direct Lambda ARNs, where the Lambda function output becomes the task result. If the optimized Step Functions Lambda integration (`arn:aws:states:::lambda:invoke`) is used instead, the output shape includes a `Payload` field and the state machine paths would need adjustment.
- Workflow metadata such as execution ARN and state machine ARN is not automatically included in Lambda event payloads unless the state machine passes it explicitly, for example from the Step Functions Context object.
