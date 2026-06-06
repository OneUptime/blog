# Validation Summary: How to Use Chaos Testing with Chaos Mesh and Correlate Failures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Chaos Mesh
- Kubernetes
- Helm
- OpenTelemetry
- OpenTelemetry Python API
- OpenTelemetry Collector
- Jaeger query API
- Python
- YAML

## Sources Consulted
- Chaos Mesh Helm installation documentation: https://chaos-mesh.org/docs/production-installation-using-helm/
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/next/simulate-network-chaos-on-kubernetes/
- Chaos Mesh scheduling rules documentation: https://chaos-mesh.org/docs/next/define-scheduling-rules/
- Chaos Mesh experiment scope documentation: https://chaos-mesh.org/docs/next/define-chaos-experiment-scope/
- Chaos Mesh experiment inspection documentation: https://chaos-mesh.org/docs/2.7.3/inspect-chaos-experiments/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry RPC semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/rpc-migration/
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/latest/apis/

## Issues Found
- The `NetworkChaos` example embedded `scheduler.cron` directly in the experiment spec. Current Chaos Mesh scheduling uses a separate `Schedule` resource with `schedule`, `type`, and `networkChaos` fields, while a one-shot `NetworkChaos` should omit the scheduler block. Removed the invalid scheduler block to keep the example a direct experiment that matches the surrounding apply/delete commands.
- The middleware example said it applied to Flask/FastAPI but used a WSGI `environ, start_response` call signature, which is not FastAPI's ASGI middleware interface. Changed the comment to Flask/WSGI.
- The middleware claimed Chaos Mesh sets annotations on affected pods. Chaos Mesh documentation describes selectors, experiment status, and events, but not automatic pod annotations for active experiments. Reworded the example to use an operator-provided mounted experiment marker.
- The trace query and analyzer examples used a Jaeger-like `/api/traces` endpoint but read a non-Jaeger `traces` response field. Jaeger's JSON API returns trace data under `data`, so the `jq` and Python examples now read `data`.
- The analyzer checked `span.status.code == 2`, which is an OTLP-style status representation and is not how Jaeger's JSON span format exposes OpenTelemetry status in tags. Updated the example to look for the `otel.status_code=ERROR` tag.
- The analyzer checked deprecated `rpc.grpc.status_code` with lowercase `deadline_exceeded`. Current OpenTelemetry RPC semantic conventions use `rpc.response.status_code` with string values such as `DEADLINE_EXCEEDED`, so the example now checks that key/value.

## Review Notes
- The Jaeger HTTP JSON API is documented as internal and subject to change. The example is useful for local analysis, but production automation should prefer a backend-supported stable API where available.
- The transform processor example uses a high-latency heuristic for possible chaos impact. That is technically valid as enrichment, but it should not be treated as proof that a span was affected by a Chaos Mesh experiment without additional experiment metadata.
