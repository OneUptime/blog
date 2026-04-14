# Validation Summary: How to Use Dapr JavaScript Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js
- DaprServer (HTTP/gRPC server for sidecar communication)
- Dapr Pub/Sub API
- Dapr Service Invocation API
- Dapr Input Bindings API

## Sources Consulted
- Dapr JavaScript SDK official docs: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr JS SDK GitHub repository: https://github.com/dapr/js-sdk
- DaprServer source code: https://github.com/dapr/js-sdk/blob/main/src/implementation/Server/DaprServer.ts
- DaprClientOptions type definition: https://github.com/dapr/js-sdk/blob/main/src/types/DaprClientOptions.ts
- DaprServerOptions type definition: https://github.com/dapr/js-sdk/blob/main/src/types/DaprServerOptions.ts
- IServerPubSub interface: https://github.com/dapr/js-sdk/blob/main/src/interfaces/Server/IServerPubSub.ts
- PubSubSubscriptionOptionsType: https://github.com/dapr/js-sdk/blob/main/src/types/pubsub/PubSubSubscriptionOptions.type.ts
- IServerInvoker interface: https://github.com/dapr/js-sdk/blob/main/src/interfaces/Server/IServerInvoker.ts
- InvokerListenOptionsType: https://github.com/dapr/js-sdk/blob/main/src/types/InvokerListenOptions.type.ts
- IServerBinding interface: https://github.com/dapr/js-sdk/blob/main/src/interfaces/Server/IServerBinding.ts

## Issues Found

### 1. Incorrect `daprHost` value in DaprServer constructor
- **What was wrong:** `daprHost` was set to `"http://localhost"`, which includes a protocol prefix. The SDK expects a plain hostname or IP address; the protocol is determined separately via `CommunicationProtocolEnum`.
- **What was changed:** Changed `daprHost: "http://localhost"` to `daprHost: "127.0.0.1"`.
- **Why:** The SDK default for `daprHost` is `"127.0.0.1"`. Including `http://` would cause connection issues since the SDK constructs the full URL internally.

### 2. Wrong property name in `subscribeWithOptions` callback
- **What was wrong:** The callback property was named `handler` in the options object passed to `subscribeWithOptions`.
- **What was changed:** Changed `handler:` to `callback:`.
- **Why:** The `PubSubSubscriptionOptionsType` interface defines the property as `callback`, not `handler`. Using `handler` would be silently ignored, and no messages would be processed.

### 3. Incorrect `HttpMethod` values in service invocation listener
- **What was wrong:** String literals `"GET"` and `"POST"` were passed as the `method` option in `server.invoker.listen()`.
- **What was changed:** Replaced `{ method: "GET" }` with `{ method: HttpMethod.GET }` and `{ method: "POST" }` with `{ method: HttpMethod.POST }`. Added `HttpMethod` to the initial import from `@dapr/dapr`.
- **Why:** The `HttpMethod` enum values are lowercase strings (e.g., `"get"`, `"post"`). Passing uppercase string literals may not match correctly. Using the SDK-provided enum is the idiomatic and reliable approach.

## Review Notes
- The `CommunicationProtocolEnum` is imported in the setup code but never used in any example. It could be used to explicitly set the communication protocol (HTTP vs gRPC), but its omission from subsequent examples is not technically incorrect.
- The pub/sub callback signature actually accepts two parameters `(data, headers)` — omitting `headers` works fine but readers should be aware it's available.
- For the routing-based subscription (`subscribeWithOptions`), the official docs also show a pattern using `server.pubsub.subscribeToRoute()` to register per-route handlers. The approach shown in the post (single callback) is valid but won't differentiate by route path.
