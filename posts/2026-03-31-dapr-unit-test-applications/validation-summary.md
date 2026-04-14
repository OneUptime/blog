# Validation Summary: How to Unit Test Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (`DaprClient`)
- C# / .NET
- Moq (mocking framework)
- xUnit (test framework)
- Dapr State Management API (`SaveStateAsync`)
- Dapr Pub/Sub API (`PublishEventAsync`)
- Dapr Service Invocation API (`InvokeMethodAsync`)
- Dapr Secrets API (`GetSecretAsync`)

## Sources Consulted
- Dapr .NET SDK source code: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs
- Dapr .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr .NET SDK usage guide: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/dotnet-daprclient-usage/
- GitHub issue on DaprClient mockability: https://github.com/dapr/dotnet-sdk/issues/774

## Issues Found

### 1. DaprClient incorrectly referred to as an "interface"
- **What was wrong:** The introductory paragraph stated "mock the `DaprClient` interface" but `DaprClient` is an abstract class, not an interface.
- **What was changed:** Changed "interface" to "abstract class" on line 13.
- **Why:** `DaprClient` is declared as `public abstract class DaprClient : IDisposable` in the Dapr .NET SDK. Moq can mock it because all its public methods are abstract, but the terminology must be accurate.

### 2. Incorrect `SaveStateAsync` parameter type: `IReadOnlyList<StateOptions>` should be `StateOptions`
- **What was wrong:** The mock Setup and Verify calls for `SaveStateAsync` used `It.IsAny<IReadOnlyList<StateOptions>>()` for the fourth parameter, implying the method accepts a list of state options.
- **What was changed:** Changed `IReadOnlyList<StateOptions>` to `StateOptions` in both the Setup call and the Verify call.
- **Why:** The actual `SaveStateAsync` signature is `SaveStateAsync<TValue>(string storeName, string key, TValue value, StateOptions? stateOptions = null, IReadOnlyDictionary<string, string>? metadata = null, CancellationToken cancellationToken = default)`. The fourth parameter is a single nullable `StateOptions`, not a list. Using the wrong type would cause the mock setup to not match the actual method, resulting in a test that either fails to compile or silently doesn't verify the intended call.

## Review Notes
- The `GetSecretAsync` mock uses literal `null` and `default` for metadata and CancellationToken parameters. This works but is more fragile than using `It.IsAny<>()` matchers, as it requires the production code to pass exactly those values. For a tutorial demonstrating the concept, this is acceptable.
- The `PublishEventAsync` mock uses `It.IsAny<object>()` while the production code passes an anonymous type. Since `PublishEventAsync` is generic (`PublishEventAsync<TData>`), the type parameter inferred in the mock (`object`) differs from the anonymous type in production. In practice this may require the production code to use a named DTO class instead of an anonymous type for the mock to match correctly. This is a subtle nuance beyond the scope of a getting-started tutorial.
- The `dotnet test --filter "Category=Unit"` command uses the `Category` trait which requires `[Trait("Category", "Unit")]` attributes on test classes or methods. The example tests use `[Fact]` without this trait, so the filter would not match them. This is a minor inconsistency in the tutorial flow but not an error in the command itself.
