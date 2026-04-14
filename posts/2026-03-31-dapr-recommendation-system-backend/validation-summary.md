# Validation Summary: How to Build a Recommendation System Backend with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (building blocks: Pub/Sub, State Management, Actors, Service Invocation)
- Python with FastAPI and Dapr Python SDK (`dapr-ext-fastapi`, `dapr`)
- C# with Dapr .NET SDK (Actors)
- Go with Dapr Go SDK (`go-sdk/client`, `go-sdk/service/common`)
- Node.js with Dapr JavaScript SDK (`@dapr/dapr`) and Express

## Sources Consulted
- Dapr Python SDK source code and documentation (https://github.com/dapr/python-sdk)
- Dapr .NET SDK source code and documentation (https://github.com/dapr/dotnet-sdk)
- Dapr Go SDK source code and documentation (https://github.com/dapr/go-sdk)
- Dapr JavaScript SDK source code and documentation (https://github.com/dapr/js-sdk)

## Issues Found

### 1. Python: `publish_event` does not accept a dict as the `data` argument
- **What was wrong:** `client.publish_event("pubsub", "user-interaction", event)` passed a Python dict directly as the `data` parameter. The Dapr Python SDK `publish_event` method only accepts `bytes` or `str`, and raises a `ValueError` for other types.
- **What was changed:** Wrapped the `event` dict with `json.dumps(event)` and added `data_content_type="application/json"` for both `publish_event` calls.
- **Why:** The SDK explicitly validates the `data` type and rejects dicts. JSON serialization is required.

### 2. Go: `InvocationEvent` and `Content` types imported from wrong package
- **What was wrong:** The code imported `daprd "github.com/dapr/go-sdk/service/http"` and used `daprd.InvocationEvent` and `daprd.Content`. These types are defined in `github.com/dapr/go-sdk/service/common`, not `service/http`, so the code would not compile.
- **What was changed:** Changed the import to `common "github.com/dapr/go-sdk/service/common"` and updated type references to `common.InvocationEvent` and `common.Content`.
- **Why:** Go does not re-export types across packages. The types must be referenced from their defining package.

### 3. Go: Unused `"sort"` import
- **What was wrong:** The `"sort"` package was imported but never used. Go treats unused imports as compilation errors.
- **What was changed:** Removed the `"sort"` import.
- **Why:** Go will refuse to compile code with unused imports.

### 4. JavaScript: `client.state.get()` return value incorrectly destructured as array
- **What was wrong:** `const [cached] = await client.state.get(...)` used array destructuring. The Dapr JS SDK `state.get()` returns a single value (parsed object or string), not an array.
- **What was changed:** Changed to `const cached = await client.state.get(...)`.
- **Why:** Array destructuring on a non-array would yield `undefined`, breaking the cache check logic.

### 5. JavaScript: String literal `'POST'` instead of `HttpMethod.POST` enum
- **What was wrong:** `client.invoker.invoke(...)` was called with the string `'POST'` (uppercase). The Dapr JS SDK `HttpMethod` enum uses lowercase values (`"post"`).
- **What was changed:** Added `HttpMethod` to the import and replaced `'POST'` with `HttpMethod.POST` in both invocation calls.
- **Why:** Using the enum ensures type correctness and matches the SDK's expected values.

### 6. JavaScript: TTL metadata nested incorrectly inside `options`
- **What was wrong:** TTL was specified as `options: { metadata: { ttlInSeconds: '300' } }`. In the Dapr JS SDK, the `options` field on a state object is for concurrency/consistency settings only. TTL metadata belongs in the top-level `metadata` field.
- **What was changed:** Moved `ttlInSeconds` from `options.metadata` to a top-level `metadata` field on the state object.
- **Why:** The SDK's `KeyValuePairType` defines `metadata` at the top level for per-item metadata like TTL, while `options` is typed as `IStateOptions` (concurrency/consistency only).

## Review Notes
- The C# Actor code is correct in its API usage. One minor observation: the `UserProfileActor` class would need a constructor accepting `ActorHost` (e.g., `public UserProfileActor(ActorHost host) : base(host) { }`), but this is a reasonable omission in a blog snippet focused on the actor logic.
- The Go code references a helper function `getTopCategories(profile)` that is not defined in the snippet. This is acceptable for a blog post showing partial implementation.
- The JavaScript code references an `isCacheStale()` function that is not defined. Also acceptable as a blog convention for brevity.
