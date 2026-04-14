# Validation Summary: How to Use Dapr Pub/Sub with .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET / ASP.NET Core
- C#
- Dapr Pub/Sub building block
- Dapr State Management building block
- Dapr.Client NuGet package
- Dapr.AspNetCore NuGet package

## Sources Consulted
- Dapr .NET SDK GitHub repository (https://github.com/dapr/dotnet-sdk) — source code for `TopicAttribute`, `BulkSubscribeAttribute`, `DaprMvcBuilderExtensions`, `DaprEndpointRouteBuilderExtensions`
- Dapr pub/sub documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Dapr .NET SDK pub/sub usage docs (https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-pubsub/)
- NuGet package listings for Dapr.Client and Dapr.AspNetCore

## Issues Found

### 1. Redundant `AddDaprClient()` call in setup
**What was wrong:** The setup code called both `builder.Services.AddControllers().AddDapr()` and `builder.Services.AddDaprClient()`. The `AddDapr()` extension method internally registers `DaprClient` via `AddDaprClient()`, making the separate call redundant and misleading in a tutorial context.
**What was changed:** Removed the `AddDaprClient()` line and added a comment clarifying that `AddDapr()` also registers DaprClient.

### 2. Incorrect dead letter topic attribute syntax
**What was wrong:** `[Topic("pubsub", "order-created", deadLetterTopic: "order-created-dlq")]` uses named constructor parameter syntax, but `deadLetterTopic` is not a constructor parameter — it is a settable property on `TopicAttribute`. This code would not compile.
**What was changed:** Changed to property initializer syntax: `[Topic("pubsub", "order-created", DeadLetterTopic = "order-created-dlq")]`.

### 3. Incorrect `BulkSubscribe` attribute syntax
**What was wrong:** `[BulkSubscribe("pubsub", "metrics", maxMessagesCount: 100, maxAwaitDurationMs: 1000)]` passes `"pubsub"` as the first argument, but `BulkSubscribeAttribute` only accepts `topicName` as a string parameter (not `pubsubName`). The pub/sub component name comes from the paired `[Topic]` attribute, which was missing entirely. This code would not compile.
**What was changed:** Fixed to `[BulkSubscribe("metrics", 100, 1000)]` and added the required `[Topic("pubsub", "metrics")]` attribute above it.

## Review Notes
- The `TopicAttribute` class is in the `Dapr` namespace (not `Dapr.AspNetCore`), even though it ships in the `Dapr.AspNetCore` NuGet package. Users will need `using Dapr;` in their subscriber controllers.
- The blog correctly shows returning non-2xx status codes to trigger dead letter topic routing, which aligns with Dapr's retry/DLQ behavior.
- The `partitionKey` and `ttlInSeconds` metadata keys are component-dependent — `partitionKey` works with Kafka and other partition-aware brokers, while `ttlInSeconds` is supported by Redis Streams, RabbitMQ, and others. The blog could note this component dependency but it is not incorrect as written.
