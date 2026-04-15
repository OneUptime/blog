# Validation Summary: How to Test Dapr .NET Applications with Testcontainers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, state management)
- .NET / ASP.NET Core
- Testcontainers for .NET
- xUnit (test framework)
- Microsoft.AspNetCore.Mvc.Testing (WebApplicationFactory)
- Docker

## Sources Consulted
- NuGet package registry — verified `Testcontainers.Dapr` does not exist as a published package
- Testcontainers .NET documentation (https://dotnet.testcontainers.org/) — confirmed generic `ContainerBuilder` API and namespaces
- Dapr .NET SDK repository (dapr/dotnet-sdk) — confirmed `Dapr.Testcontainers` package exists but uses a fundamentally different harness-based API
- Dapr documentation for in-memory state store (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/) — verified component YAML
- .NET runtime issues dotnet/runtime#40935 and dotnet/runtime#66638 — confirmed `GetFromJsonAsync<dynamic>` limitation is by-design

## Issues Found

### 1. Non-existent NuGet package `Testcontainers.Dapr` (Critical)
**What was wrong:** The post instructed readers to install `Testcontainers.Dapr`, which does not exist on NuGet. The API it demonstrated (`DaprBuilder`, `DaprContainer`, `DaprHttpPort`) was based on a community PR to testcontainers-dotnet that was closed without merging.
**What was changed:** Removed the `Testcontainers.Dapr` package from the install commands. Rewrote the fixture to use the generic `ContainerBuilder` from the base `Testcontainers` package with the `daprio/daprd` Docker image, configuring the sidecar via command-line arguments. This is the correct approach for running a Dapr sidecar in Testcontainers without a dedicated module.
**Why:** The original code would fail at package restore and would not compile.

### 2. Fabricated Testcontainers API (`DaprBuilder`, `DaprContainer`, `DaprHttpPort`) (Critical)
**What was wrong:** The classes `DaprBuilder` and `DaprContainer`, and the property `DaprHttpPort`, do not exist in any published package. The fixture used `using Testcontainers.Dapr;` which is not a valid namespace.
**What was changed:** Replaced with `DotNet.Testcontainers.Builders` and `DotNet.Testcontainers.Containers` namespaces. Used `IContainer` type and `ContainerBuilder` class. Used `GetMappedPublicPort(3500)` to retrieve the dynamically assigned host port.
**Why:** The entire fixture was non-compilable.

### 3. `GetFromJsonAsync<dynamic>` does not work with System.Text.Json (Bug)
**What was wrong:** `GetFromJsonAsync<dynamic>` resolves to `GetFromJsonAsync<object>` at runtime. System.Text.Json returns a boxed `JsonElement`, not a usable dynamic object. Accessing properties via dot notation on the result would throw `RuntimeBinderException`.
**What was changed:** Changed to `GetFromJsonAsync<JsonNode>`, which returns a `JsonNode?` that supports null checks and property access via indexer syntax.
**Why:** The test would compile but fail at runtime.

## Review Notes
- The in-memory state store component YAML is correct. The `spec.metadata` field is omitted, which Dapr tolerates for the in-memory store, though including `metadata: []` would be more explicit.
- The `WebApplicationFactory` + Dapr sidecar container pattern has an architectural subtlety: the test server runs in-process while the sidecar runs in Docker. For the sidecar to call back into the app (e.g., for pub/sub subscriptions), additional network configuration would be needed. The post's example works for outbound calls from the app to the sidecar (state store operations, service invocation) but would not work for inbound sidecar-to-app communication without further setup.
- An official `Dapr.Testcontainers` package (v1.17.8) exists in the Dapr .NET SDK with a harness-based API, but its architecture is fundamentally different from the simple container-based approach shown here. The generic `ContainerBuilder` approach is valid and more straightforward for the use case demonstrated.
- The `dotnet test --filter Category=Integration` command is correct but the test code does not include a `[Trait("Category", "Integration")]` attribute, so the filter would not match the tests as written.
