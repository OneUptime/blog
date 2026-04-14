# Validation Summary: How to Build a Polyglot Microservices System with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, state management, pub/sub)
- Go (API gateway using net/http)
- Python (Flask web framework, requests library)
- Node.js (Express framework)
- Redis (as Dapr state store and pub/sub broker)
- Docker Compose (local multi-service orchestration with Dapr sidecars)
- Kubernetes (deployment with Dapr annotations)

## Sources Consulted
- Dapr HTTP API reference for service invocation: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr HTTP API reference for state management: https://docs.dapr.io/reference/api/state_api/
- Dapr HTTP API reference for pub/sub: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr programmatic subscription documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/#programmatic-subscriptions
- Dapr Docker Compose sidecar pattern: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found
1. **Unused `import json` in Python order service** — The Python code imported the `json` module but never used it. All JSON handling was done via Flask's `request.get_json()`/`jsonify()` and the requests library's `json=` parameter and `.json()` method. Removed the unused import.

## Review Notes
- The Go import block is not in alphabetical order (`log` appears after `net/http`). This is a `goimports` convention issue, not a compilation error, so it was left as-is.
- The `version: '3.8'` key in Docker Compose is considered obsolete by the Compose Specification (Docker Compose V2) but is still widely used and functional. Not changed since it remains valid and is common in tutorials.
- The Go API gateway handler does not filter by HTTP method (accepts GET, DELETE, etc. on `/api/orders`), which is acceptable for a tutorial but would need method checking in production.
- The Kubernetes deployment example is minimal (no replicas, resource limits, or readiness probes), which is appropriate for a tutorial introduction.
- All Dapr HTTP API endpoints, component configurations, Docker Compose sidecar patterns, and Kubernetes annotations are accurate and current.
