# Validation Summary: How to Scale ClickHouse Cloud Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Cloud REST API (v1)
- `system.query_log` (ClickHouse SQL)
- curl, jq

## Sources Consulted
- [ClickHouse Cloud OpenAPI spec (Swagger)](https://clickhouse.com/docs/cloud/manage/api/swagger)
- [ClickHouse Cloud Services API reference](https://clickhouse.com/docs/en/cloud/manage/api/services-api-reference)
- [ClickHouse Cloud Automatic scaling docs](https://clickhouse.com/docs/manage/scaling)
- [Horizontal scaling in ClickHouse Cloud (blog)](https://clickhouse.com/blog/horizontal-scaling-in-clickHouse-cloud)
- [Make Before Break — Faster Scaling Mechanics for ClickHouse Cloud (blog)](https://clickhouse.com/blog/make-before-break-faster-scaling-mechanics-for-clickhouse-cloud)
- [clickhouse-docs Jan 2025 scaling FAQ](https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/cloud/manage/jan2025_faq/scaling.md)

## Issues Found

1. **Incorrect architecture label.** The post described ClickHouse Cloud as "shared-nothing." ClickHouse Cloud is explicitly the disaggregated compute/storage (object-store backed) model — "shared-nothing" describes the self-managed/open-source architecture, not the Cloud service. Reworded to describe compute/storage separation without the incorrect label.

2. **Incorrect claim that memory controls replica count.** The original stated that memory "controls: Number of replicas (each replica gets a share of total memory)." In ClickHouse Cloud, vertical scaling adjusts the memory per replica; the replica count is a separate dimension (set via `numReplicas`, typically 3 by default on Scale tier). Rewrote the bullet list to reflect that memory per replica controls CPU cores per replica, concurrency, and working-set size.

3. **Outdated tier name and wrong replica math.** "For Production tier, the minimum is 24 GB total memory (2 replicas x 12 GB each)" — the current tiers are Basic / Scale / Enterprise (not "Production"), and Scale tier defaults to 3 replicas with an 8 GiB-per-replica minimum (3 × 8 = 24 GiB). Updated to "Scale tier, 8 GiB per replica with 3 replicas by default (24 GiB total)."

4. **Wrong API endpoint and deprecated parameter names.** The post's `PATCH` request targeted `/v1/organizations/{orgId}/services/{serviceId}` with `minTotalMemoryGb` / `maxTotalMemoryGb`. In the current API, scaling is performed via the `/replicaScaling` sub-resource using `minReplicaMemoryGb` / `maxReplicaMemoryGb` (the older `/scaling` endpoint with total-memory parameters is marked deprecated in the OpenAPI spec). Updated the curl example, the explanatory sentence, and added a note about the deprecated endpoint. Adjusted the example values to be sensible per-replica numbers (16 / 64) rather than the old total-memory numbers (48 / 192).

5. **Incorrect jq response structure.** The `jq` filter used `.service.minTotalMemoryGb`. ClickHouse Cloud API responses are wrapped in a top-level `result` object, and the field names are the per-replica ones. Updated to `.result.minReplicaMemoryGb` / `.result.maxReplicaMemoryGb` and added `numReplicas` for completeness.

6. **"Read replicas" mischaracterization.** The horizontal-scaling section described "read replicas in the same or different regions." ClickHouse Cloud horizontal scaling adds full replicas (not read-only) via `numReplicas` on the Scale/Enterprise tiers; cross-region replication is a separate feature. Reworded to reference adjusting the number of replicas (3–20) on Scale/Enterprise tiers through the console or the `/replicaScaling` endpoint.

7. **Summary wording.** Updated the summary to say "memory per replica" rather than "total memory allocation" to be consistent with the corrected scaling model.

## Review Notes
- The SQL queries against `system.query_log` are correct and idiomatic. The `exception LIKE '%Memory limit%'` filter catches the common "Memory limit (for query/user) exceeded" errors raised by ClickHouse; `type = 'QueryStart'` is a valid enum value.
- The make-before-break claim for zero-downtime vertical scaling is accurate for Scale and Enterprise tiers per ClickHouse's official blog.
- The console navigation ("Settings" → "Compute") may drift as the ClickHouse Cloud UI evolves; worth revisiting periodically.
- The `numReplicas` range (3–20) applies to Scale tier; Enterprise tier supports the same range but with different per-replica sizing profiles. The post keeps the explanation general, which is fine.
