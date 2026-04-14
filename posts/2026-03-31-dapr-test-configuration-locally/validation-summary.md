# Validation Summary: How to Test Dapr Configuration Locally

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Configuration API, CLI, Multi-App Run)
- Redis (as configuration store backend)
- Node.js / JavaScript (Dapr JS SDK `@dapr/dapr`)
- YAML (component and multi-app run configuration)

## Sources Consulted
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Redis Configuration store component: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr Configuration building block overview: https://docs.dapr.io/developing-applications/building-blocks/configuration/
- Dapr Configuration quickstart: https://docs.dapr.io/getting-started/quickstarts/configuration-quickstart/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Multi-App Run: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/

## Issues Found

1. **Incorrect claim about `dapr init` creating a default configuration store**: The post stated that `dapr init` "starts a local Redis instance that serves as the default configuration store." In reality, `dapr init` creates default components for state store and pub/sub only -- not a configuration store. Fixed to clarify that the configuration component must be created separately.

2. **Wrong Redis key format for seeding configuration data**: The post used `appconfig||feature-x` as the key and a JSON object as the value. The correct Dapr Redis configuration store format uses plain key names (e.g., `feature-x`) with values in `value||version` format (e.g., `true||1`). Fixed both the MSET and SET commands.

3. **Incorrect HTTP API response format**: The post showed the GET configuration response wrapped in an `"items"` object with `"version"` fields. The actual GET response has no `"items"` wrapper -- keys appear at the top level, and the version field is not included in the GET response. Fixed the expected response JSON.

4. **Deprecated `--components-path` CLI flag**: The post used `--components-path` which is deprecated in favor of `--resources-path`. Updated to use the current flag.

5. **Incorrect subscription unsubscribe method**: The post used `subscription.unsubscribe()` to stop watching configuration changes. The correct method on the returned stream object is `stream.stop()`. Fixed the variable name and method call.

6. **Deprecated `resourcesPath` field in multi-app run YAML**: The post used `resourcesPath` (singular) which is deprecated. Updated to `resourcesPaths` (plural) with array syntax.

## Review Notes
- The `configuration.redis` component type and its metadata fields (`redisHost`, `redisPassword`) are correct.
- The HTTP API endpoint path and query parameter format are correct.
- The JS SDK method `client.configuration.subscribeWithKeys()` is the correct method name and signature.
- The multi-app run YAML field names `appID`, `appDirPath`, `appPort`, and `command` are all correct.
