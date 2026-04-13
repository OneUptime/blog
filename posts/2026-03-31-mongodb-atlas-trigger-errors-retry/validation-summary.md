# Validation Summary: How to Handle Trigger Errors and Retry Policies in MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- Atlas App Services (Triggers, Functions)
- Atlas App Services CLI
- Atlas Admin API v3.0

## Sources Consulted
- MongoDB Atlas App Services Admin API v3.0 — trigger creation endpoint: https://www.mongodb.com/docs/api/doc/atlas-app-services-admin-api-v3/operation/operation-admincreatetrigger
- MongoDB Atlas Database Triggers documentation: https://www.mongodb.com/docs/atlas/atlas-ui/triggers/database-triggers/
- MongoDB Atlas Trigger Configuration Parameters: https://www.mongodb.com/docs/atlas/triggers/trigger-configuration/
- Atlas Functions JavaScript Support: https://www.mongodb.com/docs/atlas/atlas-ui/triggers/functions/javascript-support/
- Atlas Functions Global Modules: https://www.mongodb.com/docs/atlas/atlas-ui/triggers/functions/globals/
- Atlas CLI `atlas logs download` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-logs-download/
- App Services CLI `appservices logs list` reference: https://www.mongodb.com/docs/atlas/app-services/cli/appservices-logs-list/
- Atlas App Services Domain Migration: https://www.mongodb.com/docs/atlas/app-services/domain-migration/

## Issues Found

1. **Trigger config JSON — `ordered` field in wrong location with wrong name**: The blog placed `"ordered": true` inside `event_processors.FUNCTION.config`. Per the Atlas Admin API schema, event ordering is controlled by the `"unordered"` boolean field (inverted semantics) in the top-level `config` object. Moved it to `config.unordered: false` and removed the incorrect field from `event_processors.FUNCTION.config`.

2. **`setTimeout` not available in Atlas Functions runtime**: The retry function used `await new Promise(resolve => setTimeout(resolve, delayMs * attempt))` for backoff delays. Atlas Functions do not support `setTimeout`, `setInterval`, or other Node.js timer APIs — calling them throws `ReferenceError`. Removed the delay logic and added a comment explaining the limitation and suggesting scheduled triggers for delayed retry processing.

3. **Invalid Atlas CLI command**: `atlas logs download --projectId <id> --type APP_SERVICES` is not a valid command. The `atlas logs download` command is for MongoDB process logs (mongod/mongos) and requires a hostname argument. App Services logs are accessed via the separate `appservices` CLI with `appservices logs list --app <app-id> --errors`. Fixed the command accordingly.

4. **Deprecated Admin API base URL**: The blog used `realm.mongodb.com` which is the legacy domain. MongoDB migrated to `services.cloud.mongodb.com` as the canonical base URL for the App Services Admin API. Updated the URL.

5. **Summary claimed "exponential backoff" but code used linear backoff**: The original retry delay was `delayMs * attempt` (linear: 500ms, 1000ms, 1500ms), not exponential. Since delays were removed entirely (due to `setTimeout` unavailability), changed "exponential backoff retries" to just "retries" in the summary paragraph.

6. **Missing Content-Type header on HTTP POST**: The `context.http.post()` call did not set a `Content-Type` header. Added `headers: { "Content-Type": ["application/json"] }` to match the Atlas Functions HTTP client format where header values are arrays of strings.

## Review Notes
- The `withRetry` function parameter `delayMs` was removed since delays cannot be implemented in Atlas Functions. For production use cases requiring backoff between retries, the post correctly suggests using a dead-letter collection with a scheduled trigger for reprocessing.
- The Atlas Functions runtime has a 300-second execution time limit for trigger-invoked functions. The retry pattern (now immediate retries) should stay well within this limit.
- The dead-letter queue pattern and try-catch examples are sound and use correct Atlas Functions APIs (`context.services.get()`, `context.app.id`, change event properties).
