# Validation Summary: How to Implement Event Sourcing with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub building blocks)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Go programming language
- Event sourcing pattern

## Sources Consulted
- Dapr Go SDK source code at `github.com/dapr/go-sdk/client` — verified `GetState`, `ExecuteStateTransaction`, `PublishEvent`, `StateOperation`, `StateOperationTypeUpsert`, and `SetStateItem` types and signatures
- Dapr state management documentation (https://docs.dapr.io/developing-applications/building-blocks/state-management/)
- Dapr pub/sub documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Cross-referenced with validated Dapr blog posts in this repository (dapr-state-transactions, dapr-outbox-pattern, dapr-go-client, dapr-event-versioning)

## Issues Found
- **Account.ID never set during rehydration**: The `Apply` method for the `AccountOpened` event type did not set `a.ID` from `event.AggregateID`. This meant that after calling `Rehydrate`, the returned `Account` would always have an empty `ID` field despite the struct declaring one. Fixed by adding `a.ID = event.AggregateID` in the `AccountOpened` case of the `Apply` method.

## Review Notes
- The `AppendEvents` method does not use optimistic concurrency control (ETags). In a production event sourcing system, you would want to use ETags on the count key to prevent lost events under concurrent writes. This is acceptable for a tutorial but worth noting for readers building real systems.
- Error return values from `json.Unmarshal` and `GetState` are silently discarded in several places for brevity. This is a common blog post convention but production code should handle these errors.
- The event store and pub/sub publish are not in a single atomic operation — if the publish fails after the state transaction succeeds, projections could miss events. The post does not mention this limitation. Dapr's outbox pattern (covered in a separate post) addresses this.
