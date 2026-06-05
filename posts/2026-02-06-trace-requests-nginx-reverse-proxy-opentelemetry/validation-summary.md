# Validation Summary: How to Trace Requests Through NGINX Reverse Proxy with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- NGINX OpenTelemetry dynamic module
- NGINX reverse proxy configuration
- OpenTelemetry Protocol (OTLP/gRPC)
- W3C Trace Context
- OpenTelemetry Collector
- Docker and Docker Compose

## Sources Consulted
- NGINX `ngx_otel_module` official reference: https://nginx.org/en/docs/ngx_otel_module.html
- NGINX OpenTelemetry dynamic module documentation: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/opentelemetry/
- NGINX Open Source package documentation, including `nginx-module-otel`: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Docker Compose file reference for the obsolete top-level `version` field: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post mixed two different NGINX OpenTelemetry modules: the text and Dockerfile referred to `otel_ngx_module` from `opentelemetry-cpp-contrib`, while the NGINX configuration used native `ngx_otel_module` directives. I aligned the post to the native NGINX module and changed the module name, package installation, and `load_module` path accordingly.
- The Dockerfile attempted to build the contrib module with an unsupported/incomplete build flow. I replaced it with installation of the official `nginx-module-otel` package in the NGINX image.
- The TOML module configuration example was not valid for the native NGINX OpenTelemetry module. I replaced it with the official `otel_exporter` directive shape and native batching settings.
- The NGINX config included `otel_capture_headers on`, which is not a directive in `ngx_otel_module`. I removed it and noted that common HTTP span attributes are added automatically.
- The Docker Compose example mounted an unused `otel-nginx.toml` file and used the obsolete top-level `version` field. I removed both.
- The Collector image was pinned to an old 0.96.0 release while the post presents a current setup. I updated the example to 0.146.0 to match current filter processor documentation.
- The Collector filter processor example used the older `traces.span` style. I updated it to the current `trace_conditions` form with `span.attributes[...]`.
- The backend environment used `OTEL_EXPORTER_OTLP_ENDPOINT` with port 4317 but did not specify the OTLP protocol. I added `OTEL_EXPORTER_OTLP_PROTOCOL: grpc`.
- The Collector example exposed a Prometheus metrics port without configuring a Prometheus exporter or matching metrics endpoint. I removed that port mapping.
- The OTLP exporter example used an HTTPS URL directly for the Collector exporter endpoint. I changed it to `host:port` plus explicit TLS configuration.
- The performance section claimed sub-millisecond overhead and referenced SDK-style sampler configuration that does not apply to the native NGINX module. I replaced that with the NGINX-documented overhead guidance and `split_clients`-based sampling.
- The TLS section implied one NGINX span reflects both client TLS and upstream HTTP connections. I clarified that the NGINX span reflects the client-facing connection and backend spans reflect the upstream service's view.
- The conclusion said the setup requires a custom NGINX build. I corrected this to loading the NGINX OpenTelemetry dynamic module.

## Review Notes
- The NGINX module's default span attributes still use older OpenTelemetry semantic convention attribute names such as `http.method` and `http.target`, matching the current NGINX module documentation.
- The example uses a placeholder backend image and placeholder tracing backend endpoint, so those values must be replaced in a real deployment.
