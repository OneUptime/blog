# Validation Summary: How to Use Feature Flags with Dapr Configuration API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API
- Redis (as configuration store backend)
- TypeScript / Node.js with `@dapr/dapr` SDK
- Python with `httpx` (HTTP client)
- Python `hashlib` for consistent hashing
- Prometheus client library for Python (`prometheus_client`)

## Sources Consulted
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Configuration API building block: https://docs.dapr.io/developing-applications/building-blocks/configuration/
- Dapr JavaScript SDK source (GitHub `dapr/js-sdk`): configuration client types and methods
- Dapr Configuration API quickstart: https://docs.dapr.io/getting-started/quickstarts/configuration-quickstart/
- Dapr Redis configuration store component: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr state management key format documentation (for verifying `||` separator scope)

## Issues Found

### 1. Incorrect Redis key format with `myapp||` prefix
**What was wrong:** All `redis-cli SET` commands used the `myapp||` prefix (e.g., `myapp||ff.new-checkout-flow`). The `<app-id>||<key>` format is a Dapr **state store** convention, not a configuration store convention. The Redis configuration store component stores and retrieves keys as plain Redis keys without any prefix or separator.

**What was changed:** Removed the `myapp||` prefix from all Redis key names in the "Setting Up Feature Flags in Redis" and "Enabling Flags at Runtime" sections (e.g., `myapp||ff.new-checkout-flow` became `ff.new-checkout-flow`).

**Why:** The Dapr configuration store Redis component does a direct `GET`/`SET` on the key name. Using the state store `||` convention would cause the configuration API to fail to find the keys.

### 2. Outdated HTTP API version path (`v1.0-alpha1`)
**What was wrong:** The Python code used `v1.0-alpha1` in the HTTP endpoint path: `http://localhost:3500/v1.0-alpha1/configuration/appconfig`.

**What was changed:** Updated to the stable `v1.0` path: `http://localhost:3500/v1.0/configuration/appconfig`.

**Why:** The Configuration API has been promoted to stable (`v1.0`) in recent Dapr releases. Using the alpha path may not work on newer Dapr runtimes.

### 3. Incorrect HTTP response parsing (extra `items` wrapper)
**What was wrong:** The Python code parsed the HTTP response as `resp.json().get("items", {})`, expecting the response to be wrapped in an `items` key. The Dapr Configuration HTTP API returns keys directly at the top level (e.g., `{"ff.key": {"value": "..."}}`), not wrapped in `items`.

**What was changed:** Changed `items = resp.json().get("items", {})` to `data = resp.json()` and updated the subsequent line to use `data` instead of `items`.

**Why:** The `items` wrapper is a convention of the Dapr JavaScript SDK's response type, not the raw HTTP API response. The HTTP API returns configuration keys as top-level properties in the JSON response.

## Review Notes
- The TypeScript code using the `@dapr/dapr` SDK correctly accesses `config.items` because the JS SDK wraps the response in a `GetConfigurationResponse` type with an `items` property. This is correct at the SDK level.
- The Dapr JS SDK Configuration API only works over gRPC, not HTTP. The blog uses `new DaprClient()` which defaults to gRPC, so this works correctly, but readers should be aware that the Configuration API is not available over HTTP in the JS SDK.
- The `subscribeWithKeys` method signature and callback shape in the TypeScript example are correct per the SDK source code.
- The consistent hashing approach using MD5 for percentage-based rollout is a valid technique, though MD5 is not cryptographically secure. For feature flag bucketing purposes (not security), this is acceptable.
- The Prometheus monitoring example is syntactically correct and follows standard `prometheus_client` patterns.
