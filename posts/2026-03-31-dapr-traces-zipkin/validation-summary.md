# Validation Summary: How to Send Dapr Traces to Zipkin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime) - tracing configuration
- Zipkin (distributed tracing system)
- Kubernetes (deployment, service, annotations, port-forward)
- Docker (running Zipkin locally)
- Elasticsearch (persistent storage backend for Zipkin)

## Sources Consulted
- Dapr Zipkin tracing documentation: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Docker Hub openzipkin/zipkin: https://hub.docker.com/r/openzipkin/zipkin
- Zipkin API v2 OpenAPI spec: https://github.com/openzipkin/zipkin-api
- Zipkin server documentation (storage configuration): https://github.com/openzipkin/zipkin/tree/master/zipkin-server

## Issues Found
No technical issues found.

## Review Notes
- The `openzipkin/zipkin:3` image tag is current and actively maintained (last pushed 2026-04-08).
- The Dapr Configuration `apiVersion: dapr.io/v1alpha1` and tracing spec structure (`spec.tracing.samplingRate`, `spec.tracing.zipkin.endpointAddress`) are correct per official docs.
- All four Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/config`) are valid.
- The `samplingRate: "1"` is correctly specified as a string, matching the Dapr spec.
- The Zipkin API v2 endpoints (`/api/v2/spans`, `/api/v2/traces`, `/api/v2/trace/{traceId}`, `/api/v2/services`) are all valid.
- The Elasticsearch storage env vars (`STORAGE_TYPE=elasticsearch`, `ES_HOSTS`) are correct.
- The Dapr CLI `dapr run` flags (`--app-id`, `--app-port`, `--config`) are all documented and correct.
- The Dapr service invocation URL format `/v1.0/invoke/{appId}/method/{method}` is correct.
- The Kubernetes Deployment YAML for Zipkin uses in-memory storage (`STORAGE_TYPE=mem`), which is appropriate for development/testing. The post correctly notes Elasticsearch should be used for production.
