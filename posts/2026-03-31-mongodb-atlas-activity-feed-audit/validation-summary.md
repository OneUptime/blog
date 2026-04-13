# Validation Summary: How to Set Up Atlas Activity Feeds for Audit Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (Activity Feed, Admin API v2, Advanced Auditing)
- cURL with HTTP Digest Authentication
- Python (requests library, HTTPDigestAuth)
- jq (JSON processing)

## Sources Consulted
- MongoDB Atlas Administration API v2 documentation — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas Events API reference — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Events
- MongoDB Atlas Auditing configuration — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Auditing
- MongoDB Atlas Activity Feed documentation — https://www.mongodb.com/docs/atlas/activity-feed/
- MongoDB Atlas API authentication (Digest Auth with programmatic API keys) — https://www.mongodb.com/docs/atlas/configure-api-access/

## Issues Found
1. **Missing Accept header on project-level events curl command**: The second curl example (querying project-level events by event type) was missing the required `Accept: application/vnd.atlas.2023-01-01+json` header for Atlas API v2. The first curl command included it correctly, making this an oversight. Added the header for consistency and correctness.

2. **Missing Accept header on auditing PATCH curl command**: The curl command for enabling Advanced Auditing was missing the required `Accept: application/vnd.atlas.2023-01-01+json` header. Atlas API v2 requires this versioned media type header on all requests. Added it alongside the existing `Content-Type` header.

## Review Notes
- The `date -u -v-1d` syntax in the first curl command is macOS-specific (the `-v` flag). On GNU/Linux systems, the equivalent would be `date -u -d "1 day ago"`. This is not incorrect but limits portability. A future revision could note this or provide both variants.
- The Python SIEM polling script does not handle pagination. With `itemsPerPage` set to 500, if more than 500 events occur in a polling interval, some would be missed. A production implementation should follow `next` links or use the `pageNum` parameter.
- The event type names listed (e.g., `USER_LOGGED_IN`, `WHITELIST_CREATED`) are representative but readers should consult the Atlas API documentation for the canonical, up-to-date list, as MongoDB has been migrating from "whitelist" terminology to "access list" and event type names evolve across API versions.
- Advanced Auditing is correctly noted as requiring M10+ tier clusters.
