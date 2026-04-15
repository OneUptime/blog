# How to Design a Multi-Tenant Schema in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Multi-Tenancy, Schema Design, Analytics, Database

Description: Learn how to design a multi-tenant schema in ClickHouse that isolates tenant data while maintaining query performance at scale.

---

## Why Multi-Tenancy in ClickHouse

ClickHouse is an ideal backend for multi-tenant analytics platforms. Its columnar storage and vectorized query execution allow you to serve dozens of tenants from a single cluster without per-tenant infrastructure overhead.

The main challenge is balancing data isolation, query performance, and operational simplicity.

## Schema Approaches

There are three common approaches: shared tables with a tenant column, per-tenant databases, or per-tenant tables.

For most use cases, a shared table with a `tenant_id` column works best because ClickHouse compresses repeated values efficiently and MergeTree partitioning lets you isolate data per tenant.

## Shared Table Design

```sql
CREATE TABLE events
(
    tenant_id   UInt32,
    event_time  DateTime,
    event_type  LowCardinality(String),
    user_id     UInt64,
    properties  String
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(event_time))
ORDER BY (tenant_id, event_time, user_id);
```

Including `tenant_id` first in the `ORDER BY` ensures the primary index is partitioned logically per tenant. Queries that filter on `tenant_id` skip all irrelevant granules.

## Row-Level Security

ClickHouse supports row policies to enforce tenant isolation at the database level:

```sql
CREATE ROW POLICY tenant_42_policy ON events
USING tenant_id = 42
TO tenant_42_role;
```

Create a separate row policy per tenant, mapping each tenant's service account to the appropriate role. You can also use `currentUser()` or `dictGet()` lookups in the `USING` clause to dynamically resolve the tenant.

## Per-Tenant TTL

You can set different data retention policies per tenant using TTL expressions:

```sql
ALTER TABLE events
MODIFY TTL event_time + INTERVAL 90 DAY DELETE
    WHERE tenant_id = 42;
```

For tenants on premium plans, extend their TTL or move data to cold storage using `TO DISK` clauses.

## Partitioning Strategy

Partitioning by `(tenant_id, toYYYYMM(event_time))` allows efficient `DROP PARTITION` for tenant offboarding without full table scans:

```sql
ALTER TABLE events
DROP PARTITION tuple(42, 202501);
```

This is far faster than `DELETE FROM events WHERE tenant_id = 42`.

## Tenant Metadata Table

Track per-tenant configuration in a separate table:

```sql
CREATE TABLE tenants
(
    tenant_id   UInt32,
    name        String,
    plan        LowCardinality(String),
    created_at  DateTime
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY tenant_id;
```

Use this for joins or to enrich dashboards with tenant context.

## Summary

Designing a multi-tenant schema in ClickHouse centers on including `tenant_id` in the partition key and sort order. This enables efficient per-tenant queries, row-level security policies, independent TTL rules, and instant tenant removal via partition drops. A shared table approach scales well without per-tenant cluster complexity. Note that if you include `tenant_id` in the partition key, keep the total number of tenants small (under ~50) to stay within ClickHouse's recommended partition count limits. For larger tenant counts, partition by time only and rely on the primary index for per-tenant filtering.
