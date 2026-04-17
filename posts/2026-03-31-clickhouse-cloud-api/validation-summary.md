# Validation Summary: How to Use ClickHouse Cloud API

## Status
validated

## Post Type
Tutorial / Reference guide for using the ClickHouse Cloud REST API

## Technologies Covered
- ClickHouse Cloud REST API (v1)
- HTTP Basic authentication
- curl
- jq
- ClickHouse HTTP query interface

## Sources Consulted
- ClickHouse Cloud API overview: https://clickhouse.com/docs/cloud/manage/api/api-overview
- ClickHouse Cloud Services API reference: https://clickhouse.com/docs/cloud/manage/api/services-api-reference
- ClickHouse Cloud OpenAPI / Swagger reference: https://clickhouse.com/docs/cloud/manage/api/swagger
- ClickHouse Cloud OpenAPI getting started: https://clickhouse.com/docs/cloud/manage/openapi

## Issues Found
1. **Authentication method (incorrect)** - The post claimed the API uses Bearer token authentication. The ClickHouse Cloud API actually uses HTTP Basic Authentication with a Key ID and Key Secret pair. Updated the Authentication section, the environment variables (replacing `CLICKHOUSE_API_KEY` with `KEY_ID`/`KEY_SECRET`), and every curl example to use `--user "${KEY_ID}:${KEY_SECRET}"` instead of `-H "Authorization: Bearer ..."`.
2. **Memory field names (incorrect)** - The Create Service example used `minTotalMemoryGb` / `maxTotalMemoryGb`. These are deprecated names tied to the old `/scaling` endpoint. The current POST `/services` accepts `minReplicaMemoryGb` / `maxReplicaMemoryGb`. Renamed both fields.
3. **PATCH `ipAccessList` shape (incorrect)** - The Update Service Settings example passed `ipAccessList` as a flat array. The PATCH endpoint expects an object with `add` and/or `remove` arrays. Rewrote the body to use the `add` operation form and added a short note explaining the convention.
4. **PATCH for memory settings (incorrect)** - The Update Service Settings example also tried to update `minTotalMemoryGb` via the main service PATCH. Memory/replica scaling is updated via the dedicated `PATCH /v1/organizations/{orgId}/services/{serviceId}/replicaScaling` endpoint, not the main service PATCH. Removed the field from the body and called out the correct endpoint in the accompanying note.
5. **Rate limit values (incorrect)** - The post showed `X-RateLimit-Limit: 100` example response headers. The documented rate limit is 10 requests per 10-second window per API key (100 is the per-organization API key cap, not the request limit), and the official docs do not document `X-RateLimit-*` response headers. Replaced the misleading example headers with a prose description matching the official limits and noted the 429 response on overflow.

## Review Notes
- The Query Execution section uses `X-ClickHouse-User` / `X-ClickHouse-Key` headers and port 8443 for HTTPS, which are correct for the ClickHouse HTTP interface.
- The `tier` field is still accepted by the create endpoint but is being phased out in favor of newer scaling-based tiers - kept it as-is since it still works.
- The recommended scaling endpoint is `replicaScaling`; an older `scaling` endpoint exists but is deprecated.
- Rate-limit behavior beyond the 10/10s figure (specific headers, retry semantics) is not currently documented publicly, so the post intentionally avoids claiming specific header names.
