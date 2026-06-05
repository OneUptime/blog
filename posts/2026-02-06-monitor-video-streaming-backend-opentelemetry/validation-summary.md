# Validation Summary: How to Monitor Video Streaming Backend Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry tracing and metrics
- OTLP gRPC exporters
- OpenTelemetry semantic conventions
- HLS and DASH video delivery concepts
- RTMP and SRT ingest concepts
- CDN origin and cache monitoring

## Sources Consulted
- OpenTelemetry Python Exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python Metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry Deployment resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- OpenTelemetry HTTP semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- RFC 8216, HTTP Live Streaming: https://www.rfc-editor.org/rfc/rfc8216

## Issues Found
- The install command used the broad `opentelemetry-exporter-otlp` package while the code specifically imports the OTLP gRPC exporters. Updated it to `opentelemetry-exporter-otlp-proto-grpc`, matching the official Python exporter documentation for gRPC.
- The resource attribute `deployment.environment` is outdated. Updated it to the current semantic convention `deployment.environment.name`.
- Several metric units used plain English strings such as `connections`, `frames`, `segments`, `percent`, and millisecond duration units. Updated units to current OpenTelemetry/UCUM-style units such as `{connection}`, `{frame}`, `{segment}`, `%`, and `s`, and adjusted duration recordings from milliseconds to seconds where needed.
- The delivery span used deprecated HTTP semantic attribute `http.method`. Updated it to `http.request.method`.
- The segment cache check used truthiness, which would treat valid empty cached payloads as cache misses. Updated the check to `cached is not None`.
- The transcoding queue-depth metric was declared and used in the alerting guidance, but the example never recorded queue changes. Added a minimal enqueue example and a matching decrement when a worker starts transcoding.

## Review Notes
The Python snippets were syntax-checked after the edits. The examples remain illustrative and still depend on application-specific objects such as `receive_frames`, `encoder`, `storage`, and `segment_cache`.
