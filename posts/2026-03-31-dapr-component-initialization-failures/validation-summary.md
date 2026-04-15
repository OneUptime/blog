# Validation Summary: How to Fix Dapr Component Initialization Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Redis (state store example)
- Apache Kafka (pub/sub example)
- Dapr Resiliency API
- Dapr CLI

## Sources Consulted
- Dapr CLI reference — `dapr components`: https://docs.dapr.io/reference/cli/dapr-components/
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Resiliency overview and built-in policies: https://docs.dapr.io/operations/resiliency/policies/retries/override-default-retries/
- Dapr State API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr source code (`pkg/resiliency/resiliency.go`, `pkg/api/http/http.go`) for verification of policy names and HTTP status codes

## Issues Found

### 1. Incorrect CLI flag for namespace (HIGH)
- **What was wrong:** `dapr components -k -n <namespace>` used `-n` as shorthand for `--namespace`, but `-n` is actually short for `--name` in the Dapr CLI.
- **What was changed:** Replaced `-n` with `--namespace` (the full flag, which has no short form).
- **Why:** Using `-n` would filter by component name instead of namespace, producing incorrect results.

### 2. Wrong HTTP status code for failed components (MEDIUM)
- **What was wrong:** The post claimed that a component that failed to initialize would return HTTP `503`.
- **What was changed:** Corrected to `500`, which is what Dapr actually returns for uninitialized or misconfigured components.
- **Why:** Dapr returns `500 Internal Server Error` for state store failures and health check failures, not `503 Service Unavailable`.

### 3. Incorrect Resiliency configuration for init retries (HIGH)
- **What was wrong:** The Resiliency YAML used a non-existent policy name `DefaultComponentCodeRetry` and placed it under `targets.components.statestore.inbound.retry`. Three problems: (a) `DefaultComponentCodeRetry` is not a recognized Dapr policy name, (b) the `targets.components` section handles runtime operation retries, not initialization retries, and (c) `inbound` is incorrect for state stores — state store operations are outbound from the sidecar.
- **What was changed:** Replaced the entire Resiliency example with the correct approach: overriding the built-in `DaprBuiltInInitializationRetries` policy, which is one of four recognized built-in retry policy names in Dapr. Removed the incorrect `targets` section since built-in policy overrides apply globally.
- **Why:** The original YAML would not cause component initialization retries. `DaprBuiltInInitializationRetries` is the correct built-in policy name for controlling initialization retry behavior.

## Review Notes
- The example error messages in the "Recognizing Initialization Failures" section are representative but not exact Dapr log output. They are reasonable illustrations.
- The `kafka-broker-api-versions.sh` command is a valid real tool from the Apache Kafka distribution, available in the `bitnami/kafka` image.
- The component scoping YAML structure (with `scopes` at the top level alongside `spec`) is correct per the official Dapr component schema.
- The secret reference YAML structure using `secretKeyRef` is correct.
- The `kubectl` commands for checking secrets and testing connectivity are all valid.
