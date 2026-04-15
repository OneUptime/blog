# Validation Summary: How to Use the Dapr Actors API Reference

## Status
validated

## Post Type
Reference

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors API (virtual actor pattern)
- Dapr actor state management
- Dapr actor timers and reminders
- Dapr actor reentrancy configuration
- Node.js / Express (for actor endpoint implementation examples)

## Sources Consulted
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr How-To: Actors: https://docs.dapr.io/developing-applications/building-blocks/actors/howto-actors/

## Issues Found

### 1. Incorrect Actor Configuration Format (Lines 124-139)
**What was wrong:** The post showed actor configuration as a Kubernetes-style YAML Configuration resource with a fabricated structure (`spec.entities` containing objects with fields like `entityName`, `actorIdleTimeout`, etc.). This format does not exist in Dapr. Actor configuration is done by the application exposing a `GET /dapr/config` endpoint that returns a JSON response.

**What was changed:** Replaced the incorrect YAML Configuration resource with the correct JSON format returned by the `/dapr/config` endpoint, matching the official Dapr documentation. Added a brief explanation that the app must expose this endpoint.

**Why:** The `entityName` field does not exist in Dapr's actor configuration. The correct structure uses `entities` as a simple string array of actor type names, with settings like `actorIdleTimeout`, `reentrancy`, etc. at the top level (or in `entitiesConfig` for per-type overrides).

## Review Notes
- The post lists only POST for actor method invocation, but Dapr also accepts GET, PUT, and DELETE on that endpoint. POST is valid and the most common usage, so this is a simplification rather than an error.
- The post lists only POST for state transactions, but PUT is also accepted. Again, POST is valid.
- The `data` field in timer and reminder examples uses JSON objects. The official docs show string examples, but Dapr accepts JSON objects for the data field in practice.
- The post does not mention the `ttl` field for timers and reminders, which is an optional field. This is an omission of an optional feature, not an error.
- The "Timer/reminder callback" comment in the JavaScript implementation section is slightly imprecise: reminder callbacks route to `/method/remind/<reminderName>` (not the same pattern as timer callbacks), but the code example specifically shows a timer callback which is correct.
