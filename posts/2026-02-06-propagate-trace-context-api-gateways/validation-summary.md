# Validation Summary: How to Propagate Trace Context Through API Gateways

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry context propagation
- W3C Trace Context
- Nginx reverse proxy and ngx_otel_module
- Kong Gateway OpenTelemetry and Request Transformer plugins
- AWS API Gateway HTTP APIs, REST APIs, Lambda proxy integrations, and AWS X-Ray propagation
- Envoy Proxy OpenTelemetry tracing
- Python OpenTelemetry propagators and WSGI middleware
- Bash and curl

## Sources Consulted
- NGINX ngx_otel_module documentation: https://nginx.org/en/docs/ngx_otel_module.html
- Kong OpenTelemetry plugin documentation: https://developer.konghq.com/plugins/opentelemetry/
- Kong OpenTelemetry plugin configuration reference: https://developer.konghq.com/plugins/opentelemetry/reference/
- Kong Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/
- Amazon API Gateway HTTP API Lambda proxy integration documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS X-Ray migration to OpenTelemetry Python documentation: https://docs.aws.amazon.com/xray/latest/devguide/migrate-xray-to-opentelemetry-python.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- Envoy tracing architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Envoy OpenTelemetry tracer API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html

## Issues Found
- The Nginx OpenTelemetry example used non-native directive names such as `opentelemetry_config`, `opentelemetry on`, `opentelemetry_service_name`, and `opentelemetry_attribute`. Updated it to the native `ngx_otel_module` directives: `otel_exporter`, `otel_trace`, `otel_trace_context`, `otel_service_name`, and `otel_span_attr`.
- The Kong OpenTelemetry example used deprecated `endpoint` and `header_type` settings. Updated it to `traces_endpoint` and `propagation` with W3C extract/inject configuration.
- The Kong header-forwarding example used Request Transformer templating that is not supported by the basic Request Transformer plugin. Replaced it with guidance that Kong proxies request headers by default and showed a transformer configuration that avoids removing trace context headers.
- The AWS API Gateway REST API statement was too broad. Clarified that explicit integration request header mapping is needed for REST API non-proxy integrations.
- The AWS HTTP API wording was too broad. Clarified that HTTP API Lambda proxy payloads include request headers and that payload format 2.0 lowercases header names.
- The Python OpenTelemetry import path for `TraceContextTextMapPropagator` was incorrect. Updated it to `opentelemetry.trace.propagation.tracecontext`.
- The Envoy section overstated simultaneous propagation support across formats for the OpenTelemetry tracer. Clarified that the OpenTelemetry tracer uses W3C Trace Context and that other Envoy tracers, such as Zipkin, cover formats such as B3.
- The WSGI middleware example created a span but did not inject the generated context into the downstream WSGI environment. Updated it to call `inject()` and write injected headers into `environ`.

## Review Notes
The Python snippets were syntax-checked with `python3` AST parsing. Full runtime validation was not performed because the gateway products and OpenTelemetry Python packages are not installed in this workspace.
