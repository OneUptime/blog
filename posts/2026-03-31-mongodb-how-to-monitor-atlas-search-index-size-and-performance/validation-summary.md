# Validation Summary: How to Monitor Atlas Search Index Size and Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas Search
- mongot (Lucene-based search process)
- MongoDB Aggregation Framework (`$searchMeta`, `$search`, `$$SEARCH_META`)
- Atlas Administration API v1.0
- Atlas Search Metrics and Alerts
- curl / jq for API interaction

## Sources Consulted
- MongoDB Atlas Search documentation: https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB `$searchMeta` aggregation stage documentation: https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/#-searchmeta
- MongoDB Atlas Administration API (Digest Authentication): https://www.mongodb.com/docs/atlas/configure-api-access/
- MongoDB Atlas Search explain documentation: https://www.mongodb.com/docs/atlas/atlas-search/explain/
- MongoDB Atlas Alerts API documentation: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Alert-Configurations
- Companion blog post in this repo: `posts/2026-03-31-mongodb-how-to-use-atlas-administration-api-for-automation/README.md` (confirmed `--digest` flag usage)

## Issues Found

1. **Missing `--digest` flag on all curl commands** — The MongoDB Atlas Administration API uses HTTP Digest Authentication. All four curl commands in the post used `curl -u "publicKey:privateKey"` without the `--digest` flag, which causes curl to send Basic auth instead. Fixed by adding `--digest` to all curl commands. This was cross-referenced with the companion blog post on Atlas Administration API which correctly uses `--digest`.

2. **Incorrect explain output guidance for `$search` queries** — The post listed `IXSCAN` (index scan) and `COLLSCAN` (collection scan) as things to look for in `$search` explain output. These are standard MongoDB query plan stages and do not appear in Atlas Search explain output. Atlas Search queries are executed by the mongot process, and the explain output shows mongot-specific stages (`$_internalSearchMongotRemote`, `$_internalSearchIdLookup`). Also replaced `timeMillis` with `executionTimeMillisEstimate`, which is the per-stage timing metric available in aggregation explain output.

## Review Notes
- The post uses Atlas Admin API v1.0 (`/api/atlas/v1.0/`). MongoDB is transitioning to API v2 (`/api/atlas/v2/`). While v1.0 still works, future readers may want to use v2 endpoints.
- The alert event type `SEARCH_INDEX_WRITE_FAILED` could not be independently verified against the full list of Atlas alert event types. The general structure of the alert API call is correct, but readers should verify the exact event type name in the current Atlas API documentation.
- The `$searchMeta` with `count: {}` syntax is valid — the `type` field defaults to `"lowerBound"` when omitted.
- The `$$SEARCH_META` usage inside `$facet` is correct and follows documented patterns.
- The index definition example with `dynamic: false` and explicit field mappings is a solid best practice recommendation.
