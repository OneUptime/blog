# Validation Summary: How to Stream Redis Data to Apache Druid

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams (redis-py Python client)
- Apache Kafka (kafka-python producer)
- Apache Druid (Kafka supervisor ingestion, batch ingestion, Druid SQL)
- Python

## Sources Consulted
- redis-py official documentation and source code — `xgroup_create`, `xreadgroup`, `xack` signatures and return types
- kafka-python official documentation and source code — `KafkaProducer` constructor parameters (`acks`, `linger_ms`, `batch_size`), `send()`, `flush()`
- Apache Druid documentation — Kafka ingestion supervisor spec structure (`/druid/indexer/v1/supervisor`)
- Apache Druid documentation — Batch ingestion (`index_parallel`) task spec structure and required fields (`/druid/indexer/v1/task`)
- Apache Druid documentation — `metricsSpec` aggregator behavior (count vs longSum fieldName semantics)
- Apache Druid documentation — Druid SQL `TIME_FLOOR`, `__time`, `CURRENT_TIMESTAMP`, `INTERVAL` syntax

## Issues Found

### 1. Missing `dataSchema` in batch ingestion spec (Option 2)
**What was wrong:** The `index_parallel` batch ingestion payload was missing the required `dataSchema` section. Without `dataSchema`, the Druid Overlord would reject the task submission because it has no way to determine the target datasource, timestamp column, dimensions, or granularity.

**What was changed:** Added a complete `dataSchema` block (matching the Kafka spec's data model) and a `tuningConfig` to the `index_parallel` spec.

### 2. Unused and misleading `DRUID_ENDPOINT` variable (Option 2)
**What was wrong:** `DRUID_ENDPOINT = "http://druid-router:8888/druid/v2/sql"` was defined but never referenced in the function. The URL points to Druid's SQL query endpoint, not the ingestion endpoint, which could confuse readers.

**What was changed:** Removed the unused variable.

### 3. Missing `import json` in Option 2
**What was wrong:** The Option 2 code block used `json.dumps()` but did not import the `json` module. While the preceding code in Option 1 imports it, Option 2 is presented as a separate code block and should be self-contained.

**What was changed:** Added `import json` to the Option 2 code block.

### 4. Misleading `metricsSpec` in Kafka ingestion spec
**What was wrong:** The `metricsSpec` contained `{"type": "longSum", "name": "total_events", "fieldName": "count"}`. The `fieldName` refers to an input column named `"count"` in the raw event data — it does NOT reference the output of the `count` aggregator defined above it. Since the Redis bridge events do not contain a `"count"` field, this metric would always yield 0, making it misleading.

**What was changed:** Removed the misleading `longSum` aggregator and renamed the `count` metric to `event_count` for clarity.

## Review Notes
- **ACK-before-flush risk in Option 1:** The bridge code calls `r.xack()` immediately after each `producer.send()`, but `send()` is asynchronous — it buffers messages without actually transmitting them. `producer.flush()` is only called after the entire batch loop. If `flush()` fails (e.g., Kafka broker unavailable), messages already ACK'd in Redis would be lost. A more robust pattern would collect message IDs during the loop and only ACK after a successful `flush()`. This is a reliability design concern rather than a correctness bug, so it was not changed.
- The Druid SQL query in the post is correct and uses standard Druid SQL syntax.
- The `curl` command for submitting the Kafka supervisor spec uses the correct endpoint and flags.
- All redis-py API calls (`xgroup_create`, `xreadgroup`, `xack`) use correct signatures and parameter names.
- All kafka-python API calls (`KafkaProducer`, `send`, `flush`) use correct signatures and parameter names.
