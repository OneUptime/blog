# Validation Summary: How to Use Last-Write-Wins Concurrency in Dapr State Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- Dapr HTTP API (v1.0 state endpoints)
- Dapr Node.js SDK (`@dapr/dapr`)
- cURL (for HTTP API examples)
- JavaScript / Node.js

## Sources Consulted
- Dapr State Management Overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/
- Dapr State API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr How-To: Save & Get State: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr JavaScript SDK source and documentation (npm `@dapr/dapr` package exports)

## Issues Found
1. **Incorrect SDK import name**: The Node.js SDK example imported `ConcurrencyOptions` from `@dapr/dapr`, which is not a valid export. The correct export for concurrency enums is `StateConcurrencyEnum`. Since the imported symbol was never actually used in the code (the examples pass string values like `'last-write'` directly in the options object, which is correct), the fix was to remove the unused incorrect import, changing `const { DaprClient, ConcurrencyOptions } = require('@dapr/dapr')` to `const { DaprClient } = require('@dapr/dapr')`.

## Review Notes
- All Dapr HTTP API endpoints, request body formats, concurrency option values (`"last-write"`, `"first-write"`), and consistency option values (`"eventual"`, `"strong"`) are correct per official documentation.
- The claim that last-write-wins is Dapr's default concurrency mode is accurate.
- The "first-write-wins" terminology used in the comparison table matches Dapr's own documentation terminology.
- The 409 conflict behavior mentioned (returned on ETag mismatch with first-write-wins) is accurate per the Dapr runtime implementation, though it is not explicitly listed in the API reference's response code table.
- The `client.state.save()` and `client.state.get()` API signatures for the Node.js SDK are correct.
- The leaderboard pattern has a race condition (read-then-write without ETags), but this is acknowledged by context ("business logic, not ETag") and is acceptable for the tutorial's purpose of demonstrating last-write-wins.
