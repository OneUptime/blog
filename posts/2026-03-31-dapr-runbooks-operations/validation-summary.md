# Validation Summary: How to Create Dapr Runbooks for Operations Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane, sidecar, Sentry, operator)
- Kubernetes (kubectl, deployments, secrets, CRDs)
- Helm
- Prometheus (promtool, PromQL)
- Redis Streams (pub/sub, consumer groups)
- OpenSSL (certificate inspection)

## Sources Consulted
- [Dapr Metrics Overview](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) — verified correct metric names include `dapr_runtime_` prefix
- [Dapr Metrics Development Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) — confirmed `dapr_runtime_service_invocation_req_sent_total` as the correct metric
- [Dapr mTLS Certificate Setup](https://docs.dapr.io/operations/security/mtls/) — verified `dapr-trust-bundle` secret name, keys (`ca.crt`, `issuer.crt`, `issuer.key`), and jsonpath extraction method
- [Dapr Security Concepts](https://docs.dapr.io/concepts/security-concept/) — confirmed trust bundle structure
- [Dapr Kubernetes Deploy](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/) — verified `dapr-system` namespace, component names, label selectors
- [Dapr Redis Streams Pub/Sub](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/) — confirmed Redis Streams usage for pub/sub
- [Dapr Dead Letter Topics](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/) — verified dead letter topic behavior
- [Dapr Resiliency Overview](https://docs.dapr.io/operations/resiliency/resiliency-overview/) — confirmed `kubectl get resiliency` resource name
- [Dapr Subscription Schema](https://docs.dapr.io/reference/resource-specs/subscription-schema/) — confirmed `kubectl get subscriptions` resource name
- [Dapr Sidecar Overview](https://docs.dapr.io/concepts/dapr-services/sidecar/) — confirmed `daprd` as the sidecar container name
- [Dapr Kubernetes Upgrade](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/) — verified Helm upgrade command syntax
- [Dapr Service Invocation Metrics Proposal (GitHub #5484)](https://github.com/dapr/dapr/issues/5484) — confirmed metric naming convention

## Issues Found

1. **Incorrect Dapr metric name**: The PromQL query used `dapr_service_invocation_req_sent_total` but the correct metric name is `dapr_runtime_service_invocation_req_sent_total` (missing the `_runtime_` prefix). All Dapr runtime metrics use this prefix. Fixed the metric name in the DaprHighErrorRate diagnosis section.

2. **Wrong Redis command for Streams**: The dead-letter count check used `LLEN` (a Redis list command), but Dapr pub/sub uses Redis Streams, not lists. Changed to `XLEN` which is the correct command for getting the length of a Redis Stream. Also added a clarifying comment noting this is for Redis Streams.

3. **Broken certificate verification pipeline**: The command `kubectl get secret ... -o yaml | grep -A5 "ca.crt" | base64 -d | openssl x509 -noout -dates` would fail because `grep` output includes the YAML key prefix (`ca.crt: `), which corrupts the base64 input. Replaced with `kubectl get secret ... -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -noout -dates`, which cleanly extracts only the base64-encoded certificate data.

## Review Notes
- The `promtool query instant` command works when executed inside the Prometheus pod (defaults to localhost:9090), but some Prometheus deployments may not include `promtool` in the container image. An alternative would be using `curl` against the Prometheus HTTP API.
- The Redis Stream key format `"app-id||topic-name"` is implementation-specific to Dapr's Redis Streams pub/sub component and may vary across versions. Operators should verify their actual key format by inspecting Redis directly.
- The `status_code` label in the PromQL query may not be present on all Dapr metric versions. Some versions use `status` as the label name. Operators should verify available labels with their Prometheus instance.
- The post correctly identifies the four most common Dapr failure categories (control plane, error rates, pub/sub, certificates) and provides sound diagnostic and remediation approaches throughout.
