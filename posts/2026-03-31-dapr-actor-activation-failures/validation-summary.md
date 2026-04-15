# Validation Summary: How to Fix Dapr Actor Activation Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model)
- Dapr Placement Service
- Dapr State Store (Redis)
- Dapr Python SDK (`dapr-ext-grpc` / `dapr` package)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Kubernetes (kubectl commands)
- Dapr HTTP API

## Sources Consulted
- Dapr Helm chart source code (`dapr/dapr` GitHub repository, `charts/dapr/charts/dapr_placement/` templates) — verified StatefulSet name, pod labels, and ports
- Dapr Go SDK source code (`dapr/go-sdk` GitHub repository) — verified `RegisterActorImplFactoryContext`, `actor.ServerContext`, and `actor.Factory` types in `service/common/service.go` and `actor/actor.go`
- Dapr Python SDK source code (`dapr/python-sdk` GitHub repository) — verified `ActorRuntimeConfig`, `ActorTypeConfig`, `ActorRuntime.set_actor_config()` in `dapr/actor/runtime/config.py` and `dapr/actor/runtime/runtime.py`
- Dapr placement service source code (`cmd/placement/options/options.go`) — verified default port 50005
- Dapr official documentation on actor state store configuration (`actorStateStore` metadata field)

## Issues Found

1. **Incorrect placement service pod label** (line 31): The `kubectl logs` command used `-l app=dapr-placement`, but the Dapr Helm chart sets the pod label to `app: dapr-placement-server`. Changed to `-l app=dapr-placement-server`.

2. **Missing Python import for `ActorTypeConfig`** (line 86): The Python code snippet used `ActorTypeConfig` without importing it. Added `ActorTypeConfig` to the import from `dapr.actor.runtime.config`.

3. **Incorrect Go SDK actor registration API** (lines 98-101): The Go code used `server.RegisterActorImplFactory(func() runtime.Actor { ... })`, which has two problems: (a) `RegisterActorImplFactory` is deprecated in favor of `RegisterActorImplFactoryContext`, and (b) `runtime.Actor` does not exist in the Dapr Go SDK — the correct return type is `actor.ServerContext` from `github.com/dapr/go-sdk/actor`. Changed to `s.RegisterActorImplFactoryContext(func() actor.ServerContext { ... })`.

## Review Notes
- The `OnActivateAsync` callback mentioned in the "How Actor Activation Works" section uses .NET naming convention. This is acceptable since the section describes the general concept, not a language-specific implementation.
- The Go code snippet is minimal and doesn't show imports or the actor struct definition. Readers will need to know that `MyActor` must embed `actor.ServerImplBaseCtx` and implement `Type() string` to satisfy the `actor.ServerContext` interface.
- The Dapr HTTP API endpoint format (`v1.0/actors/{actorType}/{actorId}/method/{methodName}`) used in the curl example is correct.
- The state store YAML configuration with `actorStateStore: "true"` metadata is correct and required for actor state persistence.
- The placement service port 50005 and DNS name `dapr-placement-server.dapr-system` are both correct for default Helm installations.
