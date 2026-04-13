# Validation Summary: How to Use Atlas Online Archive for Cold Data Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Atlas Online Archive
- Atlas Admin API (v2)
- Atlas Data Federation (federated query endpoint)
- Cloud object storage (S3-compatible cold storage)

## Sources Consulted
- MongoDB Atlas Admin API v2 OpenAPI Specification (https://github.com/mongodb/openapi)
- MongoDB Atlas Online Archive Documentation (https://www.mongodb.com/docs/atlas/online-archive/configure-online-archive/)
- MongoDB Atlas Admin API v2 Online Archive Reference (https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Online-Archive)

## Issues Found

1. **Deprecated API version in all endpoint URLs**: All API calls used `/api/atlas/v1.0/` which is the deprecated Atlas Admin API version. Updated all occurrences to `/api/atlas/v2/` (Steps 3, 6, 7, and 8).

2. **Incorrect pause request body (Step 8)**: The PATCH request to pause an archive used `{"state": "PAUSED"}`. The `state` field is read-only in the API response. The correct field to pause an archive is `{"paused": true}`. Fixed the request body accordingly.

3. **Missing Content-Type header on PATCH request (Step 8)**: The pause PATCH request was sending a JSON body without the `Content-Type: application/json` header. Added the missing header.

4. **Misleading comment in Step 5**: The code comment said "Use $expr with date comparison for archive-targeted queries" but the code did not use `$expr` at all — it uses a standard `$match` with a date comparison. Updated the comment to accurately describe what the code does.

## Review Notes
- The `fieldType` property included in partition fields (Step 3) is marked as `readOnly` in the v2 API OpenAPI spec, meaning the server infers it. Including it in the request is harmless (it gets ignored) but unnecessary. Left as-is since it aids readability and many official examples include it.
- Cost figures are labeled as approximate, which is appropriate since pricing varies by region and changes over time.
- The post correctly notes that Online Archive requires M10+ clusters.
- The custom query archiving example (Step 6) uses Extended JSON format for the query string, which is the correct format for the API.
