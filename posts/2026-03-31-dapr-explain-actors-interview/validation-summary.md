# Validation Summary: How to Explain Dapr Actors in an Interview

## Status
validated

## Post Type
Guide / Interview Preparation

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (.NET SDK)
- C# / .NET
- Redis (as actor state store)
- Dapr HTTP API
- Dapr CLI

## Sources Consulted
- Actors API reference | Dapr Docs — https://docs.dapr.io/reference/api/actors_api/
- Actor runtime features and concepts | Dapr Docs — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-features-concepts/
- Actors overview | Dapr Docs — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Actors timers and reminders | Dapr Docs — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/
- Dapr Placement service overview | Dapr Docs — https://docs.dapr.io/concepts/dapr-services/placement/
- Redis state store component | Dapr Docs — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- How to: Run and use virtual actors in the .NET SDK | Dapr Docs — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/
- Dapr .NET SDK examples | GitHub — https://github.com/dapr/dotnet-sdk/blob/master/examples/Actor/DemoActor/DemoActor.cs

## Issues Found
No technical issues found.

## Review Notes
- The post attributes the virtual actor pattern to "Microsoft Research's Orleans project," which is accurate. Orleans pioneered the virtual actor model. Dapr's specific implementation is more directly derived from Azure Service Fabric's actor framework, which itself implements the same Orleans-originated pattern. The attribution is not wrong but could be more precise.
- The actor failure handling description covers the happy path accurately. In practice, there are edge cases around placement service connectivity and reminder delivery on crash that are not mentioned, but this level of detail is appropriate for an interview preparation guide.
- All C# code uses current Dapr .NET SDK APIs (`IActor`, `Actor`, `ActorHost`, `StateManager.GetOrAddStateAsync`, `StateManager.SetStateAsync`).
- The Dapr HTTP API endpoint format (`/v1.0/actors/<actorType>/<actorId>/method/<method>`) is correct.
- The Redis state store component YAML with `actorStateStore: "true"` metadata is correct.
- The distinction between timers (cleared on deactivation) and reminders (persistent across restarts) is accurate per official docs.
