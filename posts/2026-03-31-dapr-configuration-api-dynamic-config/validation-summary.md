# Validation Summary: How to Use Dapr Configuration API for Dynamic Config

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Configuration building block)
- Dapr Configuration API (HTTP and gRPC)
- Redis (as configuration store backend)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- Kubernetes (for component deployment)

## Sources Consulted
- Dapr Configuration API Reference — https://docs.dapr.io/reference/api/configuration_api/
- Dapr How-To: Manage configuration from a store — https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr Alpha and Beta APIs listing — https://docs.dapr.io/operations/support/alpha-beta-apis/
- Dapr Go SDK client package — https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Python SDK source (client.py) — https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr v1.11.0 Release Notes — https://github.com/dapr/dapr/releases/tag/v1.11.0
- Dapr v1.5.0 Release Notes (Configuration API introduction) — https://github.com/dapr/dapr/blob/release-1.5/docs/release_notes/v1.5.0.md

## Issues Found

1. **Incorrect API stability claim (Prerequisites)**: The post stated "Configuration API is alpha as of Dapr 1.12". The Configuration API graduated to stable in Dapr v1.11. Changed to "Configuration API became stable in Dapr 1.11" and updated the minimum version from v1.7 to v1.11.

2. **Incorrect endpoint in Mermaid diagram**: The diagram showed the key as a path segment (`/v1.0/configuration/{store}/{key}`). The key is actually a query parameter. Fixed to `/v1.0/configuration/{store}?key={key}`.

3. **Outdated alpha subscribe endpoint in diagram**: The subscribe endpoint in the diagram used `/v1.0-alpha1/`. Updated to `/v1.0/` to reflect the stable API.

4. **Incorrect Redis key format (Step 2)**: The post used the format `redis-cli SET "{keyName}||version||{version}" '{value}'`, putting the version in the key name. The correct Dapr Redis configuration format stores the key name as-is and uses the value format `{value}||{version}`. Fixed all `redis-cli` commands to use `MSET` with the correct `{value}||{version}` format.

5. **Outdated subscribe HTTP endpoint (Step 5)**: Used `v1.0-alpha1` in the subscribe curl command. Updated to `v1.0` since the API is now stable.

6. **Incorrect Go SDK subscribe pattern (Step 5)**: The post used a channel-based pattern (`sub.DataChannel()`, `sub.ErrorChannel()`) that does not exist. The Go SDK's `SubscribeConfigurationItems` takes a callback handler function and returns a subscription ID string. Rewrote the example to use the correct callback pattern.

7. **Incorrect Python SDK subscribe pattern (Step 5)**: The post showed iterating over the subscription result with a `for` loop. The Python SDK's `subscribe_configuration` also takes a handler callback and returns a subscription ID. Rewrote the example to use the correct callback pattern.

8. **Outdated unsubscribe HTTP endpoint**: Used `v1.0-alpha1` in the unsubscribe curl command. Updated to `v1.0`.

9. **Outdated Redis update command (Updating Configuration section)**: The update example also used the incorrect key format. Fixed to use the correct `{value}||{version}` format.

## Review Notes
- The `configuration.redis` component YAML is correct and matches current Dapr component specs.
- The HTTP GET endpoint for reading configuration and the Go SDK `GetConfigurationItem` call are correct.
- The Python SDK `get_configuration` call is correct.
- The response JSON format shown for the read endpoint is accurate.
- The unsubscribe HTTP method (GET) is correct per Dapr docs, though unconventional for a state-changing operation.
