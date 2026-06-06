# Validation Summary: How to Compare OpenTelemetry vs AWS X-Ray for Distributed Tracing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- AWS X-Ray
- AWS Distro for OpenTelemetry (ADOT)
- Distributed tracing
- Python instrumentation
- AWS Lambda
- AWS SAM
- OpenTelemetry Collector sampling

## Sources Consulted
- AWS X-Ray SDK and Daemon Support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- AWS X-Ray concepts: https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html
- Sending trace data to AWS X-Ray: https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sendingdata.html
- AWS X-Ray SamplingRule API: https://docs.aws.amazon.com/xray/latest/api/API_SamplingRule.html
- AWS X-Ray sampling API guide: https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sampling.html
- AWS Lambda Python tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-tracing.html
- AWS Lambda X-Ray tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html
- ADOT Lambda Support for Python: https://aws-otel.github.io/docs/getting-started/lambda/lambda-python/
- AWS App Runner X-Ray documentation: https://docs.aws.amazon.com/apprunner/latest/dg/monitor-xray.html
- OpenTelemetry Python Botocore instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/botocore/botocore.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry tail sampling guide: https://opentelemetry.io/blog/2022/tail-sampling/
- AWS X-Ray pricing: https://aws.amazon.com/xray/pricing/

## Issues Found
- The post omitted the current X-Ray SDK and daemon maintenance status. Added that the SDKs and daemon entered maintenance mode on February 25, 2026 and that AWS recommends migrating instrumentation to OpenTelemetry.
- The OpenTelemetry Python AWS SDK instrumentation example used `opentelemetry.instrumentation.boto3.Boto3Instrumentor`, which is not the current Python contrib instrumentor. Changed it to `opentelemetry.instrumentation.botocore.BotocoreInstrumentor`.
- The OpenTelemetry propagator import path for `TraceContextTextMapPropagator` was incorrect. Updated it to `opentelemetry.trace.propagation.tracecontext`.
- The data model comparison said OpenTelemetry metadata was only attributes and that all attributes are searchable. Changed this to attributes plus events, and noted that searchability is backend-dependent.
- The trace ID explanation overstated the timestamp requirement. Updated it to reflect that X-Ray trace IDs include a timestamp component, while X-Ray can accept W3C trace IDs formatted for X-Ray when sent by compatible collectors/exporters.
- The AWS service integration section implied ECS, EKS, and App Runner can generate complete application traces with no instrumentation. Narrowed the statement to distinguish service-side tracing from application instrumentation requirements.
- The ADOT Lambda layer ARN used an outdated Python layer version. Updated the example to the current documented `aws-otel-python-amd64-ver-1-32-0:2` layer in `us-east-1`.
- The ADOT Lambda example set `OTEL_EXPORTER_OTLP_ENDPOINT` to localhost even though the documented layer defaults to exporting traces to X-Ray through its bundled collector. Removed the unnecessary endpoint line.
- The pricing section mentioned only scanned traces. Updated it to "retrieved or scanned" and noted the free tier.
- The OpenTelemetry cost comparison implied self-hosted Jaeger or Tempo had no cost. Clarified that they avoid backend per-trace fees but still incur infrastructure and storage costs.

## Review Notes
The post is technically relevant and contains implementation examples. The examples are illustrative and still depend on normal runtime prerequisites such as installed Python packages, an available collector or X-Ray daemon, and application-specific objects such as `database`.
