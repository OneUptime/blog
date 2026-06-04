# Validation Summary: How to Run Thanos in Docker for Prometheus High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Prometheus
- Thanos Sidecar
- Thanos Query
- Thanos Store Gateway
- Thanos Compactor
- MinIO / S3-compatible object storage
- Grafana

## Sources Consulted
- Thanos v0.34 Sidecar documentation: https://thanos.io/v0.34/components/sidecar.md/
- Thanos v0.34 Query documentation: https://thanos.io/v0.34/components/query.md/
- Thanos v0.34 Store Gateway documentation: https://thanos.io/v0.34/components/store.md/
- Thanos v0.34 Compactor documentation: https://thanos.io/v0.34/components/compact.md/
- Thanos v0.34 Object Storage documentation: https://thanos.io/v0.34/thanos/storage.md/
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- MinIO container documentation: https://min.io/docs/minio/container/index.html

## Issues Found
- The Prometheus containers did not enable `--web.enable-admin-api`. Thanos sidecar documentation for v0.34 states this flag is needed so the sidecar can get Prometheus metadata such as external labels. Added `--web.enable-admin-api` to both Prometheus command blocks.
- The Thanos Query example used the deprecated `--store` flag. Thanos v0.34 documents `--endpoint` as the static StoreAPI endpoint flag. Replaced all three `--store=...` arguments with `--endpoint=...`.
- The Docker Compose sample included the top-level `version: "3.8"` property. Current Docker Compose documentation marks this property as obsolete and only informative. Removed it from the sample.

## Review Notes
- The post uses older pinned images (`prom/prometheus:v2.51.0`, `thanosio/thanos:v0.34.1`, and `prom/node-exporter:v1.7.0`). They are version-specific and the documented flags/configuration are valid for those versions, but future maintenance should consider testing newer Prometheus and Thanos releases.
- Docker image pulls could not be used for local `--help` verification because the environment hit Docker Hub's unauthenticated pull rate limit. The review therefore relied on official versioned Thanos documentation, Prometheus documentation, Docker documentation, and MinIO documentation.
