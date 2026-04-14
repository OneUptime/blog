# Validation Summary: How to Build Microservices with Dapr and Express.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Express.js
- Node.js
- @dapr/dapr JavaScript SDK (DaprClient, DaprServer)
- Dapr state management API
- Dapr pub/sub messaging API

## Sources Consulted
- Dapr JavaScript Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JavaScript Server SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- @dapr/dapr npm package: https://www.npmjs.com/package/@dapr/dapr
- Dapr pub/sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr CLI reference: https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **`daprHost` included protocol prefix** — In two code blocks (`src/app.js` and `src/subscriber.js`), `daprHost` was set to `"http://localhost"`. The Dapr JS SDK expects just the hostname without a protocol prefix (e.g., `"127.0.0.1"` or `"localhost"`). Fixed both occurrences to use `"127.0.0.1"`.

2. **Unused `DaprServer` import in `app.js`** — The `src/app.js` code block imported `{ DaprServer, DaprClient }` from `@dapr/dapr`, but `DaprServer` was never used in that file. Removed the unused import, leaving only `{ DaprClient }`.

3. **`processOrder` function called but never defined** — In `src/subscriber.js`, the subscription callback called `await processOrder(data)`, but the function was never defined, which would cause a `ReferenceError` at runtime. Added a stub `processOrder` function to make the example complete and runnable.

## Review Notes
- All Dapr SDK API method signatures (`state.save`, `state.get`, `pubsub.publish`, `pubsub.subscribe`, `server.start`) are correct and current.
- The `dapr run` CLI command uses correct flags and syntax.
- The project structure and separation of concerns (Express for HTTP, Dapr for distributed primitives) is well presented.
- The `subscribe` callback in the SDK also receives an optional second `headers` parameter, which the post omits for simplicity — this is fine for an introductory tutorial.
