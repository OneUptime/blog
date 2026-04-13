# Validation Summary: Dapr vs Service Fabric: Microsoft Ecosystem Comparison

## Status
validated

## Post Type
Comparison / Migration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Service Fabric
- Dapr .NET SDK (Actors)
- Service Fabric Reliable Actors
- Service Fabric Reliable Collections
- Kubernetes
- Helm

## Sources Consulted
- Dapr .NET Actor Usage Docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET Actor How-To: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/
- Dapr Actor.cs source (GitHub): https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Actors/Runtime/Actor.cs
- SF Reliable Actors State Management: https://learn.microsoft.com/en-us/azure/service-fabric/service-fabric-reliable-actors-state-management
- SF IActorStateManager API: https://learn.microsoft.com/en-us/dotnet/api/microsoft.servicefabric.actors.runtime.iactorstatemanager
- Deploy Dapr on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- SF Programming Model Overview: https://learn.microsoft.com/en-us/azure/service-fabric/service-fabric-choose-framework
- SF Guest Executables: https://learn.microsoft.com/en-us/azure/service-fabric/service-fabric-guest-executables-introduction
- Dapr FAQ: https://docs.dapr.io/concepts/faq/faq/

## Issues Found
1. **Dapr actor code missing required `ActorHost` constructor**: The Dapr .NET SDK requires all actor classes to have a constructor accepting `ActorHost` and passing it to the base `Actor` class. The original code sample omitted this, which would prevent compilation. Added `public OrderActor(ActorHost host) : base(host) { }` to the Dapr actor example.

2. **Service Fabric language support overstated**: The comparison table listed SF language support as ".NET, Java, Go, Python". Service Fabric only has first-class SDK support for .NET and Java (with Reliable Services and Reliable Actors programming models). Go, Python, and other languages can only run as guest executables, which are opaque binaries with no access to SF programming model features. Corrected to ".NET, Java (guest executables for others)".

## Review Notes
- The Helm install command (`helm install dapr dapr/dapr -n dapr-system --create-namespace`) is correct but the official Dapr docs also recommend the `--wait` flag and pinning a `--version`. This is a best-practice recommendation rather than a correctness issue.
- The Service Fabric actor code also omits the typical constructor (`ActorService actorService, ActorId actorId`), but since both examples are simplified for comparison purposes this is acceptable.
- The claim that "Dapr evolved from lessons learned from Service Fabric's Reliable Actors" is well-supported by Dapr's official FAQ and documentation.
- Both the `StateManager.GetOrAddStateAsync` and `SetStateAsync` methods are confirmed correct for both Service Fabric and Dapr .NET SDK actors.
- The `[StatePersistence(StatePersistence.Persisted)]` attribute on the SF actor is correct.
