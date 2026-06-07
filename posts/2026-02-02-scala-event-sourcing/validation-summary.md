# Validation Summary: How to Implement Event Sourcing in Scala

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Scala
- Akka Persistence Typed (2.8.5)
- Akka Persistence JDBC (5.2.1)
- Akka Cluster Sharding (typed)
- Akka Streams (RestartSource)
- Slick (3.4.1) with HikariCP
- PostgreSQL (JDBC driver 42.6.0)
- Jackson serialization (Scala module, JSR-310 time module)
- Akka Persistence TestKit
- ScalaTest (3.2.17)
- Event Sourcing / CQRS patterns

## Sources Consulted
- Akka Persistence Typed docs: https://doc.akka.io/docs/akka/2.8/typed/persistence.html
- Akka Persistence JDBC docs: https://doc.akka.io/docs/akka-persistence-jdbc/current/
- Akka Persistence Query Offset source: https://github.com/akka/akka/blob/v2.8.5/akka-persistence-query/src/main/scala/akka/persistence/query/Offset.scala
- Akka Cluster Sharding Typed docs: https://doc.akka.io/docs/akka/2.8/typed/cluster-sharding.html
- Akka EventSourcedBehaviorTestKit docs: https://doc.akka.io/docs/akka/2.8/typed/persistence-testing.html
- Slick documentation: https://scala-slick.org/doc/3.4.1/
- Maven Central for version verification (akka-persistence-jdbc 5.2.1, postgresql 42.6.0, scalatest 3.2.17)

## Issues Found

1. **Incorrect pattern match on `Offset.Sequence`**: In the `BankAccountProjection` code, the `processEvent` method used `case Offset.Sequence(value) =>` to extract the sequence offset value. However, `Sequence` is a top-level case class in `akka.persistence.query`, not a nested member of the `Offset` companion object. The original code would not compile. Fixed by adding `Sequence` to the imports and changing the pattern to `case Sequence(value) =>`.

2. **Dead/uncompilable code in `MoneyDeposited` projection case**: The `processEvent` method's `MoneyDeposited` branch declared an unused `val actions = DBIO.seq(...)` block that contained an invalid expression (`accountBalances.filter(...).map(_.balance).result.head + amount`, which tries to add a `BigDecimal` to a `DBIO[BigDecimal]`). The actual database call below it used the `updateBalanceAndAddTransaction` helper (the same helper used by the other event cases), so the broken block was redundant. Removed the dead block to leave only the correct helper invocation, matching the surrounding cases.

## Review Notes
- The `applyWithSnapshots` snippet in the "Snapshots for Faster Recovery" section references `system.log` without `system` being in scope; it is intended as an illustrative excerpt rather than a standalone compilable unit, which is consistent with how the post presents other excerpts. Left as-is.
- The `result.event shouldBe an[MoneyDeposited]` and `an[MoneyWithdrawn]` ScalaTest matchers use `an` rather than `a` even though the class names start with consonants. ScalaTest accepts both `a[T]` and `an[T]` matchers equivalently, so this compiles and works correctly — purely a grammatical inconsistency.
- The event handler's defensive `throw new IllegalStateException(...)` for unmatched (state, event) tuples will, by Akka's contract, crash recovery if such an event is ever encountered in the journal. The post itself notes that this case should not occur if commands validate properly, which is the correct trade-off.
- Akka 2.8.x is the last Apache 2.0 licensed series before the BSL 1.1 license change; readers planning long-term production use should be aware of the licensing change in newer Akka versions, but the post explicitly pins to 2.8.5 so the code as written remains under Apache 2.0.
- The `withDeleteEventsOnSnapshot` retention configuration permanently removes events that have been included in a snapshot, which conflicts with several event-sourcing benefits highlighted earlier (temporal queries, full audit trail, projection rebuilds). The post doesn't call out this trade-off explicitly, but the code is technically correct.
