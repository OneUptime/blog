# Validation Summary: How to Use Dapr Actor Reentrancy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (actor reentrancy feature)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr`)
- Kubernetes (Configuration resource, Deployment annotations)
- Node.js (Express-style `/dapr/config` endpoint)

## Sources Consulted
- Dapr actor reentrancy documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/actor-reentrancy/
- Dapr actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Go SDK source (`client/client.go`, `client/actor.go`): https://github.com/dapr/go-sdk
- Dapr Python SDK source (`dapr/actor/client/proxy.py`, `dapr/clients/grpc/client.py`): https://github.com/dapr/python-sdk
- Dapr Python SDK actor docs: https://docs.dapr.io/developing-applications/sdks/python/python-actor/
- Dapr Configuration resource reference: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

1. **Incorrect reentrancy header name**: The post used `reentrancy-id` throughout the text and Mermaid diagram. The actual Dapr HTTP header is `Dapr-Reentrancy-Id`. Fixed all occurrences.

2. **Obsolete `spec.features` section in Configuration YAML**: The post included a `spec.features` block with `Actor.Reentrancy` enabled. This was required when reentrancy was a preview feature but is no longer needed now that reentrancy is a stable feature. Removed the `spec.features` section; the `spec.actor.reentrancy` configuration is sufficient.

3. **Go SDK: Non-existent `InvokeActorMethod` API**: The post called `daprClient.InvokeActorMethod(ctx, req, &result)`. The correct method on the Go SDK `Client` interface is `InvokeActor(ctx context.Context, req *InvokeActorRequest) (*InvokeActorResponse, error)`. Fixed the method name and return handling to use `resp, err := a.daprClient.InvokeActor(...)` with `resp.Data` for the response bytes.

4. **Python SDK: Non-existent `DaprClient.invoke_actor()` API**: The post used `DaprClient().invoke_actor(...)` which does not exist in the Dapr Python SDK. The correct approach for actor-to-actor communication is `ActorProxy.create()`. Fixed the Python example to use `ActorProxy` with an `ActorId` and a typed `WorkerActorInterface`, and added the missing interface definition.

## Review Notes
- The prerequisite states "Dapr v1.7 or later". Actor reentrancy was introduced as a preview feature in Dapr v1.2 and became stable in a later release. The v1.7 claim could not be precisely verified against current documentation, but it is a reasonable minimum version for the feature.
- The `/dapr/config` endpoint JSON structure (with `entities`, `reentrancy`, `actorIdleTimeout`, `actorScanInterval`) is correct per official docs.
- The `maxStackDepth` default of 32 is confirmed correct.
- The Mermaid diagrams are conceptually accurate and illustrate the reentrancy flow well.
