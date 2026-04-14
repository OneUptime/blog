# Validation Summary: How to Use Dapr Pub/Sub with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Pub/Sub building block
- CloudEvents

## Sources Consulted
- Dapr Go SDK client package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK service/common package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/service/common
- Dapr Pub/Sub building block documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Bulk Pub/Sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/

## Issues Found

### Issue 1: `PublishEventWithContentType` used as standalone client method
- **What was wrong:** The "Publishing with Metadata" section called `client.PublishEventWithContentType(ctx, "pubsub", "order-placed", event, "application/json")` as if it were a method on the Dapr client. In the current SDK, `PublishEventWithContentType` is a functional option (`PublishEventOption`), not a standalone client method.
- **What was changed:** Updated to `client.PublishEvent(ctx, "pubsub", "order-placed", event, dapr.PublishEventWithContentType("application/json"))`, passing the content type as a functional option to `PublishEvent`.
- **Why:** The Dapr Go SDK uses the functional options pattern for `PublishEvent`. `PublishEventWithContentType(contentType string)` returns a `PublishEventOption` that is passed as a variadic argument to `PublishEvent`.

### Issue 2: `TopicEvent.DataAs()` method does not exist
- **What was wrong:** The subscriber handler called `e.DataAs(&order)` on a `*common.TopicEvent`. The `TopicEvent` struct does not have a `DataAs` method — that method belongs to the CloudEvents Go SDK, not Dapr's common package.
- **What was changed:** Replaced `e.DataAs(&order)` with `e.Struct(&order)`.
- **Why:** The correct method on `common.TopicEvent` is `Struct(target interface{}) error`, which deserializes `RawData` into the target struct.

### Issue 3: Bulk Publishing used deprecated/non-existent API
- **What was wrong:** The bulk publishing section used `BulkPublishEventAlpha1`, `BulkPublishRequestEntry`, `result.FailedEntries`, `failed.EntryId`, and `failed.ErrorMessage` — none of which exist in the current Dapr Go SDK. The alpha1 bulk publish API has been replaced.
- **What was changed:** Rewrote the section to use `client.PublishEvents(ctx, pubsubName, topicName, events)` which takes `[]interface{}` and returns a `PublishEventsResponse` with `Error` and `FailedEvents` fields.
- **Why:** The current Dapr Go SDK provides `PublishEvents` as the stable bulk publishing method. It accepts a slice of `interface{}` (the SDK handles serialization), and the response provides `FailedEvents []interface{}` for error handling.

## Review Notes
- The `PublishEvent` method in the first code example correctly passes a Go struct directly — the SDK accepts `interface{}` and handles JSON marshaling internally. This is accurate.
- The `Subscription` struct fields (`PubsubName`, `Topic`, `Route`, `DeadLetterTopic`) are all verified correct.
- The `TopicEventHandler` signature `func(ctx context.Context, e *common.TopicEvent) (retry bool, err error)` is verified correct.
- The overview's claim about CloudEvents wrapping, delivery retries, and dead-lettering is accurate.
