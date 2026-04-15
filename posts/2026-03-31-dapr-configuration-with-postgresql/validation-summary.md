# Validation Summary: How to Use Dapr Configuration with PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API
- PostgreSQL (LISTEN/NOTIFY, triggers, JSONB)
- Kubernetes (secrets)
- Python (httpx async HTTP client)
- SQL (DDL, DML, upserts)

## Sources Consulted
- Dapr PostgreSQL Configuration Store reference: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/postgresql-configuration-store/
- Dapr Configuration API building block: https://docs.dapr.io/developing-applications/building-blocks/configuration/
- Dapr Configuration API HTTP reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr GitHub repository (components-contrib, PostgreSQL configuration component source)

## Issues Found

1. **Incorrect metadata field name `connMaxIdleTime`** (line 62): The blog used `connMaxIdleTime` but the correct Dapr metadata field is `connectionMaxIdleTime`. The incorrect name would be silently ignored, leaving the default value in effect. Fixed to `connectionMaxIdleTime`.

2. **Outdated API endpoint `/v1.0-alpha1/configuration/`** (lines 93, 105): The Dapr Configuration API graduated from alpha to stable in Dapr v1.11.0. The correct endpoint is `/v1.0/configuration/`. The alpha endpoint is deprecated. Fixed both the curl command and the Python code to use `/v1.0/`.

3. **Incorrect LISTEN/NOTIFY trigger function** (lines 28-38): The blog's trigger used a custom function name (`notify_config_change`), wrong channel name (`config_update` instead of `config`), and a simplified payload format (`row_to_json(NEW)` instead of the required `json_build_object('table', TG_TABLE_NAME, 'action', TG_OP, 'data', data)` wrapper). It also did not handle DELETE operations. This would break Dapr configuration subscriptions since the Dapr component expects the specific channel name and payload structure. Fixed to match the official Dapr documentation trigger (`configuration_event` function with correct channel, payload format, and DELETE handling).

4. **Incorrect HTTP response parsing in Python** (line 108): The code used `resp.json()["items"].items()` but the Dapr Configuration GET API returns a flat map (e.g., `{"key": {"value": "..."}}`) without an `"items"` wrapper. This would cause a `KeyError` at runtime. Fixed to `resp.json().items()`.

## Review Notes
- The table schema uses `TEXT` instead of `VARCHAR` and `JSONB` instead of `JSON` for column types. These are functionally equivalent in PostgreSQL and will work correctly with Dapr, though the official documentation uses `VARCHAR` and `JSON`.
- The `updatetime` column in the schema is not required by Dapr (which only needs key, value, version, metadata). It is a useful custom addition for operational queries demonstrated later in the post, but readers should know it is optional.
- The `version` column default of `'1'` is a custom addition not in the official schema, but is a reasonable convenience.
- The `||` separator in configuration keys (e.g., `payment-service||max-retries`) is a convention chosen by the author, not a Dapr requirement. It works fine but readers should know they can use any key naming scheme.
