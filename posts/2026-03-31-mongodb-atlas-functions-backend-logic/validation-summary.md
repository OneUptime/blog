# Validation Summary: How to Write Atlas Functions for Backend Logic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas App Services (Atlas Functions)
- Serverless JavaScript execution in Atlas
- `context.services` API for MongoDB access
- `context.http` API for external HTTP requests
- `context.values` API for accessing secrets/values
- Atlas HTTPS Endpoints
- Atlas CLI (`appservices` command)
- App Services configuration (functions directory structure)

## Sources Consulted
- MongoDB Atlas App Services Functions documentation (https://www.mongodb.com/docs/atlas/app-services/functions/)
- MongoDB Atlas App Services HTTP requests documentation (`context.http` actions reference)
- MongoDB Atlas App Services CLI reference for `appservices function run`
- MongoDB Atlas App Services configuration file reference (functions/config.json)
- MongoDB docs-app-services source repository for `extracts-http-action.yaml` and `context.txt`

## Issues Found
1. **Double-encoding in HTTP request body (line 56)**: The code used both `body: JSON.stringify({ orderId })` and `encodeBodyAsJSON: true` simultaneously. The `encodeBodyAsJSON` option tells Atlas to automatically call `EJSON.stringify()` on the body object, so passing an already-stringified body causes double-encoding. **Fix**: Removed `encodeBodyAsJSON: true` since the body is already manually stringified with `JSON.stringify()`. This is the preferred approach when calling third-party APIs that expect standard JSON rather than EJSON.

## Review Notes
- The `--args` flag in the `appservices function run` command is typed as a `stringArray` where each `--args` flag corresponds to one positional parameter. The blog passes a single JSON object which is correct for this function's signature (single `payload` parameter), but readers should be aware that multi-parameter functions require separate `--args` flags per argument.
- The `encodeBodyAsJSON` option uses `EJSON.stringify()` (not `JSON.stringify()`), which may add type metadata. For external API calls, manually stringifying with `JSON.stringify()` is generally safer to ensure standard JSON output.
- Atlas App Services was formerly known as MongoDB Realm. The post correctly uses the current naming.
