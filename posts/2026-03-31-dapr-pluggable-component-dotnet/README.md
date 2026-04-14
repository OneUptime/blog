# How to Build a Custom Pluggable Component for Dapr in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Pluggable Component, State Store, Custom Component

Description: Learn how to build a custom pluggable state store component for Dapr in .NET using the Dapr pluggable components SDK and gRPC interfaces.

---

## What Are Dapr Pluggable Components

Pluggable components extend Dapr with custom implementations of built-in building blocks - state stores, pub/sub brokers, input/output bindings, and secret stores. Unlike built-in components compiled into the Dapr sidecar, pluggable components run as separate processes and communicate via gRPC Unix domain sockets. This enables components written in any language.

## Setting Up the .NET Project

Create a new .NET 8 project and add the Dapr pluggable components SDK:

```bash
dotnet new console -n CustomStateStore
cd CustomStateStore
dotnet add package Dapr.PluggableComponents.AspNetCore
```

## Implementing the State Store Interface

Implement `IStateStore` to provide get, set, delete, and bulk operations:

```csharp
using Dapr.PluggableComponents.Components;
using Dapr.PluggableComponents.Components.StateStore;

public class InMemoryStateStore : IStateStore, IBulkStateStore
{
    private readonly Dictionary<string, (byte[] data, string etag)> _store = new();
    private readonly object _lock = new();

    public Task InitAsync(MetadataRequest request, CancellationToken token = default)
    {
        // Read configuration from request.Properties
        Console.WriteLine($"Initializing InMemoryStateStore");
        return Task.CompletedTask;
    }

    public Task<StateStoreGetResponse?> GetAsync(StateStoreGetRequest request, CancellationToken token = default)
    {
        lock (_lock)
        {
            if (_store.TryGetValue(request.Key, out var entry))
            {
                return Task.FromResult<StateStoreGetResponse?>(new StateStoreGetResponse
                {
                    Data = entry.data,
                    ETag = entry.etag
                });
            }
        }
        return Task.FromResult<StateStoreGetResponse?>(new StateStoreGetResponse());
    }

    public Task SetAsync(StateStoreSetRequest request, CancellationToken token = default)
    {
        lock (_lock)
        {
            var etag = Guid.NewGuid().ToString("N");
            _store[request.Key] = (request.Value.ToArray(), etag);
        }
        return Task.CompletedTask;
    }

    public Task DeleteAsync(StateStoreDeleteRequest request, CancellationToken token = default)
    {
        lock (_lock)
        {
            _store.Remove(request.Key);
        }
        return Task.CompletedTask;
    }
}
```

## Registering the Component in Program.cs

Wire up the pluggable component using the Dapr pluggable components application host:

```csharp
using Dapr.PluggableComponents;

var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "custom-in-memory",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<InMemoryStateStore>();
    });

app.Run();
```

## Component Definition YAML

Create a component YAML that references your pluggable component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-state-store
spec:
  type: state.custom-in-memory
  version: v1
  metadata: []
```

## Running and Testing

Start the component process before the Dapr sidecar:

```bash
# Start the pluggable component
dotnet run --project CustomStateStore &

# Run your app with Dapr
dapr run --app-id test-app \
  --resources-path ./components \
  -- dotnet run --project MyApp
```

Verify the Dapr sidecar is running and your app is connected:

```bash
dapr list
```

## Summary

Building a Dapr pluggable component in .NET involves implementing a gRPC interface from the Dapr pluggable components SDK, registering it with the `DaprPluggableComponentsApplication` host, and pointing a component YAML to the socket file. This pattern lets teams extend Dapr with proprietary data stores or messaging systems without forking the Dapr runtime. The .NET SDK handles the gRPC plumbing, so implementation focuses on business logic.
