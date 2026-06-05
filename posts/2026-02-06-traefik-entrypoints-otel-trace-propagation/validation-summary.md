# Validation Summary: How to Configure Traefik EntryPoints and Middleware for OpenTelemetry Trace

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Traefik Proxy
- OpenTelemetry tracing
- OTLP over HTTP and gRPC
- W3C Trace Context propagation
- Traefik HTTP middleware
- Docker Compose
- OpenTelemetry Collector

## Sources Consulted
- Traefik tracing configuration reference: https://doc.traefik.io/traefik/reference/install-configuration/observability/tracing/
- Traefik OpenTelemetry tracing documentation: https://doc.traefik.io/traefik/v3.4/observability/tracing/opentelemetry/
- Traefik EntryPoints reference, including `observability.traceVerbosity`: https://doc.traefik.io/traefik/master/reference/install-configuration/entrypoints/
- Traefik router observability reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/observability/
- Traefik Docker provider routing documentation: https://doc.traefik.io/traefik/v3.3/routing/providers/docker/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/v3.3/middlewares/http/headers/
- Traefik RateLimit middleware documentation: https://doc.traefik.io/traefik/v3.3/middlewares/http/ratelimit/
- Traefik Retry middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/retry/
- Traefik metrics configuration reference: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Traefik release policy and supported versions: https://doc.traefik.io/traefik/master/deprecation/releases/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The first Traefik static configuration enabled both HTTP and gRPC OTLP exporters in the same introductory example. I kept the introductory example on HTTP and left gRPC for the dedicated gRPC section to match the section intent and official exporter examples.
- The gRPC tracing example used `tracing.otlp.grpc.timeout`, which is not listed in the official Traefik OTLP gRPC tracing options. I removed the unsupported field.
- The post claimed every middleware creates its own span by default. Current Traefik documentation says the default `traceVerbosity` is `minimal`; middleware spans require `traceVerbosity: detailed`. I added detailed trace verbosity to the entryPoint and Docker examples and corrected the explanation.
- The dynamic configuration declared `retry-middleware` but did not attach it to the router while later showing retry in the trace flow. I added it to the router middleware chain.
- The trace flow described an "entrypoint" span and implied middleware spans unconditionally. I corrected the wording to server span, middleware spans with detailed verbosity, and client span.
- The Docker Compose snippet used the obsolete top-level `version` field. I removed it to align with the current Compose Specification.
- The Docker example used `traefik:v3.0` while relying on current `traceVerbosity` behavior. I updated it to `traefik:v3.6`, an active supported Traefik v3 minor version per Traefik's release policy.
- The Docker CLI example set gRPC sub-options without explicitly enabling the gRPC tracing exporter. I added `--tracing.otlp.grpc=true`, matching Traefik's documented CLI examples.

## Review Notes
The remaining examples are illustrative and assume reachable service names such as `otel-collector`, `api-backend`, and `web-backend` on the deployment network. The backend application environment variables are SDK-specific and may need `OTEL_EXPORTER_OTLP_PROTOCOL` depending on the application's OpenTelemetry SDK defaults.
