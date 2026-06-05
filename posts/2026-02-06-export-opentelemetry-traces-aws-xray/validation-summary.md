# Validation Summary: How to Export OpenTelemetry Traces to AWS X-Ray

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS X-Ray
- AWS Distro for OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry Collector AWS X-Ray exporter
- OpenTelemetry Collector AWS proxy extension
- OpenTelemetry Python SDK and AWS X-Ray propagator / ID generator
- OpenTelemetry JavaScript SDK and AWS X-Ray propagator / ID generator
- OTLP over gRPC
- grpcurl

## Sources Consulted
- AWS X-Ray `PutTraceSegments` API reference: https://docs.aws.amazon.com/xray/latest/api/API_PutTraceSegments.html
- AWS X-Ray trace ID documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sendingdata.html
- AWS X-Ray concepts and sampling documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html
- AWS X-Ray migration guide for OpenTelemetry: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html
- AWS X-Ray migration guide for OpenTelemetry Node.js: https://docs.aws.amazon.com/xray/latest/devguide/migrate-xray-to-opentelemetry-nodejs.html
- AWS X-Ray migration guide for OpenTelemetry Python: https://docs.aws.amazon.com/xray/latest/devguide/migrate-xray-to-opentelemetry-python.html
- AWS Distro for OpenTelemetry X-Ray exporter guide: https://aws-otel.github.io/docs/getting-started/x-ray/
- AWS Distro for OpenTelemetry X-Ray remote sampling guide: https://aws-otel.github.io/docs/getting-started/remote-sampling/
- OpenTelemetry Collector AWS X-Ray exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awsxrayexporter/README.md
- OpenTelemetry Collector AWS proxy extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/awsproxy/README.md
- OpenTelemetry Python AWS SDK extension documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/sdk-extension/aws/aws.html
- OpenTelemetry Python AWS X-Ray propagator documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/propagator/aws/aws.html
- OpenTelemetry JavaScript SDK package type definitions via current npm packages: `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/propagator-aws-xray`, `@opentelemetry/id-generator-aws-xray`
- Protocol Buffers JSON mapping for bytes fields: https://protobuf.dev/programming-guides/json/
- grpcurl documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The post said X-Ray uses a different trace ID format and implied applications must embed the timestamp in W3C trace IDs. Updated the explanation to match current AWS documentation: W3C trace IDs must be formatted as X-Ray trace IDs when sent to X-Ray, but the timestamp is not required or validated for W3C-originated IDs.
- The collector config used `indexed_attributes` with `aws.log.group.names` for CloudWatch Logs correlation. Changed the example to use the exporter-supported `aws_log_groups` configuration with an actual log group name.
- The "Direct SDK Export" section implied the Python/Node examples exported directly to X-Ray and mentioned a direct X-Ray exporter. Updated the section to describe SDK OTLP export to a local collector or CloudWatch Agent.
- The Node.js example used the removed `addSpanProcessor` pattern and `propagation.setGlobalTextMap`. Updated it for current OpenTelemetry JS 2.x APIs by passing `spanProcessors` to `NodeTracerProvider` and registering the propagator through `provider.register`.
- The Node.js install command omitted the direct package used for `BatchSpanProcessor`. Added `@opentelemetry/sdk-trace-base`.
- The attributes example said custom searchable attributes could use an `aws.xray.annotations.` prefix. Updated it to set `aws.xray.annotations` to a list containing the attribute key, which is the supported exporter behavior.
- The mapping table said span events map to subsegments. Corrected it to note that exception events can populate X-Ray exception data and other span events are dropped.
- The `grpcurl` OTLP example sent `traceId` and `spanId` as hex strings, but OTLP proto JSON represents `bytes` fields as base64. Updated the command to base64-encode the generated IDs.
- The remote sampling section said the exporter fetches and applies X-Ray sampling rules. Updated it to explain that the collector's `awsproxy` extension signs and proxies sampling API requests, while a supported application-side X-Ray remote sampler applies the rules.
- The conclusion overstated that the X-Ray ID generator must not be skipped. Updated it to recommend the generator when callers want new IDs to follow the traditional X-Ray timestamp convention.

## Review Notes
Validated both collector YAML snippets with `otel/opentelemetry-collector-contrib:0.98.0 validate`. Also verified the Python and Node.js setup snippets by installing current packages into temporary directories and constructing/registering the providers. X-Ray remote sampling support is SDK/distro-specific; the collector proxy configuration alone does not enable sampling unless the application tracer uses a supported X-Ray remote sampler.
