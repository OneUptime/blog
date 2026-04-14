# Validation Summary: How to Use Dapr MySQL Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr MySQL output binding (`bindings.mysql`)
- MySQL / MariaDB
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr-client`)
- Dapr HTTP Bindings API

## Sources Consulted
- Dapr MySQL binding component reference: https://docs.dapr.io/reference/components-reference/supported-bindings/mysql/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr JavaScript SDK source (IClientBinding interface): https://github.com/dapr/js-sdk/blob/main/src/interfaces/Client/IClientBinding.ts
- Dapr Python SDK source (invoke_binding method): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK client docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/

## Issues Found

### 1. SQL and params placed in `data` instead of `metadata` (curl examples)
**What was wrong:** Both curl examples (INSERT and SELECT) passed `sql` and `params` inside the `data` field of the JSON body. The Dapr MySQL binding requires these fields in the `metadata` field.
**What was changed:** Moved `sql` and `params` from `data` to `metadata` in both curl examples.
**Why:** Per the official Dapr MySQL binding docs, the request format is `{"operation": "exec", "metadata": {"sql": "...", "params": "..."}}`.

### 2. `params` was a native JSON array instead of a JSON-encoded string (curl examples)
**What was wrong:** The `params` field was written as a native JSON array (e.g., `["u001", "Alice", "alice@example.com"]`). The Dapr MySQL binding expects `params` to be a JSON-encoded string (e.g., `"[\"u001\", \"Alice\", \"alice@example.com\"]"`).
**What was changed:** Converted all `params` values to JSON-encoded strings in the curl examples.
**Why:** The Dapr MySQL binding parses `params` as a string-encoded JSON array from the metadata.

### 3. Query response format was arrays-of-arrays instead of arrays-of-objects
**What was wrong:** The SELECT query response example showed data as arrays of arrays (`[["u001", "Alice", ...]]`). The actual Dapr MySQL binding returns arrays of objects with column names as keys.
**What was changed:** Updated the response example to `[{"id": "u001", "name": "Alice", "email": "alice@example.com"}, ...]`.
**Why:** Per official docs, the query response data contains objects where keys are column names.

### 4. Node.js SDK: sql/params passed as data instead of metadata
**What was wrong:** All `client.binding.send()` calls passed `sql` and `params` as the third argument (data). The JS SDK signature is `send(bindingName, operation, data, metadata)` — sql/params belong in the fourth argument (metadata).
**What was changed:** Changed all JS SDK calls to pass `''` as data (third arg) and `{sql, params: JSON.stringify([...])}` as metadata (fourth arg).
**Why:** The `send` method's third parameter maps to `data` in the HTTP request body, while the fourth maps to `metadata`. The MySQL binding reads sql/params from metadata.

### 5. Node.js SDK: getUserById used array destructuring instead of object destructuring
**What was wrong:** `const [id, name, email, createdAt] = rows[0]` used array destructuring, matching the incorrect array-of-arrays response format.
**What was changed:** Updated to `const { id, name, email, created_at: createdAt } = resp[0]` using object destructuring with column names.
**Why:** Since query responses return objects with column names as keys, object destructuring is required.

### 6. Python SDK: sql/params passed via `data` instead of `binding_metadata`
**What was wrong:** Both `exec_sql` and `query_sql` functions passed sql/params as a JSON-encoded `data` string. The Python SDK's `invoke_binding` method has a dedicated `binding_metadata` parameter for metadata fields.
**What was changed:** Changed to `data=''` and added `binding_metadata={'sql': sql, 'params': json.dumps(params or [])}`.
**Why:** The `invoke_binding` method signature is `invoke_binding(binding_name, operation, data, binding_metadata)`. The MySQL binding reads sql/params from metadata, which maps to `binding_metadata` in the Python SDK.

### 7. Python query result access used index-based access instead of key-based
**What was wrong:** `row[1]` and `row[2]` assumed array-based rows.
**What was changed:** Updated to `row['name']` and `row['price']` to match the object-based response format.
**Why:** Query responses return dictionaries/objects with column names as keys.

## Review Notes
- The component YAML configuration (metadata fields, URL format, connection pool settings) is correct.
- The supported operations list (exec, query, close) is accurate.
- The transaction handling caveat about no native multi-statement transaction support is a fair and accurate warning.
- The `connMaxLifetime` and `connMaxIdleTime` values of `"0"` mean no limit, which is valid but differs from the docs examples that show duration strings like `"12s"`. The values are technically correct.
