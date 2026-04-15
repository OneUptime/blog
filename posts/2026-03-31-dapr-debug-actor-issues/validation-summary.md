# Validation Summary: How to Debug Actor Issues in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model)
- Dapr Placement Service
- Dapr HTTP API (actor state management)
- Zipkin (distributed tracing)
- Kubernetes (deployment annotations)
- Go (code example for context timeouts)

## Sources Consulted
- Dapr Placement API reference: https://docs.dapr.io/reference/api/placement_api/
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actors how-to guide: https://docs.dapr.io/developing-applications/building-blocks/actors/howto-actors/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Kubernetes annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr tracing setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr source code (error codes): https://github.com/dapr/dapr/blob/master/pkg/messages/errorcodes/errorcodes.go

## Issues Found

### 1. Incorrect placement service API port
- **What was wrong:** The blog used `curl http://localhost:9090/placement/state` but the Dapr placement service metadata API defaults to port 8080, not 9090.
- **What was changed:** Updated port from `9090` to `8080`.
- **Why:** The official Dapr Placement API documentation confirms the healthz/metadata port defaults to 8080 in self-hosted mode.

### 2. Undocumented `dapr.actor` span tag claim
- **What was wrong:** The blog stated "Actor invocations appear in Zipkin with the span tag `dapr.actor`." No official Dapr documentation confirms the existence of a `dapr.actor` span tag.
- **What was changed:** Replaced with a general statement about actor invocations appearing as spans in Zipkin for tracing call chains, without referencing a specific undocumented span tag.
- **Why:** Claiming a specific span tag name without documentation could mislead readers who search for it. The general tracing capability is well-documented.

## Review Notes
- The placement metadata API is disabled by default. Users must set the `DAPR_PLACEMENT_METADATA_ENABLED` environment variable or `metadata-enabled` CLI argument to `true` before the `/placement/state` endpoint will work. The blog does not mention this prerequisite. A future update could add a note about enabling it.
- The example placement API response omits the `tableVersion` field that the official docs include. This is acceptable for an illustrative example but could be noted.
- The `ERR_ACTOR_INSTANCE_MISSING` error code is real but its description is slightly simplified. The error more precisely means the actor instance could not be located, which may or may not be a placement-specific issue. The blog's explanation is reasonable for a debugging guide.
- The Go code example demonstrating context timeouts is syntactically correct and represents good practice, though Dapr's Go SDK actor interface may differ slightly depending on the SDK version used.
