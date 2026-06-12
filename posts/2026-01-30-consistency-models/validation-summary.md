# Validation Summary: How to Create Consistency Models

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Distributed systems consistency models
- CAP theorem
- Linearizability and strong consistency
- Eventual consistency
- Causal consistency
- Read-your-writes consistency
- Monotonic reads
- Python concurrency and type hints
- Prometheus metrics client

## Sources Consulted
- Python typing documentation: https://docs.python.org/3/library/typing.html
- Python threading documentation: https://docs.python.org/3/library/threading.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Jepsen consistency models: https://jepsen.io/consistency/models
- Jepsen linearizability model: https://jepsen.io/consistency/models/linearizable
- Gilbert and Lynch, "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services": https://users.ece.cmu.edu/~adrian/731-sp04/readings/GL-cap.pdf
- Herlihy and Wing, "Linearizability: A Correctness Condition for Concurrent Objects": https://cs.brown.edu/people/mph/HerlihyW90/p463-herlihy.pdf
- Werner Vogels, "Eventually Consistent": https://www.allthingsdistributed.com/2007/12/eventually_consistent.html

## Issues Found
- The Python examples used `any` as a type annotation. Changed these to `typing.Any` and added the relevant imports because `any` is the built-in function, not the type hint for arbitrary values.
- The CAP theorem diagram described consistency as "All nodes see the same data at the same time" and availability as "Every request receives a response." Adjusted these to better match CAP's atomic consistency and non-error availability definitions.
- The strong consistency example attempted rollback by calling `follower.rollback(operation)`, but no `rollback` method existed. Added rollback metadata to `WriteOperation` and implemented `rollback` so failed replication does not leave already-updated followers inconsistent.
- The vector clock `happens_before` check only iterated over nodes present in the other clock, which could incorrectly order concurrent clocks. Updated it to compare the union of clock entries.
- The eventual consistency example said it used last-writer-wins with a vector clock tiebreaker, but the code uses vector clocks for causal ordering and timestamps as the concurrent-write tiebreaker. Corrected the description.
- The causal consistency example could apply a later operation from the same origin before earlier operations from that origin. Updated `_can_apply` to require prior same-origin sequence numbers before applying an operation.
- The causal consistency `read` method said it might block when dependencies were missing but returned local data anyway. Changed it to raise an explicit dependency error in the simplified example.
- The read-your-writes example returned stale data on timeout, violating the stated guarantee. Changed timeout behavior to raise `TimeoutError` rather than returning stale data.
- The read-your-writes example used `threading.Condition` with a separate lock while also using the store lock, creating a possible lock-order deadlock. Changed conditions to use the store lock.
- The hybrid consistency example created a strong store without leader mode, omitted `self.node_id`, referenced `time` without importing it, and represented a money transfer as two non-atomic balance writes. Updated the example to initialize correctly and record a transfer in the strong store while noting that production debit and credit must be one atomic transaction.
- The test example was marked `async` without awaiting anything and imported `pytest` unnecessarily. Made it a regular test function.
- The metrics example referenced `Gauge` and `Counter` without imports. Added the Prometheus client import.

## Review Notes
The examples remain intentionally simplified and are suitable for illustrating consistency-model mechanics, but they are not production implementations. A production system would still need durable logs, real consensus or quorum protocols, failure detection, retries with idempotency, transactional semantics for multi-key operations, and explicit behavior under partitions and timeouts.
