# Validation Summary: How to Configure the NGINX ngx_otel_module for Distributed Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NGINX Open Source
- NGINX `ngx_otel_module`
- OpenTelemetry
- OTLP/gRPC
- OpenTelemetry Collector
- Docker

## Sources Consulted
- NGINX `ngx_otel_module` official documentation: https://nginx.org/en/docs/ngx_otel_module.html
- NGINX OpenTelemetry module GitHub repository and README: https://github.com/nginx/nginx-otel
- NGINX Open Source installation documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector receiver example documentation: https://opentelemetry.io/docs/collector/building/receiver/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The introduction said the module generates spans for each HTTP request processed by NGINX. Tracing is controlled by `otel_trace`, so I changed this to "traced HTTP requests."
- The source-build example skipped the NGINX source checkout and `auto/configure --with-compat` step needed to create the referenced `nginx/objs` directory. I added the official prerequisite and configuration commands and clarified the CMake path.
- The ratio-based sampling example used `$request_id`. While this can work as an NGINX variable, the module's official ratio-based tracing example uses `$otel_trace_id`, so I updated the sample to match the module documentation.
- The parent-based sampling example traced whenever a `traceparent` header was present, which would incorrectly trace unsampled parents. I replaced it with `$otel_parent_sampled` and `otel_trace_context propagate`, matching the module's embedded variable and official parent-based tracing example.

## Review Notes
- The Collector configuration is syntactically consistent with current Collector configuration structure. The OTLP exporter TLS settings remain backend-dependent, so users should set `tls.ca_file`, `tls.insecure`, or other TLS options according to the target backend.
- `otel_span_attr` can attach deployment or route information to spans, but stable deployment-wide attributes are often better represented as resource attributes with `otel_resource_attr` when the module version supports it.
