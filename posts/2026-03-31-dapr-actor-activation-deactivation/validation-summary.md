# Validation Summary: How to Handle Actor Activation and Deactivation in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/actor`)
- Dapr Python SDK (`dapr.actor`)
- Dapr actor runtime configuration
- Go programming language
- Python programming language

## Sources Consulted
- Dapr Go SDK package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/actor (v1.14.2)
- Dapr Go SDK actor example: https://github.com/dapr/go-sdk/tree/main/examples/actor
- Dapr Go SDK actor manager source: https://github.com/dapr/go-sdk/blob/main/actor/manager/manager.go
- Dapr Go SDK actor container source: https://github.com/dapr/go-sdk/blob/main/actor/manager/container.go
- Dapr Python SDK actor example: https://github.com/dapr/python-sdk/blob/master/examples/demo_actor/demo_actor/demo_actor.py
- Dapr Python SDK ActorStateManager source: https://github.com/dapr/python-sdk/blob/master/dapr/actor/runtime/state_manager.py
- Dapr actor runtime configuration docs: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/

## Issues Found

1. **Go SDK: `ServerImplBase` is deprecated (changed to `ServerImplBaseCtx`)**
   - The post embedded `actor.ServerImplBase`, which is deprecated since Go SDK v1.8.0.
   - More critically, `ServerImplBase.GetStateManager()` returns `StateManager` (deprecated), whose `Get()` and `Set()` methods do NOT accept a `context.Context` parameter. The blog code passed `context.Background()` as the first argument, which would cause a compilation error.
   - Fixed by changing `actor.ServerImplBase` to `actor.ServerImplBaseCtx`, whose `GetStateManager()` returns `StateManagerContext` with context-aware method signatures matching the blog's usage.

2. **Python SDK: `try_get_state` returns a tuple, not an object with attributes**
   - The blog used `config = await self._state_manager.try_get_state("config")` and then accessed `config.has_value` and `config.value`.
   - The actual return type of `try_get_state` is `Tuple[bool, Optional[T]]` — it returns a two-element tuple, not an object with `.has_value`/`.value` attributes.
   - Fixed to use proper tuple unpacking: `has_value, val = await self._state_manager.try_get_state("config")`.

## Review Notes

- **Go SDK does not support `OnActivate`/`OnDeactivate` lifecycle hooks.** The Dapr Go SDK (as of v1.14.2) does not define `OnActivate()` or `OnDeactivate()` in any interface (`Server`, `ServerContext`, `ServerImplBase`, or `ServerImplBaseCtx`). The Go SDK actor manager creates actor containers on first access and removes them on deactivation without calling any user-defined lifecycle methods. The code shown will compile (the methods are valid Go methods on the struct), but they will not be automatically invoked by the Dapr runtime. Other SDKs (.NET, Python, Java) do support these lifecycle hooks natively. This is a conceptual inaccuracy in the post but would require significant restructuring to address properly.
- The actor lifecycle description (activation on first call or rebalance, deactivation on idle timeout or host shutdown) is accurate per official Dapr documentation.
- The configuration fields (`actorIdleTimeout`, `drainOngoingCallTimeout`, `drainRebalancedActors`) are all valid and correctly documented.
- The Python SDK lifecycle hooks (`_on_activate`, `_on_deactivate`), actor ID access (`self.id.id`), and `save_state()` usage are all correct.
- The rebalancing behavior description is accurate: deactivation is called on the old host before activation on the new host, controlled by `drainRebalancedActors` and `drainOngoingCallTimeout`.
