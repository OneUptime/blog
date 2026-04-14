# Validation Summary: How to Build a Custom Pluggable Component for Dapr in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pluggable components)
- .NET 8
- C#
- Dapr.PluggableComponents.AspNetCore NuGet package
- gRPC / Unix Domain Sockets
- Dapr CLI

## Sources Consulted
- Dapr pluggable components .NET SDK GitHub repository (dapr-sandbox/components-dotnet-sdk) — source code and samples
- NuGet package listing for Dapr.PluggableComponents.AspNetCore (versions 0.1.0 through 0.3.0 stable)
- Official Dapr documentation on pluggable components (https://docs.dapr.io/developing-applications/develop-components/pluggable-components/)
- Dapr CLI documentation (https://docs.dapr.io/reference/cli/)

## Issues Found

1. **`--prerelease` flag no longer needed** (Low): The `Dapr.PluggableComponents.AspNetCore` package has a stable release (0.3.0). Removed `--prerelease` from the `dotnet add package` command. Also changed `dotnet new web` to `dotnet new console` since the pluggable component host does not use ASP.NET Core's WebApplication.

2. **`ETag` type incorrect** (High): The blog used `new ETag { Value = entry.etag }` to set the ETag on `StateStoreGetResponse`. In the SDK's public API, `ETag` is a `string?`, not a custom class. Fixed to `ETag = entry.etag`.

3. **`GetAsync` return type should be nullable** (Medium): The `IStateStore` interface declares `GetAsync` as returning `Task<StateStoreGetResponse?>` (nullable). Updated the method signature and `Task.FromResult` calls to use the nullable type.

4. **Registration API completely wrong** (High): The blog showed `WebApplication.CreateBuilder(args).AddDaprPluggableComponentsServices()` and `app.AddDaprPluggableComponents(options => { options.RegisterStateStore<T>() })`. None of these methods exist. The correct API uses `DaprPluggableComponentsApplication.Create()` with `app.RegisterService("<socket-name>", serviceBuilder => { serviceBuilder.RegisterStateStore<T>(); })`. Rewrote the entire Program.cs section.

5. **`socketFolder` metadata field invalid** (Medium): The component YAML included `socketFolder` as a metadata field, but this is not a valid component metadata property. The socket folder is a Dapr runtime convention (`/tmp/dapr-components-sockets` by default), not configured per-component in YAML metadata. Replaced with empty metadata.

6. **`dapr components --kubernetes=false` not useful** (Medium): The `dapr components` command is designed for Kubernetes environments. In self-hosted mode, it does not list loaded components. Replaced with `dapr list` which shows running Dapr applications in self-hosted mode.

7. **`--components-path` deprecated** (Medium): The `--components-path` flag in the Dapr CLI has been deprecated in favor of `--resources-path`. Updated the `dapr run` command accordingly.

## Review Notes
- The `StateStoreSetRequest.Value` property is of type `ReadOnlyMemory<byte>`, not `byte[]`. The blog's use of `.ToArray()` is valid (it's an extension method on `ReadOnlyMemory<T>`) and works correctly, so this was left as-is.
- The `IBulkStateStore` interface is declared on the class but no bulk methods are implemented in the example. This is acceptable for a tutorial since the SDK provides default implementations, but readers should be aware they may want to implement `BulkGetAsync`, `BulkSetAsync`, and `BulkDeleteAsync` for production use.
- The Dapr.PluggableComponents.AspNetCore package (latest 0.3.0) is maintained under the dapr-sandbox organization, indicating it is a community/incubation project rather than a core Dapr SDK.
