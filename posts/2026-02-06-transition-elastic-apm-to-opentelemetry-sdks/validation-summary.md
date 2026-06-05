# Validation Summary: How to Transition from Elastic APM Agents to OpenTelemetry SDKs

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Elastic APM Server
- Elasticsearch
- Kibana APM UI
- OpenTelemetry SDKs and auto-instrumentation
- OpenTelemetry Collector
- OTLP/gRPC and OTLP/HTTP
- Java OpenTelemetry agent
- Python OpenTelemetry SDK and Flask instrumentation

## Sources Consulted
- Elastic OpenTelemetry intake API: https://www.elastic.co/docs/solutions/observability/apm/opentelemetry-intake-api
- Elastic APM Server 7.12 release notes: https://www.elastic.co/guide/en/apm/server/7.15/release-notes-7.12.html
- Elastic APM Server 7.13 release notes: https://www.elastic.co/guide/en/apm/server/7.13/release-notes-7.13.html
- Elastic OpenTelemetry integration guide: https://www.elastic.co/guide/en/apm/get-started/7.14/open-telemetry-elastic.html
- Elastic attributes and labels mapping for OpenTelemetry: https://www.elastic.co/docs/solutions/observability/apm/opentelemetry/attributes
- Elastic APM Server information API: https://www.elastic.co/guide/en/apm/guide/current/api-info.html
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry user semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/user/

## Issues Found
- The introduction said the guide covered Node.js, but the post only includes Java and Python migration examples. Updated the sentence to match the actual content.
- The post stated that OTLP support was added in Elastic APM Server 7.13. Elastic's 7.12 release notes show OTLP/gRPC support on the standard 8200 endpoint was added in 7.12, while 7.13 added further OpenTelemetry support. Updated the version wording.
- The `grpcurl -plaintext your-apm-server:8200 list` check implied a successful OTLP connection returns an empty response. `grpcurl list` depends on gRPC server reflection, which is not expected for most APM Server deployments. Replaced it with documented OTLP/gRPC and OTLP/HTTP endpoint details and a caveat.
- The standalone authentication guidance only mentioned anonymous intake or API keys. Elastic also documents secret-token authorization through the OTLP `Authorization` header. Updated the guidance to mention secret tokens and to avoid recommending anonymous intake by default.
- The Python custom span example used `trace.getTracer`, which is not the OpenTelemetry Python API. Changed it to `trace.get_tracer`.
- The Python custom span comment referred to `startActiveSpan`, which is not the Python API name. Updated it to `start_as_current_span`.
- The user context example used `enduser.email`, which is not the current OpenTelemetry user semantic convention. Updated the example and dashboard mapping to use `user.id` and `user.email`.

## Review Notes
The post remains a practical migration guide. Future improvements could add a Node.js section or remove Node.js from the title/tags if the scope stays Java and Python only. Elastic's current docs recommend EDOT Collector Gateway or Managed OTLP for new deployments instead of sending directly to APM Server, but direct APM Server OTLP intake remains documented and is valid for the migration scenario described.
