# Validation Summary: How to Deploy Zipkin for Tracing on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Zipkin (openzipkin/zipkin)
- Talos Linux
- Kubernetes (StatefulSet, Deployment, Service, CronJob, Ingress)
- Elasticsearch 8.11.0 (as Zipkin storage backend)
- OpenTelemetry (Python, Go SDKs)
- Spring Boot with Micrometer Tracing + Brave bridge
- nginx-ingress controller

## Sources Consulted
- Zipkin Server README and configuration reference: https://github.com/openzipkin/zipkin/blob/master/zipkin-server/README.md
- Zipkin Elasticsearch storage docs: https://github.com/openzipkin/zipkin/tree/master/zipkin-storage/elasticsearch
- Zipkin architecture: https://zipkin.io/pages/architecture.html
- OpenTelemetry Python Zipkin exporter package (`opentelemetry-exporter-zipkin`, module `opentelemetry.exporter.zipkin.json`)
- OpenTelemetry Go Zipkin exporter (`go.opentelemetry.io/otel/exporters/zipkin`)
- Spring Boot 3 / Micrometer Tracing reference (`management.tracing.sampling.probability`, `management.zipkin.tracing.endpoint`)
- Kubernetes API references (apps/v1 StatefulSet, apps/v1 Deployment, batch/v1 CronJob, networking.k8s.io/v1 Ingress)

## Issues Found
1. **Incorrect date format in the Elasticsearch index-cleanup CronJob.** The script used `+%Y.%m.%d`, producing dates like `2026-05-09` rendered as `2026.05.09`. Zipkin's default daily index naming is `zipkin:span-YYYY-MM-DD` (or `zipkin-span-YYYY-MM-DD` on ES 7+) — i.e. hyphens between date parts, not dots — so the cutoff date string would never match an actual index. Changed to `+%Y-%m-%d`.
2. **Broken cleanup logic in the same CronJob.** The original curl call was `DELETE /zipkin:span-*,-zipkin:span-${CUTOFF_DATE}*`, which uses Elasticsearch's multi-index negation syntax to exclude only indices for *that exact cutoff day* — meaning it would have deleted everything except a single day's indices instead of retaining the last 7 days. Replaced with a small shell loop that lists `*zipkin*span-*` indices, extracts each index's `YYYY-MM-DD` suffix, and deletes only those older than the cutoff. Also broadened the index match pattern to `*zipkin*span-*` so it works whether the `:` or `-` delimiter is in use (the latter is the default on Elasticsearch 7+).

## Review Notes
- The Go example imports `go.opentelemetry.io/otel/semconv/v1.4.0`, which is a very old semconv version. It still exists and the code compiles, but current OpenTelemetry Go releases ship much newer semconv versions (v1.24.0+). Left as-is since it is not incorrect, just dated.
- `image: openzipkin/zipkin:latest` works for a tutorial but is generally discouraged for production deployments; pinning to a specific tag (e.g. `openzipkin/zipkin:3.4`) would be more reproducible. Not changed as it does not affect correctness.
- `ES_INDEX_REPLICAS: "0"` is appropriate for the single-node Elasticsearch StatefulSet shown (a non-zero replica count would leave shards unassigned). Worth flagging to readers who reuse an existing multi-node ES cluster — they should raise this.
- The Spring Boot YAML (`management.zipkin.tracing.endpoint`, `management.tracing.sampling.probability`) is correct for Spring Boot 3.x with Micrometer Tracing. Readers on Spring Boot 2.x with Spring Cloud Sleuth would use different properties.
- Zipkin's `/health` endpoint returns 200/JSON as expected; the liveness/readiness probes are correct.
- The Elasticsearch StatefulSet uses `discovery.type=single-node` and `xpack.security.enabled=false`, which is fine for an isolated tracing backend but should not be exposed beyond the cluster.
