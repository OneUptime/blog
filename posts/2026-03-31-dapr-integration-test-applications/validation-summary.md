# Validation Summary: How to Integration Test Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, state management, pub/sub)
- Dapr CLI (`dapr run`)
- Dapr .NET SDK (`DaprClient`, `DaprClientBuilder`)
- In-memory Dapr components (`state.in-memory`, `pubsub.in-memory`)
- C# / .NET (xUnit test framework)
- Docker (mentioned in tags)

## Sources Consulted
- Dapr CLI reference documentation (https://docs.dapr.io/reference/cli/dapr-run/)
- Dapr component spec reference for state stores (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/)
- Dapr component spec reference for pub/sub (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-inmemory/)
- Dapr .NET SDK documentation (https://docs.dapr.io/developing-applications/sdks/dotnet/)
- Dapr component YAML schema (https://docs.dapr.io/operations/components/component-schema/)
- Cross-referenced with validated Dapr blog posts in this repository (dapr-run-command, dapr-testcontainers, dapr-test-event-driven-systems, dapr-dotnet-sdk-install-configure)

## Issues Found
1. **`--components-path` flag is deprecated**: The `dapr run` command in the bash script used `--components-path`, which was renamed to `--resources-path` starting in Dapr CLI v1.11. Changed `--components-path` to `--resources-path` in the bash example. Also updated the summary paragraph to say "test resources directory" instead of "test components" for consistency.

## Review Notes
- The `apiVersion: dapr.io/v1alpha1` is still current for Dapr Component resources.
- `state.in-memory` and `pubsub.in-memory` are valid built-in Dapr component types suitable for testing.
- `DaprClientBuilder().UseHttpEndpoint()` is a valid API call. The Dapr .NET SDK primarily uses gRPC, but `UseHttpEndpoint` is correct when connecting to the Dapr HTTP API (port 3500).
- `DaprClient.GetStateAsync<T>(storeName, key)` signature is correct.
- The xUnit test patterns (`IClassFixture`, `[Collection]`, `[Fact]`, `[Trait]`) are all correct.
- The `dotnet test --filter "Category=Integration"` filter matches the `[Trait("Category", "Integration")]` attribute correctly.
- The pub/sub test example uses a polling pattern (`Task.Delay(500)`) which the post correctly notes should use a timeout in real tests. This is an acceptable simplification for a tutorial.
- Default Dapr HTTP port 3500 is confirmed correct.
