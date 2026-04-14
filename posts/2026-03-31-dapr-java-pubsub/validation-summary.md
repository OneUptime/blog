# Validation Summary: How to Use Dapr Pub/Sub with Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Java
- Dapr Java SDK (`io.dapr` packages)
- Spring Boot (`dapr-sdk-springboot`)
- CloudEvents
- Reactive programming (Project Reactor / Mono)

## Sources Consulted
- Dapr Java SDK source code on GitHub (`dapr/java-sdk` repository) — `DaprClient.java`, `Topic.java`, `BulkPublishEntry.java`, `BulkPublishRequest.java`, `BulkPublishResponse.java`, `CloudEvent.java`
- Dapr official documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr Java SDK documentation: https://docs.dapr.io/developing-applications/sdks/java/java-pubsub/
- Dapr Java client documentation: https://docs.dapr.io/developing-applications/sdks/java/java-client/

## Issues Found

### 1. Incorrect class name `BulkPublishRequestEntry` (Bulk Publishing section)
- **What was wrong:** The code used `BulkPublishRequestEntry` which does not exist in the Dapr Java SDK. The correct class is `BulkPublishEntry<T>` from `io.dapr.client.domain.BulkPublishEntry`.
- **What was changed:** Replaced `BulkPublishRequestEntry` with `BulkPublishEntry<OrderPlaced>` and added proper generic type parameters.

### 2. Incorrect method name `bulkPublishEvents` (Bulk Publishing section)
- **What was wrong:** The code called `client.bulkPublishEvents(...)` which does not exist. The correct method is `client.publishEvents(...)`.
- **What was changed:** Replaced `bulkPublishEvents` with `publishEvents`.

### 3. Incorrect bulk publish call signature (Bulk Publishing section)
- **What was wrong:** The code passed a list of entries and null metadata directly to the method. The convenience overloads of `publishEvents()` accept a raw `List<T>` of event objects plus a content type string — not a list of `BulkPublishEntry` objects. To use entry objects (with explicit entry IDs and per-entry content types), you must wrap them in a `BulkPublishRequest` and call `publishEvents(BulkPublishRequest<T>)`.
- **What was changed:** Restructured to create a `BulkPublishRequest<OrderPlaced>` wrapping the entries, then call `client.publishEvents(request)`. Also corrected the return type from `BulkPublishResponse<?>` to `BulkPublishResponse<OrderPlaced>`.

## Review Notes
- All other code examples (publishing, publishing with metadata, subscribing with `@Topic`, dead letter topics, CloudEvent deserialization) are technically accurate against the current Dapr Java SDK.
- The `@Topic` annotation import (`io.dapr.Topic`), `CloudEvent` import (`io.dapr.client.domain.CloudEvent`), and `DaprClient`/`DaprClientBuilder` imports are all correct.
- The `deadLetterTopic` attribute on `@Topic` is a valid attribute in the SDK.
- The `dapr run` CLI command syntax is correct.
- The explanation of how `@Topic` registers subscriptions via the `/dapr/subscribe` endpoint is accurate.
