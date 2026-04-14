# Validation Summary: How to Handle Large Payloads in Dapr Service Invocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, state management, configuration)
- Dapr .NET SDK (DaprClient)
- Dapr Go SDK (github.com/dapr/go-sdk/client)
- Dapr JavaScript SDK (@dapr/dapr)
- C#, Go, Node.js
- gRPC, HTTP
- gzip compression

## Sources Consulted
- Dapr Go SDK source and API docs: https://pkg.go.dev/github.com/dapr/go-sdk/client — verified `InvokeMethodWithContent` signature (4th param is HTTP verb, not content type)
- Dapr JavaScript SDK (@dapr/dapr) GitHub and npm docs — verified `state.save`, `state.get`, `invoker.invoke`, and `state.delete` signatures
- Dapr Configuration reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/ — confirmed no `spec.api.grpc.maxRequestBodySize` field exists
- Dapr docs on increasing request size: https://docs.dapr.io/operations/configuration/increase-request-size/ — confirmed annotation-based and CLI-flag approach
- Dapr runtime source (pkg/runtime/config.go) — confirmed 4MB default max request body size

## Issues Found

1. **Go SDK `InvokeMethodWithContent` verb parameter (lines 102, 121):** The 4th argument was `"application/json"` but this parameter expects an HTTP verb (e.g., `"post"`). The content type is specified inside the `DataContent` struct. Fixed both calls to use `"post"`.

2. **Node.js SDK state save TTL metadata format (line 143-144):** TTL metadata was nested as `options: { metadata: { ttlInSeconds: '300' } }` on the state item. The `@dapr/dapr` SDK expects `metadata: { ttlInSeconds: '300' }` directly on the item — there is no `options` wrapper. Removed the `options` nesting.

3. **Node.js SDK `state.get()` return type (line 161):** The original code used array destructuring `const [stateItem] = await daprClient.state.get(...)`. The `state.get()` method returns a single value, not an array. Fixed to `const largePayload = await daprClient.state.get(...)`.

4. **Node.js SDK `invoker.invoke` HTTP method (line 149):** Used string literal `'POST'` instead of the SDK's `HttpMethod.POST` enum. Fixed to use `HttpMethod.POST` and added the import.

5. **Dapr Configuration YAML for max message size (lines 170-181):** The entire YAML block used fabricated fields (`spec.api.grpc.maxRequestBodySize` / `maxResponseBodySize`) that do not exist in the Dapr Configuration CRD. The correct approach is a Kubernetes annotation (`dapr.io/max-body-size: "16Mi"`) or CLI flag (`--max-body-size`). Replaced the YAML with both the annotation and CLI examples.

6. **Introduction claimed "four strategies" but only three were listed:** The post describes three strategies (chunking, compression, reference pattern) plus a configuration option. Fixed the intro text to say "three strategies" plus a configuration option. Also removed "Streaming" from tags and description since no streaming content exists in the post.

## Review Notes
- The C# chunked transfer example (Strategy 1) is conceptually sound and uses correct `DaprClient.InvokeMethodAsync` API signatures.
- The `SplitIntoChunks` helper using LINQ `Skip`/`Take` on byte arrays is functional but not memory-efficient for very large payloads. This is a style choice, not a bug.
- The receiver-side code in the Node.js example uses `daprClient` (a different variable name than the sender's `client`), which is fine since it's in a different scope, but could be confusing for readers.
