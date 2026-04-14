# Validation Summary: How to Use Redis Cluster with Dapr State Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- Redis Cluster
- Kubernetes (Helm deployment)
- Bitnami Redis Cluster Helm chart
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr HTTP State API

## Sources Consulted
- Dapr Redis State Store Component Reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr State Management API Reference — https://docs.dapr.io/reference/api/state_api/
- Dapr JavaScript Client SDK — https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr How-To: Save and Get State — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Bitnami Redis Cluster Helm Chart (values.yaml) — https://github.com/bitnami/charts/blob/main/bitnami/redis-cluster/values.yaml
- Redis Cluster Specification (hash tags) — https://redis.io/docs/reference/cluster-spec/

## Issues Found
No technical issues found.

All verified claims:
- `redisType: "cluster"` is a valid Dapr Redis state store metadata field that enables cluster protocol.
- All Dapr component metadata fields (`redisHost`, `redisPassword`, `enableTLS`, `maxRetries`, `maxRetryBackoff`, `poolSize`) are correct and current.
- Bitnami Helm chart parameters (`cluster.nodes`, `cluster.replicas`, `password`, `persistence.size`) are accurate.
- The Dapr JavaScript SDK usage (`DaprClient`, `client.state.save()`, `client.state.get()`) follows the correct API.
- The Dapr HTTP state API endpoint (`POST /v1.0/state/<storename>`) is correct.
- Redis Cluster hash tag syntax (`{user:42}`) correctly ensures co-location of keys in the same hash slot.
- The `kubectl` commands for cluster health monitoring are valid.

## Review Notes
- When using `redisType: "cluster"`, the `redisDB` option is ignored since Redis Cluster does not support database selection. The post does not set `redisDB`, so this is not an issue, but worth noting for readers who might add it.
- The `redisHost` value points to a single service endpoint which serves as the cluster discovery entry point. This is the correct approach — Dapr will discover all cluster nodes from this initial connection.
- Storing passwords in plaintext in Helm `--set` values is shown for simplicity but should use `--set-file` or a secrets manager in production. The post does correctly use `secretKeyRef` in the Dapr component definition itself.
