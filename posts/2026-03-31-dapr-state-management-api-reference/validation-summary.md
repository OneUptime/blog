# Validation Summary: How to Use the Dapr State Management API Reference

## Status
validated

## Post Type
Reference

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr State Management API (HTTP/REST)
- Key-value state stores (Redis, Cosmos DB, DynamoDB, PostgreSQL)

## Sources Consulted
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Management Overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/

## Issues Found
1. **Concurrency Options table had swapped descriptions.** The `first-write` option was described as "Last writer wins (default)" and `last-write` was described as "First writer wins, reject concurrent writes." This is backwards. Per the official Dapr documentation:
   - `first-write` means **first writer wins** — uses ETags for optimistic concurrency control; subsequent writes with mismatched ETags are rejected.
   - `last-write` means **last writer wins** — the most recent write always succeeds, and this is the **default** behavior when ETags are omitted.
   - Fixed the table to correctly describe each option and assign the default to `last-write`.

## Review Notes
- The State Query API correctly uses the `/v1.0-alpha1/` prefix, reflecting its alpha status. This may change in future Dapr releases.
- All endpoint paths, HTTP methods, request body formats, and curl examples are correct and match the official Dapr API reference.
- The consistency options table is accurate: `eventual` is the default, `strong` requires store support.
