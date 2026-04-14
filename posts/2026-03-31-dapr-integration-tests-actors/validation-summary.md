# Validation Summary: How to Set Up Integration Tests for Dapr Actors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14.0) - distributed application runtime
- Dapr Actors (virtual actor model)
- Dapr Placement Service
- Dapr Python SDK (`dapr.actor`)
- Python (pytest, requests)
- Docker Compose
- Redis (as actor state store)

## Sources Consulted
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Python Actor SDK: https://docs.dapr.io/developing-applications/sdks/python/python-actor/
- Dapr Placement Service overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Docker Hub daprio/placement image: https://hub.docker.com/r/daprio/placement

## Issues Found

### 1. Incorrect use of `get_state()` in actor implementation (Critical)
- **What was wrong:** The `get_status` method used `await self._state_manager.get_state("status") or "pending"`. The `get_state()` method on `ActorStateManager` raises a `KeyError` when the state key does not exist, so the `or "pending"` fallback would never execute -- the call would throw an unhandled exception instead.
- **What was changed:** Replaced with `try_get_state("status")` which returns a `(has_value, value)` tuple, allowing proper fallback handling: `has_value, status = await self._state_manager.try_get_state("status"); return status if has_value else "pending"`.
- **Why:** `try_get_state()` is the correct Dapr Python SDK method for retrieving state with a safe check for existence. This matches the documented API and avoids runtime errors when the actor is queried before any order has been processed.

## Review Notes
- The actor method invocation uses `PUT`, which is valid. Dapr supports POST, GET, PUT, and DELETE for actor method invocation -- all are equally valid.
- The placement service command uses single-dash flags (`-port`, `-log-level`). The Go `flag` package used by Dapr accepts both single and double dash prefixes, so this works, though some examples in Dapr documentation use double dashes (`--port`).
- The health check correctly expects HTTP 204, which is what `/v1.0/healthz` returns when Dapr is healthy.
- The reminder registration correctly expects HTTP 204, matching the Dapr Actors API specification.
- The `daprio/placement:1.14.0` Docker image is a real, official Dapr image on Docker Hub.
- The Docker Compose setup correctly uses `network_mode: "service:actor-service"` to share the network namespace between the app and its Dapr sidecar, which is the standard pattern for sidecar containers in Compose.
