# Validation Summary: How to Use Dapr PostgreSQL Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings building block)
- PostgreSQL
- Node.js with `@dapr/dapr` JavaScript SDK
- Python with `dapr` Python SDK

## Sources Consulted
- Dapr PostgreSQL output binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/postgresql/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr JavaScript SDK (`@dapr/dapr`): https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Python SDK: https://docs.dapr.io/developing-applications/sdks/python/

## Issues Found

### 1. SQL and params placed in `data` instead of `metadata` (curl examples)
**What was wrong:** Both curl examples passed `sql` and `params` inside the `"data"` field of the request body. The Dapr PostgreSQL binding expects these in the `"metadata"` field.
**What was changed:** Moved `sql` and `params` from `"data"` to `"metadata"` in both the INSERT and SELECT curl examples.

### 2. `params` must be a JSON-encoded string, not a JSON array (curl examples)
**What was wrong:** The `params` field was shown as a native JSON array (e.g., `["order-001", "Alice", 149.99]`). The Dapr PostgreSQL binding expects `params` to be a string containing a JSON array (e.g., `"[\"order-001\", \"Alice\", 149.99]"`).
**What was changed:** Updated `params` in both curl examples to be JSON-encoded strings.

### 3. Incorrect query response format
**What was wrong:** The query response was shown as a plain JSON array (`[["order-001", "Alice", 149.99], ...]`). The actual Dapr binding response includes a `metadata` object and a `data` field that is a JSON-encoded string.
**What was changed:** Updated the response example to show the correct structure with `metadata` and `data` as a JSON-encoded string.

### 4. Node.js SDK: SQL/params passed as data instead of metadata
**What was wrong:** All `client.binding.send()` calls passed `{sql, params}` as the third argument (data). In the Dapr JS SDK, `binding.send()` takes `(name, operation, data, metadata)` -- SQL and params belong in the fourth argument (metadata), with data as an empty string.
**What was changed:** Updated all JS examples to pass `''` as the data argument and `{sql, params}` as the metadata argument. Also wrapped `params` values with `JSON.stringify()` since the binding expects a JSON-encoded string.

### 5. Python SDK: SQL/params passed as data instead of binding_metadata
**What was wrong:** Both Python functions passed SQL and params via `data=json.dumps({...})`. The Dapr Python SDK's `invoke_binding()` method has a `binding_metadata` parameter for passing metadata key-value pairs, which is where `sql` and `params` should go.
**What was changed:** Replaced `data=json.dumps({...})` with `binding_metadata={'sql': sql, 'params': json.dumps(...)}` in both functions.

## Review Notes
- The Python `insert_record` function uses f-string interpolation for the table name (`f'INSERT INTO {table} ...'`), which could be a SQL injection vector if `table` comes from user input. This is noted but not changed since the blog post has a dedicated section on SQL injection prevention that covers the value-parameter case, and table names cannot be parameterized in standard SQL.
- The component type `bindings.postgresql` and metadata field `connectionString` are correct.
- The supported operations list (`exec`, `query`, `close`) is accurate.
- The secret store reference format is correct.
