# Validation Summary: How to Use Testcontainers with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Testcontainers for .NET (3.6.0)
- Testcontainers for Java (1.19.0)
- Dapr (1.14) — sidecar, placement service, state store components
- Docker (container networking, images)
- Redis (state store backing service)
- xUnit (test framework)
- Dapr .NET SDK (DaprClient)

## Sources Consulted
- Testcontainers for .NET source code and API docs — https://dotnet.testcontainers.org/api/create_docker_network/
- testcontainers-dotnet GitHub repository — https://github.com/testcontainers/testcontainers-dotnet
- Dapr self-hosted with Docker docs — https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr Redis state store reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr .NET SDK source (DaprClientBuilder) — https://github.com/dapr/dotnet-sdk
- Microsoft docs on selective unit tests — https://learn.microsoft.com/en-us/dotnet/core/testing/selective-unit-tests
- Testcontainers Dapr module — https://testcontainers.com/modules/dapr/
- Docker Hub — daprio/dapr and daprio/daprd image tags

## Issues Found

### 1. Container networking — containers could not communicate
**What was wrong:** The Dapr sidecar container used `.WithNetwork("host")` which attaches to Docker's host network, while Redis and the placement service ran on the default bridge network. The component YAML referenced `redis:6379`, but without a shared Docker network with a "redis" alias, the sidecar could not resolve that hostname. Similarly, `--placement-host-address` used `host.docker.internal:50006` which is fragile and unnecessary.

**What was changed:** Introduced a shared `INetwork` created via `NetworkBuilder`. Added `.WithNetwork(_network)` and `.WithNetworkAliases("redis")` to the Redis container, `.WithNetwork(_network)` and `.WithNetworkAliases("placement")` to the placement container, and `.WithNetwork(_network)` to the sidecar (replacing `.WithNetwork("host")`). Changed `--placement-host-address` from `host.docker.internal:50006` to `placement:50006`. Added `using DotNet.Testcontainers.Networks;` import. Added `await _network.DisposeAsync();` to cleanup.

**Why:** Without a shared network, inter-container DNS resolution fails. The `redis:6379` hostname in the component YAML only works when Redis has a network alias on a shared network. The placement service is likewise only reachable by alias on a shared network.

### 2. Test filter command does not work with xUnit `[Collection]`
**What was wrong:** The command `dotnet test --filter "Collection=Testcontainers"` does not work because xUnit's `[Collection]` attribute is not exposed as a filterable trait. The supported filter properties are `FullyQualifiedName`, `DisplayName`, and `Traits`.

**What was changed:** Changed the filter to `--filter "FullyQualifiedName~OrderServiceContainerTests"` which matches by class name.

**Why:** Per Microsoft docs, `[Collection]` controls test parallelization and shared fixtures, not filtering. Using it as a filter would silently match zero tests.

### 3. "Simplified: Use Dapr Dev Mode Container" section was misleading
**What was wrong:** The section claimed `daprio/dapr:1.14` is an "all-in-one dev container for testing" that works by just starting it with port bindings and no command. In reality, the `daprio/dapr` image contains multiple binaries (daprd, placement, sentry, etc.) but has no default entrypoint that starts all services. Without a command, the container won't function as a sidecar.

**What was changed:** Changed the section title to "Simplified: Minimal Dapr Sidecar". Updated the description to clarify this is for tests that don't need actors or placement. Changed the image to `daprio/daprd:1.14` and added the necessary `./daprd` command with `--app-id`, `--dapr-http-port`, and `--dapr-grpc-port` flags.

**Why:** The `daprio/dapr` image is not a dev-mode runtime. The official Testcontainers Dapr module uses `daprio/daprd` for the sidecar, and a command is always required.

## Review Notes
- The test class does not start the application under test (the "order-service" on port 5000) as a container. The `HttpClient` points to `http://localhost:5000`, implying the app runs outside Docker (e.g., via `WebApplicationFactory` or a separate process). This is a valid pattern but may confuse readers who expect a fully containerized setup.
- The Java/Maven dependency snippet (`testcontainers` 1.19.0) is shown in the Setup section but the rest of the post is entirely .NET/C#. The Java snippet is somewhat orphaned with no Java test example.
- `DaprClientBuilder().UseHttpEndpoint()` is a valid API call but the `DaprClient` primarily uses gRPC. The HTTP endpoint setting works for the Dapr HTTP API, which is correct for this use case.
- The Dapr component YAML uses `version: v1` for the state store, which is correct for `state.redis`.
