# Validation Summary: How to Monitor ClickHouse Cloud Service Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Cloud REST API (organization usage cost endpoint)
- ClickHouse SQL (`system.parts`, TTL via `ALTER TABLE ... MODIFY TTL`)
- Bash / curl / jq
- ClickHouse Cloud console (Billing, Usage, Alerts)

## Sources Consulted
- ClickHouse Cloud API reference / Swagger: https://clickhouse.com/docs/cloud/manage/api/swagger
- ClickHouse Cloud billing overview: https://clickhouse.com/docs/cloud/manage/billing
- ClickHouse SQL reference for `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse TTL reference: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse Cloud scaling / replica parameters documentation

## Issues Found
1. **Incorrect usage cost API endpoint path.** The post used `/usageCosts` (plural). The actual endpoint is `/usageCost` (singular). Fixed.
2. **Incorrect query parameter names.** The post used `date_from` and `date_to`. The API expects `from_date` and `to_date`. Fixed.
3. **Incorrect response shape in the `jq` filter.** The post parsed `.usageCosts[]` with fields `serviceName`, `computeCost`, `storageCost`, none of which match the API. The actual response returns `result.costs[]` with `entityName` and a `metrics` object containing `computeCHC` and `storageCHC`. Rewrote the `jq` expression to match.
4. **Deprecated scaling parameter.** The post recommended `minTotalMemoryGb = 24`. This is the legacy parameter and is deprecated in the ClickHouse Cloud API because it is inaccurate for services with non-default replica counts. Replaced with the current per-replica parameter `minReplicaMemoryGb = 8` (the documented minimum for the modern parameter).

## Review Notes
- The SQL queries against `system.parts` (using `bytes_on_disk`, `data_uncompressed_bytes`, `active = 1`) and the `ALTER TABLE ... MODIFY TTL` syntax are correct.
- Cost metrics in the ClickHouse Cloud API are reported in CHCs (ClickHouse Credits), not USD. Authors may want to note that in a future revision if readers are computing dollar figures.
- The `{orgId}` placeholder in the curl example is fine for a tutorial; in production, users would substitute their organization ID from the ClickHouse Cloud console.
- Console navigation paths ("Billing" → "Usage", "Billing" → "Alerts") are plausible at the time of review but console labels can shift; readers should verify against current console UI.
- The "Development tier services that auto-pause" claim is accurate — Development services auto-pause after inactivity and stop accruing compute charges while paused.
