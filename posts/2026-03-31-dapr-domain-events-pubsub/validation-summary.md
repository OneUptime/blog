# Validation Summary: How to Use Domain Events with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, state management, subscriptions)
- Python (dataclasses, typing)
- Dapr Python SDK (`dapr-client`)
- Flask (HTTP event handler)
- Domain-Driven Design (domain events, aggregates, bounded contexts)
- Transactional Outbox Pattern
- CloudEvents

## Sources Consulted
- Dapr Python SDK source code (`dapr/python-sdk` on GitHub) — verified `publish_event`, `execute_state_transaction`, `TransactionalStateOperation`, and `TransactionOperationType` API signatures
- Dapr pub/sub documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Dapr subscription spec documentation (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr state management transactions documentation (https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/)

## Issues Found
- **Incorrect enum name `OperationType`**: The transactional outbox code snippet used `OperationType.upsert` (twice), but the Dapr Python SDK enum is actually `TransactionOperationType`. This would cause a `NameError` at runtime. Fixed both occurrences to `TransactionOperationType.upsert`.

## Review Notes
- `datetime.utcnow()` (used in the `DomainEvent` base class) is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. The code still functions correctly but will emit a deprecation warning on Python 3.12+.
- The transactional outbox snippet does not show its imports for `TransactionalStateOperation` and `TransactionOperationType` (which live in `dapr.clients.grpc._request`). This is acceptable for a blog post that focuses on the pattern rather than complete runnable code, but readers may need to look up the imports.
- The programmatic subscription endpoint (`/dapr/subscribe`) and the declarative YAML subscription both configure the same subscription. The post shows both approaches which is useful for reference, though in practice you'd pick one.
