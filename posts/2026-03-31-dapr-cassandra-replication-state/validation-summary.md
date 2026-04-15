# Validation Summary: How to Use Cassandra Replication with Dapr State Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Cassandra (cluster setup, keyspaces, compaction strategies, monitoring)
- Dapr state store component (`state.cassandra`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Helm (Bitnami Cassandra chart)
- Kubernetes (service DNS, secrets)
- CQL (Cassandra Query Language)

## Sources Consulted
- Dapr Cassandra state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-cassandra/
- Dapr state store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr Go SDK reference: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr supported state stores comparison: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Apache Cassandra documentation (consistency levels, compaction strategies, nodetool)
- Bitnami Cassandra Helm chart documentation

## Issues Found

### 1. TTL not supported by Dapr Cassandra state store (Critical)
**What was wrong:** The post had an entire section titled "Saving State with Cassandra TTL" that showed using `ttlInSeconds` metadata with Dapr's `SaveState`. According to official Dapr documentation, the Cassandra state store does **not** support TTL via the `ttlInSeconds` metadata key — the metadata is silently ignored.
**What was changed:** Renamed section to "Saving State", removed `ttlInSeconds` metadata from the code example, added comments noting the limitation. Updated the keyspace section comments and summary to clarify that TTL must be set natively in CQL using `USING TTL`, not through Dapr metadata.

### 2. Go code: missing imports (Bug)
**What was wrong:** The Go code used `fmt.Sprintf()` but did not import the `"fmt"` package. The code would not compile.
**What was changed:** Added `"fmt"` and `"encoding/json"` to the import block.

### 3. Go code: wrong data type for SaveState (Bug)
**What was wrong:** The `SaveState` call passed `sessionData` (type `interface{}`) directly as the data parameter. The Dapr Go SDK's `SaveState` expects `[]byte`, not `interface{}`. The code would not compile.
**What was changed:** Added `json.Marshal(sessionData)` to serialize to `[]byte` before passing to `SaveState`.

### 4. Consistency comment: "linearizability" is incorrect (Inaccuracy)
**What was wrong:** The comment stated "read + write quorum = N+1 guarantees linearizability". This is incorrect — QUORUM consistency with R + W > N guarantees **strong consistency** (every read sees the most recent write), not linearizability. Linearizability in Cassandra requires lightweight transactions using SERIAL or LOCAL_SERIAL consistency.
**What was changed:** Updated comment to "R + W > N guarantees strong consistency, not linearizability".

### 5. Deprecated nodetool command (Outdated)
**What was wrong:** The monitoring section used `nodetool cfstats`, which was deprecated in Cassandra 4.0 in favor of `nodetool tablestats`.
**What was changed:** Replaced `cfstats` with `tablestats`.

## Review Notes
- The Helm chart parameters (`cluster.seedCount`, `dbUser.user`, `dbUser.password`, `replicaCount`, `persistence.size`) are correct for the Bitnami Cassandra chart.
- The Dapr component configuration field names (`hosts`, `username`, `password`, `keyspace`, `table`, `consistency`, `replicationFactor`, `protoVersion`) are all valid metadata fields for `state.cassandra`.
- The `apiVersion: dapr.io/v1alpha1` is still the current apiVersion for Dapr components.
- The CQL syntax for `CREATE KEYSPACE` with `NetworkTopologyStrategy` and `ALTER TABLE` compaction settings is correct.
- The `dataCenter` metadata field in the Dapr component is not documented in the official Dapr Cassandra docs — it may be ignored. Authors should verify this field is needed for their use case.
- The compaction strategy section (TWCS) is still valid for Cassandra data with native TTLs, even though Dapr doesn't expose TTL through its API for this store.
