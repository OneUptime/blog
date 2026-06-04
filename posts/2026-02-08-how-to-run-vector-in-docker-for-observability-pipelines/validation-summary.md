# Validation Summary: How to Run Vector in Docker for Observability Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Vector
- Vector Remap Language (VRL)
- Elasticsearch
- Prometheus exporter scraping
- Syslog
- Alpine Linux container images

## Sources Consulted
- Vector Docker installation docs: https://vector.dev/docs/setup/installation/platforms/docker/
- Vector Observability API docs: https://vector.dev/docs/reference/api/
- Vector docker_logs source docs: https://vector.dev/docs/reference/configuration/sources/docker_logs/
- Vector host_metrics source docs: https://vector.dev/docs/reference/configuration/sources/host_metrics/
- Vector syslog source docs: https://vector.dev/docs/reference/configuration/sources/syslog/
- Vector prometheus_exporter sink docs: https://vector.dev/docs/reference/configuration/sinks/prometheus_exporter/
- Vector prometheus_remote_write sink docs: https://vector.dev/docs/reference/configuration/sinks/prometheus_remote_write/
- Vector Elasticsearch sink docs: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector route transform docs: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector VRL function reference: https://vector.dev/docs/reference/vrl/functions/
- Vector sizing and capacity planning docs: https://vector.dev/docs/setup/going-to-prod/sizing/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Alpine Linux release branches: https://alpinelinux.org/releases/

## Issues Found
- The Vector API health check command used `http://localhost:8686/health`, but the sample Vector config did not enable the API. Added `api.enabled: true` and `api.address: "0.0.0.0:8686"` to match Vector's Docker/API docs.
- The post described a `prometheus_exporter` sink as Prometheus remote write. Corrected the diagram and sink comment to say it exposes a Prometheus scrape endpoint. The remote write sink is a separate Vector sink type.
- The filter transform used `string!(.message)` with a fallback that would not protect against an abort from the bang function. Replaced it with `string(.message) ?? ""` so the expression safely handles missing or non-string messages.
- The Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it to align with the current Compose Specification.
- The Vector image was pinned to `timberio/vector:0.37.0-alpine`, while current Vector Docker docs show `0.56.0` examples. Updated the example to `timberio/vector:0.56.0-alpine`.
- The sample Alpine containers used `alpine:3.19`, which is no longer a supported release branch. Updated them to `alpine:3.23`, a supported Alpine release branch.
- The performance section claimed over 10GB/s on a single core and described a fixed-size buffer system. Reworded it to match Vector's official sizing guidance, which gives conservative MiB/s-per-vCPU estimates and emphasizes workload-dependent capacity.

## Review Notes
Docker was available locally, but pulling `timberio/vector:0.37.0-alpine` was blocked by Docker Hub's unauthenticated pull rate limit, so runtime validation with `vector validate` could not be completed. The review was completed against official documentation instead.
