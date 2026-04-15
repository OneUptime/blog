# Validation Summary: How to Use Dapr Configuration with Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration building block
- @dapr/dapr Node.js SDK (v3.x)
- Redis as a configuration store
- Express.js middleware integration
- Node.js

## Sources Consulted
- Dapr JavaScript Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Configuration Quickstart: https://docs.dapr.io/getting-started/quickstarts/configuration-quickstart/
- Redis Configuration Store component reference: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- @dapr/dapr npm package (v3.6.1) type definitions and source code
- Dapr JS SDK GitHub repository: https://github.com/dapr/js-sdk
- Dapr Quickstarts - Configuration JavaScript SDK: https://github.com/dapr/quickstarts/tree/master/configuration/javascript/sdk

## Issues Found

### 1. DaprClient constructor: host included protocol prefix
- **What was wrong:** `daprHost` was set to `"http://localhost"`. The SDK expects a bare hostname without a protocol prefix; the default is `"127.0.0.1"`.
- **What was changed:** Changed `"http://localhost"` to `"127.0.0.1"`.

### 2. DaprClient constructor: missing gRPC communication protocol
- **What was wrong:** The Configuration API in the Dapr JS SDK is only implemented for the gRPC transport. The HTTP client throws `HTTPNotSupportedError` for all configuration methods (`get`, `subscribe`, `subscribeWithKeys`, `subscribeWithMetadata`). Since the SDK defaults to HTTP, the code as written would fail at runtime.
- **What was changed:** Added `CommunicationProtocolEnum` to the import and set `communicationProtocol: CommunicationProtocolEnum.GRPC` in the constructor options.

### 3. subscribeWithKeys return value incorrectly destructured
- **What was wrong:** The code destructured `{ subscriptionId }` from the return value of `subscribeWithKeys`. The method actually returns a `SubscribeConfigurationStream` object with a `stop()` method, not an object with a `subscriptionId` property.
- **What was changed:** Changed to `const stream = await client.configuration.subscribeWithKeys(...)` throughout all code examples.

### 4. Subscribe callback should be async
- **What was wrong:** The callback passed to `subscribeWithKeys` was a synchronous function. The SDK types define the callback as `(res: SubscribeConfigurationResponse) => Promise<void>`.
- **What was changed:** Made the callback `async`.

### 5. Nonexistent unsubscribe method used
- **What was wrong:** The code called `client.configuration.unsubscribe("configstore", subscriptionId)`. There is no `unsubscribe` method on the configuration client interface. To stop receiving updates, you call `stop()` on the stream object returned by `subscribeWithKeys`.
- **What was changed:** Replaced the `stopWatching` function body with `stream.stop()` and updated all references from `subscriptionId` to `stream`.

## Review Notes
- The Configuration API in the Dapr JS SDK only supports gRPC transport. This is a critical detail that readers must be aware of, especially if they are using HTTP for other Dapr building blocks. The fix adds this requirement explicitly via the constructor option.
- The Redis configuration store component YAML is correct and matches official documentation.
- The `configuration.get()` method call and response shape (`config.items[key].value`) are correct.
- The Express.js integration patterns shown are reasonable and idiomatic.
