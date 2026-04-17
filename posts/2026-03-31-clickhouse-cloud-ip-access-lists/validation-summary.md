# Validation Summary: How to Configure IP Access Lists in ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Cloud REST API (`api.clickhouse.cloud/v1`)
- curl
- jq
- CIDR notation / IP allowlisting

## Sources Consulted
- ClickHouse Cloud Services API reference: https://clickhouse.com/docs/cloud/manage/api/services-api-reference
- ClickHouse Cloud "Setting IP Filters" documentation: https://clickhouse.com/docs/cloud/security/setting-ip-filters
- ClickHouse Cloud API overview: https://clickhouse.com/docs/cloud/manage/api/api-overview
- ClickHouse Cloud OpenAPI / Swagger spec: https://clickhouse.com/docs/cloud/manage/api/swagger
- ClickHouse Cloud API usage knowledge base: https://github.com/ClickHouse/clickhouse-docs/blob/main/knowledgebase/clickhouse_cloud_api_usage.mdx

## Issues Found
1. **Incorrect JSON path in the GET example.** The original `jq` filter was `.service.ipAccessList`, but ClickHouse Cloud API responses are wrapped in a top-level `result` object (alongside `status` / `requestId`), not `service`. Updated the filter to `.result.ipAccessList`.
2. **Wrong PATCH request body shape for `ipAccessList`.** The original example sent `ipAccessList` as a flat array of entries. The ClickHouse Cloud API actually expects an object with `add` and/or `remove` arrays (`{"ipAccessList": {"add": [...], "remove": [...]}}`). Rewrote both PATCH examples (the multi-entry update and the "Allow all" example) to use the `add` sub-field, and added a small `remove` example so readers know how to delete entries. Also added the missing `Content-Type: application/json` header to the "Allow all" example for consistency with the other PATCH call.

## Review Notes
- The post is IPv4-only in its examples, which matches the current ClickHouse Cloud limitation ("The system currently supports only IPv4 addresses and applies only to public internet connections outside PrivateLink"). Worth keeping in mind if/when ClickHouse Cloud adds IPv6 support.
- The default-allow behavior described in the post matches the current docs, which warn that leaving services open can lead to crawlers waking idle services and incurring unexpected cost.
- The non-API content (console steps, CIDR examples, `checkip.amazonaws.com`, best practices) is accurate and unchanged.
- The example IP ranges use documentation prefixes (`203.0.113.0/24`, `198.51.100.0/24` from RFC 5737) which is the correct convention.
