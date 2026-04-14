# Validation Summary: Dapr vs Akka: Actor Framework Comparison

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Akka (Typed actors, Streams, Persistence, Cluster)
- Dapr Actors (virtual actor pattern)
- Dapr state store components (PostgreSQL)
- Scala
- Python (Dapr SDK)

## Sources Consulted
- Akka Typed official documentation: https://doc.akka.io/libraries/akka-core/current/typed/index.html
- Akka Streams documentation: https://doc.akka.io/libraries/akka-core/current/stream/index.html
- Akka Persistence documentation: https://doc.akka.io/libraries/akka-core/current/typed/persistence.html
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Actors features and concepts: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-features-concepts/
- Dapr Python SDK actor docs: https://docs.dapr.io/developing-applications/sdks/python/python-actor/
- Dapr Python SDK demo actor source: https://github.com/dapr/python-sdk/tree/main/examples/demo_actor
- Dapr PostgreSQL state store v1 docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr SDKs overview: https://docs.dapr.io/developing-applications/sdks/

## Issues Found

1. **Akka Typed actor code - non-exhaustive pattern match (High)**: The `GetStatus` case class was defined in the sealed trait but never handled in the `Behaviors.receiveMessage` block. This would cause a `MatchError` at runtime and a compiler warning. Fixed by adding the `GetStatus` handler. Also removed unnecessary `Behaviors.setup` wrapping since `context` was unused.

2. **Comparison table - Akka state persistence mislabeled as "Manual" (High)**: The table described Akka state persistence as "Manual (event sourcing or external)." Akka Persistence (`EventSourcedBehavior`, `DurableStateBehavior`) is a first-class framework module that handles event persistence and state recovery automatically. Changed to "Framework-supported (Akka Persistence with event sourcing)."

3. **Comparison table - Akka concurrency model description vague (Medium)**: "Configurable (mailbox)" was incomplete and could mislead readers into thinking Akka actors process multiple messages concurrently. Akka actors process one message at a time per actor (similar to Dapr's turn-based model). Changed to "Message-driven (one message at a time per actor, configurable mailbox)."

4. **Dapr YAML - PostgreSQL connection string format error (Medium)**: The connection string `"host=postgres;dbname=dapr"` used semicolons as delimiters. PostgreSQL libpq connection strings use spaces as delimiters. Also changed `dbname` to `database` to match Dapr documentation conventions. Fixed to `"host=postgres database=dapr"`.

5. **Dapr supported languages list missing .NET (Medium)**: The "When to Choose Dapr Actors" section listed Python, Go, Java, and Node.js but omitted .NET, which is arguably the most mature Dapr actor SDK given Dapr's Microsoft origins. Added .NET to the list.

## Review Notes
- The Dapr Python actor code is simplified for the blog -- in practice, Dapr actor classes should also inherit from an `ActorInterface` subclass and use the `@actormethod` decorator. This simplification is acceptable for a comparison snippet but readers implementing actors should consult the full SDK docs.
- Akka changed its license from Apache 2.0 to BSL 1.1 starting with version 2.7 (September 2022). Apache Pekko exists as an Apache 2.0 fork. The post does not mention licensing, which could be relevant for readers evaluating these technologies. This is not a technical error but worth noting in a future update.
- The introductory paragraph states "The framework handles backpressure" -- backpressure is specifically an Akka Streams feature, not core Akka actors. The claim is not wrong in the context of the overall Akka toolkit, but could be more precise.
