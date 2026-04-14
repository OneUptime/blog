# Validation Summary: How to Test Dapr Jobs Locally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Jobs building block, Scheduler service)
- Dapr CLI (self-hosted mode)
- Dapr Jobs HTTP API (v1.0-alpha1)
- Node.js (Express app example)
- supertest (unit testing)
- Bash scripting (integration test)

## Sources Consulted
- Dapr Jobs API Reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs Features and Concepts: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-features-concepts/
- Dapr How-To: Schedule and Handle Triggered Jobs: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/
- Dapr CLI Reference - dapr init: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI Reference - dapr status: https://docs.dapr.io/reference/cli/dapr-status/
- Dapr CLI Reference - dapr list: https://docs.dapr.io/reference/cli/dapr-list/
- Dapr Service Invocation (header reference): https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Scheduler Service: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Install Self-Hosted: https://docs.dapr.io/getting-started/install-dapr-selfhost/

## Issues Found

### 1. `dapr status` is Kubernetes-only (Prerequisites section)
- **What was wrong:** The post used `dapr status` to verify Dapr services are running in self-hosted mode. According to official docs, `dapr status` is only supported on Kubernetes.
- **What was changed:** Replaced `dapr status` with `docker ps` and updated the expected output to show Docker container names (`dapr_scheduler`, `dapr_placement`, `dapr_redis`, `dapr_zipkin`).
- **Why:** In self-hosted mode, Dapr services run as Docker containers. `docker ps` is the correct way to verify they are running.

### 2. Protobuf `Any` wrapper used in HTTP API `data` field (multiple sections)
- **What was wrong:** All curl examples used `"data": { "@type": "type.googleapis.com/google.protobuf.StringValue", "value": "..." }` which is the gRPC/protobuf `Any` representation. The HTTP API accepts plain JSON values directly in the `data` field.
- **What was changed:** Replaced protobuf `Any` wrapper with plain JSON objects/values in all curl commands and the unit test example. For example, `"data": { "test": true, "iteration": 1 }` instead of the wrapped format.
- **Why:** The Dapr Jobs HTTP API documentation shows `data` as a plain JSON value (string, object, etc.), not a protobuf `Any` wrapper. The `@type`/`value` encoding is internal to the gRPC layer.

### 3. Incorrect `X-DaprAppID` header (Manually Triggering section)
- **What was wrong:** The manual handler trigger example used the header `X-DaprAppID: job-test-app`.
- **What was changed:** Replaced with the correct header `dapr-app-id: job-test-app`.
- **Why:** The official Dapr documentation consistently uses the lowercase, hyphenated `dapr-app-id` header for service invocation. `X-DaprAppID` does not appear in official docs.

## Review Notes
- The Jobs API path `v1.0-alpha1` indicates this is still an alpha API. A future Dapr release may promote it to `v1.0` or change the path, which would require updating this post.
- The Scheduler service was introduced in Dapr 1.14. The post does not specify a minimum Dapr version, which could confuse readers on older versions.
- The integration test script assumes the app stores job execution records in the Dapr state store at a specific key pattern (`job:e2e-test:latest`). This is application-specific logic, not built into Dapr, which is not explicitly stated and could confuse readers into thinking Dapr automatically records job execution state.
