# Validation Summary: How to Configure Auto-Scaling in ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Cloud API (service scaling / replicaScaling endpoints)
- curl (for REST API examples)

## Sources Consulted
- [ClickHouse Cloud API Reference — Services API](https://clickhouse.com/docs/cloud/manage/api/services-api-reference)
- [Automatic scaling | ClickHouse Docs](https://clickhouse.com/docs/manage/scaling)
- [ClickHouse Cloud Tiers documentation](https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/cloud/manage/cloud-tiers.md)
- [Smarter Auto-Scaling for ClickHouse: The Two-Window Approach](https://clickhouse.com/blog/smarter-auto-scaling)

## Issues Found
1. **Wrong API endpoint path.** The post PATCHed scaling fields to `/v1/organizations/{orgId}/services/{serviceId}` (the base service endpoint). Scaling configuration is not accepted there — it must target the dedicated scaling sub-resource. Updated all three `curl` examples to target `/v1/organizations/{orgId}/services/{serviceId}/replicaScaling`.
2. **Deprecated field names.** The post used `minTotalMemoryGb` and `maxTotalMemoryGb`, which are on a deprecated endpoint and are noted as "inaccurate for services with non-default numbers of replicas." The current API uses `minReplicaMemoryGb` / `maxReplicaMemoryGb` on the `/replicaScaling` endpoint. Updated both the prose reference and the code examples to use the current field names.
3. **Semantic change from total to per-replica.** Because the new fields are per-replica rather than total, adjusted the descriptive sentence following the first example to make clear the range applies to each replica.
4. **Outdated tier reference for auto-pause.** The section "Auto-Pause for Development Services" referenced the legacy "Development tier." The tier structure was renamed to Basic / Scale / Enterprise. Per current docs, idling (auto-pause) is available on Scale and Enterprise tiers; the Basic tier is single-replica and fixed-size. Renamed the section to "Auto-Pause on Idle" and updated the body to correctly name Scale and Enterprise tiers as the ones supporting idling. Also corrected the API endpoint in that example to `/replicaScaling`.

## Review Notes
- The recommended bounds table ("Dev / staging", "Dashboards", etc.) is a reasonable set of starting points and is inherently subjective guidance, not an official documented recommendation — left unchanged.
- The post mentions checking the service activity log for scale events via the console; this is accurate.
- The `/scaling` endpoint with `minTotalMemoryGb` / `maxTotalMemoryGb` still exists but is deprecated per ClickHouse Cloud's OpenAPI spec. A future revision could mention this deprecation explicitly, but the post now uses the current endpoint and fields, so readers will land on the recommended path.
- The number ranges used in examples (24–192 GB, 48 GB fixed) remain plausible per-replica values on Scale/Enterprise tiers.
