# Validation Summary: How to Manage Atlas Search Index Lifecycle

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Search
- Atlas CLI (`atlas clusters search indexes`)
- Atlas Admin API (REST)
- MongoDB Node.js Driver (`listSearchIndexes`)

## Sources Consulted
- MongoDB Atlas Search Index States documentation (https://www.mongodb.com/docs/atlas/atlas-search/)
- MongoDB Atlas CLI `atlas clusters search indexes` command reference (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-create/)
- MongoDB Atlas Admin API OpenAPI specification (https://github.com/mongodb/openapi) — `SearchIndexResponse`, `SearchIndexCreateRequest`, `SearchIndexUpdateRequest`, and `ClusterSearchIndex` schemas
- MongoDB Atlas Admin API v2 documentation (https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/)
- MongoDB Node.js Driver API reference for `Collection.listSearchIndexes()` (https://mongodb.github.io/node-mongodb-native/)

## Issues Found

### 1. Fabricated "Pausing and Resuming an Index" section (CRITICAL)
**What was wrong:** The entire section on pausing and resuming Atlas Search indexes was fabricated. There is no feature to pause or resume individual Atlas Search indexes. The `PAUSED` status in the legacy API schema refers to the entire cluster being paused, not an individual search index. The PATCH request with `{"status": "PAUSED"}` would not work — the `status` field is read-only in the API schema.
**What was changed:** Removed the entire "Pausing and Resuming an Index" section. Removed "pause" from the post description. Removed pause references from the summary paragraph.

### 2. Missing FAILED state in lifecycle diagram
**What was wrong:** The state diagram omitted the FAILED state, which occurs when an index definition is invalid and the build fails.
**What was changed:** Added `FAILED (if the index definition is invalid)` to the state diagram.

### 3. PAUSED listed as a valid index state
**What was wrong:** The state diagram included `PAUSED` as a valid Atlas Search index state with a transition from READY. This is incorrect — individual search indexes cannot be paused.
**What was changed:** Removed the `READY -> PAUSED -> READY` transition from the state diagram.

### 4. Deprecated API version (v1.0)
**What was wrong:** The Atlas Admin API URLs used `v1.0` (e.g., `https://cloud.mongodb.com/api/atlas/v1.0/groups/...`), which is deprecated.
**What was changed:** Updated all API URLs to use `v2` (e.g., `https://cloud.mongodb.com/api/atlas/v2/groups/...`).

## Review Notes
- The index definition JSON uses the legacy flat format with `mappings` at the top level. This is correct for the `/fts/indexes` API path used in the post. The newer `/search/indexes` endpoint expects `mappings` nested inside a `definition` object. Since the post uses the legacy path consistently, this is acceptable.
- The `DOES_NOT_EXIST` status also exists in the API schema but is an edge case not typically relevant to lifecycle management, so its omission is acceptable.
- The Atlas CLI commands are correct and match current documentation.
- The Node.js `listSearchIndexes()` usage is correct.
- The claim about indexes remaining queryable during rebuild after an update is accurate per MongoDB documentation.
