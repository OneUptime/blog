# Validation Summary: How to Archive Data from Atlas to S3 Using Online Archive in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Atlas Online Archive
- Atlas Data Federation
- Atlas Administration API (v1.0)
- AWS S3 (as underlying object storage)
- curl (CLI HTTP client)

## Sources Consulted
- MongoDB Atlas Online Archive API v2 OpenAPI specification (via atlas-sdk-go auto-generated source)
- MongoDB Atlas Admin API `BackupOnlineArchiveCreate` schema — verified `schedule`, `criteria`, `partitionFields` field structures
- MongoDB Atlas Admin API `BackupOnlineArchive` response schema — verified response fields (`_id`, `clusterName`, `collName`, `criteria`, `paused`, `state`, etc.)
- MongoDB Atlas Admin API `PartitionField` schema — verified `fieldName`, `order` (required), `fieldType` (read-only)

## Issues Found

### 1. Incorrect pause API payload (line 153)
**What was wrong:** The PATCH request to pause an archive used `{"state": "PAUSED"}`. The `state` field is read-only in the API and cannot be set by the client.
**What was changed:** Replaced with `{"paused": true}`, which is the correct way to pause an online archive per the API specification. Also added the missing `Content-Type: application/json` header for consistency with the POST request earlier in the post.

### 2. Fabricated `stats` object in API response example (lines 138-143)
**What was wrong:** The monitoring response example included a `stats` object with `bytesArchived` and `numDocuments` fields. These fields do not exist in the Atlas Online Archive API response schema (`BackupOnlineArchive`).
**What was changed:** Replaced the response example with actual fields from the API response: `_id`, `clusterName`, `collName`, `dbName`, `paused`, `state`, and `criteria`.

## Review Notes
- The `partitionFields` in the create request include `fieldType`, which is technically a read-only field (auto-populated by the server). Including it in POST requests is harmless (the API ignores it), but readers should know they don't need to specify it. This was left as-is since it's not incorrect, just unnecessary.
- The post uses Atlas Admin API v1.0 endpoints. MongoDB has been transitioning to v2 of the API. The v1.0 endpoints are still functional but users should be aware that v2 is the current recommended version.
- The federated endpoint connection string shown in the JavaScript example (`mongodb://myProject.myCluster.mongodb.net`) is a placeholder in a comment, which is acceptable since the post notes it's "shown in Atlas UI."
