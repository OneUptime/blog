# Validation Summary: How to Use Dapr Messaging with .NET SDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET / C# / ASP.NET Core
- Dapr .NET SDK (`Dapr.Client`, `Dapr.AspNetCore`)
- CloudEvents 1.0
- Pub/Sub messaging patterns

## Sources Consulted
- [Dapr .NET SDK - TopicAttribute source code](https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.AspNetCore/TopicAttribute.cs) — verified all 5 constructor signatures, settable properties (`Match`, `Priority`, `DeadLetterTopic`), and correct attribute syntax
- [Dapr .NET SDK - DaprClient.cs source code](https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs) — verified `BulkPublishEventAsync` method signature
- [Dapr .NET SDK - BulkPublishEntry.cs source code](https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/BulkPublishEntry.cs) — verified correct type name (`BulkPublishEntry<T>`), primary constructor params (`entryId`, `eventData`, `contentType`, `metadata`), and read-only properties
- [Dapr .NET SDK - BulkPublishResponse.cs source code](https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/BulkPublishResponse.cs) — verified `FailedEntries` property
- [Dapr .NET SDK - BulkPublishResponseFailedEntry.cs source code](https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/BulkPublishResponseFailedEntry.cs) — verified `ErrorMessage` property name is correct
- [Dapr .NET SDK - CloudEvent.cs source code](https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/CloudEvent.cs) — verified `CloudEvent<TData>` exists (not deprecated), has `Source`, `Type`, `Subject`, `Data` properties but no `Time` property
- [Dapr Pub/Sub API Reference](https://docs.dapr.io/reference/api/pubsub_api/) — verified subscriber response status codes: 2xx=SUCCESS, 404=DROP, other=RETRY
- [Dapr Dead Letter Topics documentation](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/) — verified dead letter topic behavior and configuration
- [Dapr Bulk Publish documentation](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/) — verified bulk publish API and .NET usage patterns
- [Dapr .NET SDK - CloudEvent metadata issue #1154](https://github.com/dapr/dotnet-sdk/issues/1154) — confirmed `cloudevent.*` metadata key format is correct for PublishEventAsync

## Issues Found

1. **Unused import `CloudNative.CloudEvents`**: The `EventPublisher` class imported `CloudNative.CloudEvents` but used no types from that namespace. Removed the unused import to avoid confusion.

2. **Wrong type name `BulkPublishMessage<T>` in Bulk Publishing section**: The type `BulkPublishMessage<T>` does not exist in the Dapr .NET SDK. The correct type is `BulkPublishEntry<TValue>`. Additionally, `BulkPublishEntry<T>` uses a primary constructor (C# 12+) with required parameters `entryId`, `eventData`, `contentType`, and optional `metadata` — the blog's object initializer syntax (`{ Event = e, Metadata = ... }`) would not compile since properties are read-only. Fixed to use constructor syntax with all required parameters including `entryId` and `contentType`.

3. **Missing `priority` parameter in `[Topic]` attribute for content-based routing**: The `TopicAttribute` constructor for routing rules requires both `match` (string) and `priority` (int) parameters: `TopicAttribute(string pubsubName, string name, string match, int priority, ...)`. The blog passed only the match expression as a third string argument without priority, which would cause a compile error due to ambiguity with the dead-letter-topic constructor. Added the required `priority` parameter (1 for high-value, 2 for standard).

4. **Invalid `deadLetterTopic:` named parameter syntax in `[Topic]` attribute**: The blog used `[Topic("pubsub", "orders", deadLetterTopic: "orders-dlq")]` with named constructor parameter syntax. However, the constructor that accepts `deadLetterTopic` also requires `enableRawPayload` (bool) with no default value, so this call would not compile. Changed to property setter syntax `DeadLetterTopic = "orders-dlq"` which correctly sets the settable property.

5. **Incorrect HTTP status code for dead letter DROP signal**: The blog returned `UnprocessableEntity()` (HTTP 422) for permanent validation failures with a comment saying "send to DLQ". Per the Dapr pub/sub API spec, HTTP 422 triggers RETRY (not DROP), causing wasteful retries for permanently invalid messages. The correct signal for immediate message drop (routing to DLQ) is HTTP 404. Changed to `NotFound()` with an explanatory comment.

6. **Non-existent `Time` property on `CloudEvent<T>`**: The blog accessed `cloudEvent.Time` in the CloudEvent envelope reading example. The Dapr .NET SDK's `CloudEvent<TData>` class has `Source`, `Type`, `Subject`, `Data`, and `DataContentType` properties — but no `Time` property. Replaced with `cloudEvent.Subject` which is an available property.

## Review Notes
- The `cloudevent.*` metadata keys (`cloudevent.type`, `cloudevent.source`, `cloudevent.datacontenttype`) used in `PublishEventAsync` are confirmed correct per the Dapr .NET SDK issue tracker, though there is a known limitation: these metadata overrides are ignored when the published object is itself a `CloudEvent<T>` instance.
- The `CloudEvent<TData>` type is currently not deprecated, but it provides a limited subset of CloudEvents attributes (no `id`, `time`, `specversion`). For full CloudEvents access, developers may need to parse the raw JSON envelope.
- The `WithTopic` extension method for minimal APIs is shown correctly but requires `Dapr.AspNetCore` to be properly configured with `app.MapSubscribeHandler()`.
- The `BulkPublishEntry<T>` class uses C# 12 primary constructor syntax, which requires .NET 8+ or a project targeting C# 12+.
