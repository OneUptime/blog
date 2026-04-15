# Validation Summary: How to Configure Dapr Binding with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr MySQL output binding (`bindings.mysql`)
- MySQL / MariaDB
- Docker
- Kubernetes
- Python / Flask
- Go MySQL DSN format (`go-sql-driver/mysql`)

## Sources Consulted
- Dapr MySQL binding component specification (`metadata.yaml` in dapr/components-contrib)
- Dapr MySQL binding source code (`mysql.go` in dapr/components-contrib)
- Dapr bindings API reference (invoke output bindings endpoint `POST /v1.0/bindings/{name}`)
- Go `go-sql-driver/mysql` DSN documentation

## Issues Found

### 1. Request payload format — sql and params in wrong field (HIGH)
**What was wrong:** All curl examples and the Python application placed `sql` and `params` inside `"data": { ... }`. The Dapr MySQL binding reads these from the `metadata` field, not `data`. Additionally, `params` must be a JSON-encoded string (e.g., `"[\"val1\", \"val2\"]"`), not a native JSON array.
**What was changed:** Replaced `"data"` with `"metadata"` in all curl examples and Python helper functions. Changed `params` values to JSON-encoded strings in curl examples, and used `json.dumps()` in the Python code.

### 2. exec response format incorrect (HIGH)
**What was wrong:** The blog showed the `exec` response as `{"lastInsertId": 1, "rowsAffected": 1}`. The actual Dapr MySQL binding does not return `lastInsertId`. The response is a metadata object with `rows-affected` (hyphenated string), along with `operation`, `duration`, `start-time`, `end-time`, and `sql`.
**What was changed:** Updated the exec response example to show the correct metadata-wrapped format. Updated the Python code to parse `result.get('metadata', {}).get('rows-affected', 0)` instead of `result.get('rowsAffected', 0)`.

### 3. query response format incorrect (HIGH)
**What was wrong:** The blog showed the `query` response as a 2D array (`[["ORD-001", "laptop", ...]]`). The actual response returns an array of JSON objects with column names as keys (`[{"order_id": "ORD-001", "item": "laptop", ...}]`).
**What was changed:** Updated the query response example to show objects instead of arrays. Updated the Python code to access results by column name (e.g., `r["order_id"]`) instead of positional index (e.g., `r[0]`).

## Review Notes
- The binding also supports a `close` operation (to explicitly close the DB connection and return it to the pool), which is not mentioned in the post. This is a minor omission since `close` is rarely used in practice.
- The component status is `alpha` according to the Dapr component metadata. This could be worth noting for production use.
- The `import json` at the top of the Python code was already present but previously unused; it is now used by the `json.dumps()` calls for params serialization.
- The Kubernetes secret creation commands appear twice — once for the MySQL deployment and once for the binding component — with different keys. In practice these would need to be merged into a single secret or use separate secret names to avoid overwriting.
