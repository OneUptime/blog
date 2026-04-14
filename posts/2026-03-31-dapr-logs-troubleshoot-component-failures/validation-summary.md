# Validation Summary: How to Use Dapr Logs for Troubleshooting Component Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, component model)
- Kubernetes (kubectl, pod logs, CRDs)
- Redis (state store component)
- Apache Kafka (pub/sub component)
- jq (JSON log filtering)

## Sources Consulted
- Dapr official documentation: sidecar logging and log format configuration (https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/)
- Dapr official documentation: Health API endpoint `/v1.0/healthz` (https://docs.dapr.io/reference/api/health_api/)
- Dapr official documentation: Metadata API endpoint `/v1.0/metadata` (https://docs.dapr.io/reference/api/metadata_api/)
- Dapr official documentation: Component CRD spec (https://docs.dapr.io/reference/resource-specs/component-schema/)
- Dapr official documentation: Kubernetes annotations including `dapr.io/log-as-json` (https://docs.dapr.io/reference/arguments-annotations-overview/)

## Issues Found
1. **Incorrect grep pattern for component loading (line 27)**: The post used `grep "component loaded"` but actual Dapr log messages say `"loaded component <name> (<type>)"` — the words are in reverse order. The example output was also incorrect. Fixed the grep pattern to `grep "loaded component"` and updated the example output to `level=info msg="loaded component statestore (state.redis/v1)"` to match actual Dapr log format.

2. **jq command assumes JSON logging without mentioning the prerequisite (line 114)**: The `jq` command in the "Runtime Component Errors" section pipes Dapr sidecar logs through jq, but Dapr uses text/logfmt format by default, not JSON. The earlier examples in the post correctly show logfmt output, making this inconsistent. Added a comment noting that JSON logging must be enabled via the `dapr.io/log-as-json: "true"` annotation for the jq command to work.

## Review Notes
- All kubectl commands, Dapr API endpoints, and Kubernetes CRD access patterns are correct.
- The `daprd` sidecar container name is accurate.
- The Dapr health endpoint (`/v1.0/healthz`) and metadata endpoint (`/v1.0/metadata` with `.components` field) are both correct and current.
- The error message patterns shown (Redis connection refused, Kafka broker unavailable, secret not found) are representative of real Dapr error output.
- The Kafka diagnostic command using `kafka-broker-api-versions` is a valid approach for testing broker connectivity.
