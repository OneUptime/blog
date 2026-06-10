# Validation Summary: How to Create Vector Clocks

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Vector clocks (logical clocks for distributed systems)
- Lamport timestamps (referenced)
- Version vectors for data replication
- Dotted version vectors (DVV)
- Python 3 (typing, dataclasses, enum, copy.deepcopy)
- CRDTs (Conflict-free Replicated Data Types — referenced)
- Distributed databases: Amazon Dynamo, Riak, Voldemort

## Sources Consulted
- Leslie Lamport, "Time, Clocks, and the Ordering of Events in a Distributed System" (CACM, 1978)
- Friedemann Mattern, "Virtual Time and Global States of Distributed Systems" (1989) — the canonical vector clock paper
- DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store" (SOSP 2007) — https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
- Preguica et al., "Dotted Version Vectors: Logical Clocks for Optimistic Replication" (2010) — https://arxiv.org/abs/1011.5808
- Riak documentation on vector clocks and dotted version vectors — https://docs.riak.com/riak/kv/latest/learn/concepts/causal-context/
- Apache Cassandra documentation on conflict resolution (LWW with timestamps, not vector clocks) — https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Project Voldemort design (uses vector clocks, Dynamo-inspired) — https://www.project-voldemort.com/voldemort/design.html
- Python 3 official docs for `typing`, `dataclasses`, `enum`, `copy` modules

## Issues Found
1. **Inaccurate database reference.** The "Further Reading" section listed "Practical implementations in databases like Riak and Cassandra." Cassandra does NOT use vector clocks for conflict resolution — it uses last-write-wins (LWW) with timestamp-based ordering. Replaced "Cassandra" with "Voldemort" (LinkedIn's open-source Dynamo-style key-value store), which is a canonical example of a system that uses vector clocks for causality tracking, sitting accurately alongside Riak.

## Review Notes
- All code examples were traced step-by-step and the printed output comments match what the code produces exactly. The `VectorClock` increment/send/receive semantics, the `compare_clocks` BEFORE/AFTER/CONCURRENT/EQUAL logic, and the `VersionVectorStore` conflict detection example all produce the documented outputs.
- The first mermaid diagram in "What Are Vector Clocks?" was verified by reproducing the merge-then-increment semantics for each message: every node's resulting vector matches the implementation in the code.
- The `compare_clocks` algorithm correctly implements the standard partial order on vector clocks (component-wise ≤ with at least one < implies "before").
- The `DottedVersionedValue.dominates` check (`self.context.get(other_node, 0) >= other_counter`) correctly captures the DVV dominance relation as defined by Preguica et al.
- The `prune_clock` example is illustrative — in practice, naively pruning vector clock entries can break causality guarantees and lead to false-concurrency errors. The post correctly frames it as a "practical consideration" rather than a safe default, but readers should be aware that production pruning typically requires garbage-collection protocols (e.g., tracking which entries are dominated by all replicas) rather than a simple active-set/threshold filter.
- The post correctly distinguishes vector clocks from Lamport timestamps: Lamport timestamps provide a total order consistent with causality but cannot distinguish concurrent from causally related events, whereas vector clocks can.
- Riak transitioned from classic vector clocks to dotted version vectors in 2.0 (2014). The post nicely covers both, which reflects the current best practice.
