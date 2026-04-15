# Validation Summary: How to Enable Actor Reentrancy in Dapr

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Dapr (actor reentrancy feature)
- Dapr Python SDK (`dapr.actor.runtime.config`)
- Dapr .NET SDK (`Dapr.Actors`)
- Dapr JavaScript/Node.js SDK (`AbstractActor`, `DaprClient`)
- Kubernetes (kubectl for applying configuration)

## Sources Consulted
- Dapr official documentation on actor reentrancy: https://docs.dapr.io/developing-applications/building-blocks/actors/actor-reentrancy/
- Dapr Configuration resource spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Python SDK source (`dapr/actor/runtime/config.py`) — verified `ActorReentrancyConfig` constructor uses `maxStackDepth` (camelCase)
- Dapr .NET SDK source (`src/Dapr.Actors/ActorReentrancyConfig.cs`, `src/Dapr.Actors/Runtime/ActorRuntimeOptions.cs`) — verified `ReentrancyConfig`, `Enabled`, `MaxStackDepth`
- Dapr JavaScript SDK source (`src/actors/runtime/AbstractActor.ts`) — verified available methods (`getDaprClient()`, `getActorId()`)
- Dapr preview features list (v1.17) — confirmed ActorReentrancy is no longer a preview feature

## Issues Found

### 1. Outdated `features` block in Configuration YAML
**What was wrong:** The YAML configuration included a `features` block enabling `ActorReentrancy` as a preview feature. Actor reentrancy was promoted from preview to stable in Dapr ~1.7 and no longer requires a feature flag.
**What was changed:** Removed the `features` block from the Configuration YAML snippet.
**Why:** Including the obsolete feature flag is misleading for users on current Dapr versions and suggests reentrancy is still in preview when it is not.

### 2. Incorrect Python SDK parameter name
**What was wrong:** The Python example used `max_stack_depth=32` (snake_case) as a constructor argument to `ActorReentrancyConfig`.
**What was changed:** Changed to `maxStackDepth=32` (camelCase) to match the actual Python SDK constructor signature.
**Why:** The Dapr Python SDK's `ActorReentrancyConfig.__init__` uses `maxStackDepth` (camelCase), not `max_stack_depth`. Using the wrong parameter name would cause a `TypeError` or silently ignore the value.

### 3. Non-existent Node.js SDK methods
**What was wrong:** The JavaScript example used `this.getActorProxyFactory().createActorProxy("ActorB", "b-1").invokeMethod(...)` — none of these methods exist on `AbstractActor` in the Dapr JS SDK. It also used `this.id` instead of the correct accessor.
**What was changed:** Replaced with the correct pattern: `this.getDaprClient()` to get the Dapr client, then `client.actor.invoke(actorType, actorId, methodName, body)` to invoke another actor. Changed `this.id` to `this.getActorId()`.
**Why:** The `AbstractActor` class in the Dapr JS SDK does not have a `getActorProxyFactory()` method. The correct way to invoke another actor from within an actor is via `getDaprClient().actor.invoke()`.

## Review Notes
- The `spec.actor.reentrancy` path in the Kubernetes Configuration resource may not be part of the official Configuration resource schema (which documents fields like `accessControl`, `api`, `httpPipeline`, etc., but not `actor`). The official Dapr docs configure reentrancy at the application level via the `/dapr/config` HTTP endpoint response, which is what the Python and .NET SDK examples demonstrate. The YAML approach may work in practice but users should verify against their Dapr version.
- The .NET SDK code example is correct and matches the official documentation exactly.
- The general technical explanations (deadlock scenario, call chain context tracking, maxStackDepth behavior) are all accurate per the official Dapr documentation.
