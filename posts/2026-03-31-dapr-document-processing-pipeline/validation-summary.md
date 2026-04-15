# Validation Summary: How to Build a Document Processing Pipeline with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, state management, actors)
- Python with FastAPI and Dapr Python SDK
- Go with Dapr Go SDK
- C# / .NET with Dapr .NET SDK and Dapr Actors

## Sources Consulted
- Dapr Go SDK source and documentation — `TopicEvent` type location in `service/common` package (https://docs.dapr.io/developing-applications/sdks/go/)
- Dapr .NET Actor SDK — `IActorStateManager` interface methods (https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/)
- Dapr Python SDK — `DaprClient.publish_event` and `save_state` method signatures (https://docs.dapr.io/developing-applications/sdks/python/)
- Dapr pub/sub building block documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Dapr state management building block documentation (https://docs.dapr.io/developing-applications/building-blocks/state-management/)

## Issues Found

### Issue 1: Go SDK — incorrect `TopicEvent` import and type reference
- **What was wrong:** The Go extraction service imported `daprd "github.com/dapr/go-sdk/service/http"` and referenced `*daprd.TopicEvent`. The `TopicEvent` type is defined in `github.com/dapr/go-sdk/service/common`, not in `service/http`. Using `daprd.TopicEvent` would cause a compilation error.
- **What was changed:** Changed the import to `"github.com/dapr/go-sdk/service/common"` and updated the handler signature to use `*common.TopicEvent`.
- **Why:** The Dapr Go SDK defines shared types (`TopicEvent`, `TopicEventHandler`, etc.) in the `service/common` package. The `service/http` package provides the HTTP service implementation but does not re-export these types.

### Issue 2: C# Actor — non-existent `GetOrAddStateAsync` method
- **What was wrong:** The `DocumentJobActor` used `StateManager.GetOrAddStateAsync("job", new DocumentJob())`. The `IActorStateManager` interface in the Dapr .NET Actor SDK does not have a `GetOrAddStateAsync` method. This would fail to compile.
- **What was changed:** Replaced with `TryGetStateAsync<DocumentJob>("job")` followed by a conditional check: `var job = result.HasValue ? result.Value : new DocumentJob();`.
- **Why:** The Dapr Actor `IActorStateManager` provides `TryGetStateAsync` (returns `ConditionalValue<T>`), `GetStateAsync`, `AddStateAsync`, `SetStateAsync`, and `ContainsStateAsync`, but not `GetOrAddStateAsync`. The `TryGetStateAsync` + conditional pattern achieves the intended get-or-create behavior.

## Review Notes
- The Python upload service places `import base64` inside the function body rather than at the top of the file. This is a style choice (not a bug) but is unconventional.
- The Go code omits error handling on `json.Unmarshal`, `dapr.NewClient()`, `GetState`, and `SaveState` calls. While acceptable for a tutorial focusing on the pipeline pattern, production code should handle these errors.
- Helper functions referenced in the code (`extractText`, `extractMetadata`, `splitWords`, `detectLanguage`, `updateJobStatus`, `NormalizeText`, `ChunkText`, `GenerateEmbeddingsAsync`, etc.) are not defined in the snippets. This is expected for a tutorial that focuses on the Dapr integration pattern.
- The C# transformation service uses `CloudEvent<DocExtractedEvent>` as the parameter type. When using `app.UseCloudEvents()` middleware with Dapr, the CloudEvent envelope is automatically unwrapped, so typically the parameter would just be `DocExtractedEvent`. However, this depends on middleware configuration and is not strictly incorrect.
