# Validation Summary: How to Prefix State Keys by Application ID in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- Redis (as example state store)
- Python (migration script using redis-py)
- Bash / curl (CLI examples)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr state management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr how-to guide on sharing state between applications: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr runtime source code (`pkg/components/state/state_config.go`): https://github.com/dapr/dapr/blob/master/pkg/components/state/state_config.go — verified `checkKeyIllegal`, `GetModifiedStateKey`, separator constant, and key prefix strategies

## Issues Found

### 1. Critical: Cross-App Key Access section was incorrect
**What was wrong:** The post claimed that one app could read another app's prefixed state by URL-encoding `||` as `%7C%7C` in the key (e.g., `curl .../statestore/orderservice%7C%7Corder-001`). This is completely wrong. Dapr's `checkKeyIllegal` function validates that user-supplied keys do not contain the `||` separator and rejects such requests with an error. There is no way to bypass the key prefix through the state API.

**What was changed:** Replaced the "Cross-App Key Access" section with a "Cross-App State Sharing" section that correctly explains you must configure a dedicated state store component with `keyPrefix: none` to share state between services.

### 2. Incomplete keyPrefix values table
**What was wrong:** The table of available `keyPrefix` values only listed `appid`, `name`, and `none`. It was missing the `namespace` strategy (which produces `{namespace}.{appId}||{key}`) and the ability to use any custom string as a prefix.

**What was changed:** Added `namespace` and custom prefix rows to the table.

### 3. Missing Content-Type header in curl example
**What was wrong:** The curl POST example under the "Switching to none Prefix" section was missing the `-H "Content-Type: application/json"` header, while the earlier POST example included it. Dapr's state API expects JSON content.

**What was changed:** Added the missing Content-Type header to the curl command.

## Review Notes
- The Python migration script works correctly for Redis but is Redis-specific. Other state stores (Cosmos DB, PostgreSQL, etc.) would need different migration approaches. This is acceptable since the post uses Redis throughout.
- The `redis-cli KEYS` commands shown in the "Verifying Key Prefixes" section work but `KEYS` is not recommended in production Redis instances as it blocks the server. `SCAN` would be safer. This is a minor operational concern, not a technical error.
- The Mermaid diagram uses `||` which may cause rendering issues in some Mermaid parsers since `|` is a special character in Mermaid syntax. This is a cosmetic concern.
