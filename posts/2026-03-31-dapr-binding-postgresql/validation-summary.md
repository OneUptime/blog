# Validation Summary: How to Configure Dapr Binding with PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings)
- PostgreSQL
- Docker
- Kubernetes (Deployment, Service, Secret)
- Python (Flask, requests)
- Dapr CLI

## Sources Consulted
- Dapr PostgreSQL Binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/postgresql/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- PostgreSQL official documentation (data types, SQL syntax)
- Kubernetes API reference (apps/v1 Deployment, v1 Service, v1 Secret)

## Issues Found

1. **Component metadata field name `url` should be `connectionString`**: The Dapr PostgreSQL binding uses `connectionString` as the metadata field name for the database connection string, not `url`. Fixed in the component YAML and the corresponding Kubernetes secret creation command.

2. **Request payload uses `data` instead of `metadata` for `sql`/`params`**: The Dapr bindings API expects `sql` and `params` to be passed in the `"metadata"` object of the request body, not in `"data"`. Fixed in all three curl examples (INSERT, SELECT, UPDATE) and in the Python helper functions (`pg_exec`, `pg_query`).

3. **`params` should be a JSON-encoded string, not a native JSON array**: Dapr binding metadata values are strings. The `params` field must be a JSON-encoded string (e.g., `"[\"value1\", \"value2\"]"`), not a native JSON array. Fixed in all curl examples and in the Python code by adding `json.dumps()` around the params list.

4. **Incorrect `exec` response format**: The blog showed `{"rowsAffected": 1}` but Dapr returns a response with a `metadata` object containing `rows-affected` (hyphenated, string value), `operation`, and `sql` fields. Fixed the response example and the Python `delete_order` handler to use `rows-affected` instead of `rowsAffected`.

5. **Incorrect `query` response format**: The blog showed a JSON array of objects with column-name keys, but Dapr returns a response with a `metadata` object and a `data` field containing a JSON-encoded string of arrays (array of arrays, not array of objects). Fixed the response example, the Python `pg_query` function to parse the `data` field with `json.loads()`, and the Summary section.

## Review Notes
- The blog omits the `close` operation supported by the Dapr PostgreSQL binding. This is acceptable for a tutorial focused on common CRUD operations.
- The component configuration omits the optional `auth.secretStore: kubernetes` field. This works in Kubernetes environments where it defaults to the Kubernetes secret store, but adding it would be more explicit.
- The query response returning arrays (not objects) means the Python Flask endpoints now return arrays of arrays rather than nicely keyed objects. A production application would typically map columns to dict keys for a more user-friendly API response.
- The `import json` already present in the Python code is now actively used for `json.dumps()` and `json.loads()` calls.
