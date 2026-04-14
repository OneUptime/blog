# Validation Summary: How to Optimize Dapr Actor Placement Efficiency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (placement service, actor runtime, metadata API)
- Kubernetes (StatefulSet scaling, pod lifecycle, rolling updates)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Redis (actor reminder storage)

## Sources Consulted
- Dapr Configuration resource schema: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr actor runtime configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr JavaScript SDK actors guide: https://docs.dapr.io/developing-applications/sdks/js/js-actors/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

1. **Actor configuration shown as Configuration CRD (major)**: The post presented actor runtime settings (`actorIdleTimeout`, `actorScanInterval`, etc.) as a Kubernetes Configuration CRD with `apiVersion: dapr.io/v1alpha1` and `kind: Configuration` under `spec.actor`. The Dapr Configuration CRD schema does not have a `spec.actor` section. Actor runtime configuration is done via application code and returned from the app's `/dapr/config` endpoint. Changed from YAML CRD to JSON format and updated the surrounding text to reflect the correct configuration method.

2. **`reentrancyConfig` field name incorrect**: The field was named `reentrancyConfig` but the correct field name is `reentrancy` per Dapr documentation. Fixed to `reentrancy`.

3. **Incorrect annotation reference**: The post showed `dapr.io/config: "actor-config"` annotation to apply actor configuration. While `dapr.io/config` is a valid annotation, it applies Dapr Configuration CRDs (tracing, metrics, middleware), not actor runtime configuration. Replaced with a note that actor config is set via the SDK at startup.

4. **JS SDK method order incorrect**: The post showed `server.actor.registerActor()` before `server.actor.init()`. Per official Dapr JS SDK docs, the correct order is: `await server.actor.init()` → `server.actor.registerActor()` → `await server.start()`. Fixed the order and added the missing `server.start()` call.

5. **Non-existent API endpoint `GET /v1.0/actors`**: The post used `curl http://localhost:3500/v1.0/actors` to verify actor registration. This endpoint does not exist in the Dapr API. Changed to the correct endpoint: `GET /v1.0/metadata`.

6. **Invalid jq field `.activeActorsCount`**: Used in two places to query actor counts. The Dapr metadata API response does not contain an `activeActorsCount` field. It returns an `actors` array where each element has `type` (string) and `count` (integer). Changed both occurrences to `.actors`.

7. **Partitioning section used CRD format**: The `remindersStoragePartitions` setting was shown in a Configuration CRD YAML snippet. Changed to JSON format consistent with the application-level configuration approach.

## Review Notes
- The `remindersStoragePartitions` feature is legacy as of Dapr v1.15, which introduced Scheduler Actor Reminders as the default. The post does not mention this, but the setting remains valid for deployments using state store-based reminders.
- The placement service health endpoint on port 8080 (`/healthz`) is correct for the placement service container, though readers should note this is distinct from the sidecar health endpoint on port 3500.
- The consistent hashing ring and Raft consensus claims for the placement service are accurate.
- The Kubernetes pod lifecycle configuration (terminationGracePeriodSeconds, preStop hook) for graceful actor drain is correct and well-explained.
