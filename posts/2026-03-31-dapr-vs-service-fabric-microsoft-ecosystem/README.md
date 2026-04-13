# Dapr vs Service Fabric: Microsoft Ecosystem Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Fabric, Microsoft, Microservice, Comparison

Description: Compare Dapr and Azure Service Fabric for microservices within the Microsoft ecosystem - including reliable services, actors, and migration paths.

---

Microsoft has two major distributed systems platforms: the older Service Fabric and the newer Dapr. Understanding their relationship helps teams plan modernization paths and choose the right platform for new projects.

## What Service Fabric Is

Azure Service Fabric is Microsoft's battle-tested distributed systems platform, powering many Azure services internally. It provides:

- Reliable Services (stateful and stateless)
- Reliable Actors (virtual actor model)
- Cluster management and service placement
- Health management
- Rolling upgrades

Service Fabric is a full platform - it manages both the application runtime and the infrastructure.

## What Dapr Is

Dapr is a lightweight sidecar runtime that runs alongside any application. Unlike Service Fabric, Dapr does not manage your infrastructure or cluster - it works on top of Kubernetes, Docker Compose, or any other platform.

Dapr evolved from lessons learned from Service Fabric's Reliable Actors, bringing the best patterns to a cloud-native, platform-agnostic model.

## Comparing Reliable Actors vs Dapr Actors

**Service Fabric Reliable Actor:**

```csharp
[StatePersistence(StatePersistence.Persisted)]
class OrderActor : Actor, IOrderActor
{
    public async Task<OrderStatus> PlaceOrderAsync(OrderRequest request)
    {
        var state = await StateManager.GetOrAddStateAsync("order",
            new OrderState());
        state.Status = OrderStatus.Processing;
        await StateManager.SetStateAsync("order", state);
        return state.Status;
    }
}
```

**Dapr Actor:**

```csharp
// .NET Dapr SDK - similar API
public class OrderActor : Actor, IOrderActor
{
    public OrderActor(ActorHost host) : base(host) { }

    public async Task<OrderStatus> PlaceOrderAsync(OrderRequest request)
    {
        var state = await StateManager.GetOrAddStateAsync("order",
            new OrderState());
        state.Status = OrderStatus.Processing;
        await StateManager.SetStateAsync("order", state);
        return state.Status;
    }
}
```

The .NET Dapr SDK deliberately mirrors the Service Fabric Actor API to ease migration.

## Key Differences

| Feature | Service Fabric | Dapr |
|---------|---------------|------|
| Platform | Azure or on-prem SF cluster | Any (Kubernetes, local, cloud) |
| Language support | .NET, Java (guest executables for others) | Any language |
| Infrastructure management | Built-in cluster manager | Relies on Kubernetes |
| Actor model | Reliable Actors | Virtual Actors |
| State storage | Reliable Collections | External state store |
| Portability | Azure/SF-specific | Cloud-agnostic |
| Learning curve | High | Lower |

## Migrating from Service Fabric to Dapr

Microsoft designed the Dapr .NET SDK to be familiar to Service Fabric developers. The migration path:

1. Extract services from SF to Kubernetes deployments
2. Replace Reliable State with Dapr state store calls
3. Replace Reliable Actors with Dapr Actors (API is similar)
4. Replace SF service discovery with Dapr service invocation

```bash
# Deploy Dapr on Kubernetes
helm install dapr dapr/dapr -n dapr-system --create-namespace

# Deploy migrated service
kubectl apply -f order-service.yaml
```

## When Service Fabric Still Makes Sense

- Existing, large SF deployments where migration cost is high
- Stateful services using Reliable Collections (replicated in-memory state)
- Teams deeply invested in the SF ecosystem with complex cluster configurations

## Summary

Dapr is the modern successor to Service Fabric's distributed systems concepts, offering the same actor model and stateful services in a cloud-agnostic, Kubernetes-native package. The .NET Dapr SDK mirrors Service Fabric APIs to ease migration. For new projects, choose Dapr on Kubernetes. For existing Service Fabric workloads, plan incremental migration starting with stateless services.
