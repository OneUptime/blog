# Should a Multi-Tenant Table Partition by Tenant, Time, or Both?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Multi-Tenancy, Table Partitioning, Data Retention, Query Performance, Row-Level Security

Description: Choose tenant, time, or two-level PostgreSQL partitioning from query routing, tenant skew, retention, uniqueness, security, and the full hierarchy's operating cost.

---

A multi-tenant table has at least two natural dimensions: tenant and time. Tenant-based partitioning helps queries that always identify a tenant; time-based partitioning helps bounded queries and retention; two-level partitioning can support both but multiplies objects. None automatically isolates a tenant's compute, storage failure, or permissions.

Choose the hierarchy from the most important operation that must become cheap, then verify what becomes expensive.

## Start With the Workload Matrix

Measure query and lifecycle shapes:

| Operation | Predicate | Frequency | Peak skew |
| --- | --- | ---: | ---: |
| tenant API read | tenant + bounded time | 70% | largest tenant 35% |
| tenant export | tenant only | 10% | large result |
| fleet dashboard | bounded time | 12% | all tenants |
| support lookup | event ID | 6% | one row |
| retention | time cutoff | scheduled | all tenants |
| tenant deletion | tenant | rare | potentially huge |

A design optimized only for the 70% path may make retention or the largest tenant unsafe. State hard latency and deletion objectives for every supported shape.

## Option 1: Range Partition by Time

~~~sql
CREATE TABLE events (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (tenant_id, event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026_08 PARTITION OF events
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00');

CREATE INDEX events_tenant_time_idx
ON events (tenant_id, occurred_at DESC);
~~~

This is strong when global retention removes whole months and most reads include time. A tenant-and-time query prunes by time and can use the tenant index inside selected leaves.

A tenant-only export cannot prune time leaves. PostgreSQL may use each local tenant index, but it still plans across the retention horizon. Tenant deletion is also row-level work across every time partition unless the tenant owns the whole table or another design is used.

Current writes concentrate in the newest time leaf. This rotates index working sets but does not add server capacity.

## Option 2: Hash Partition by Tenant

~~~sql
CREATE TABLE events (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (tenant_id, event_id)
) PARTITION BY HASH (tenant_id);

CREATE TABLE events_h0 PARTITION OF events
FOR VALUES WITH (MODULUS 16, REMAINDER 0);
~~~

Create all remainders 0 through 15. Equality on tenant can prune to one leaf. A fixed hash count avoids one table per tenant and distributes distinct tenants among leaves.

It does not split a single hot tenant: all its rows still map to one leaf. It also makes global time retention a row-level delete in every hash leaf. Time indexes can make those deletes find rows, but they still produce dead tuples and vacuum work.

The hash partitions shown here are local relations on one PostgreSQL server. They do not create tenant failure domains. A noisy tenant can still exhaust shared CPU, WAL, buffer cache, connections, and storage throughput.

## Avoid One List Partition per Unbounded Tenant

List partitioning one customer per leaf looks attractive:

~~~sql
PARTITION BY LIST (tenant_id)
~~~

It permits a whole-tenant detach, but object count grows with customer count. Provisioning becomes part of tenant creation, unknown tenants need handling, and thousands of leaf indexes accumulate. PostgreSQL's partitioning best-practices section explicitly suggests a reasonable number of hash partitions instead of list partitioning by customer when the customer count may grow beyond a practical partition count.

List partitions can be reasonable for a small, stable set of operational classes-for example, a few residency regions or dedicated enterprise tenants plus a shared default. Do not confuse “currently 40 tenants” with a governed maximum.

## Option 3: Time Then Tenant Hash

Create a monthly parent that is itself hash-partitioned:

~~~sql
CREATE TABLE events (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (tenant_id, event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026_08 PARTITION OF events
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00')
PARTITION BY HASH (tenant_id);

CREATE TABLE events_2026_08_h0 PARTITION OF events_2026_08
FOR VALUES WITH (MODULUS 16, REMAINDER 0);
~~~

Create all hash remainders for every month. A bounded tenant query can prune by month and then tenant bucket. Global monthly retention can detach or drop the month subtree as one top-level partition.

The cost is object multiplication. Thirty-six retained months times 16 hash leaves equals 576 leaves; four hierarchy-wide indexes create 2,304 leaf index objects, plus partitioned index objects at the root and monthly parents. Provisioning must create and verify every remainder before the month opens.

This order is often preferable when global time retention is the dominant lifecycle operation.

## Option 4: Tenant Hash Then Time

The root can hash by tenant, and each hash leaf can range-partition by time. A tenant equality first selects one hash subtree, then a time range narrows its leaves.

Global monthly retention now requires operating on the monthly leaf below every hash bucket. That may be acceptable with reviewed automation, but it is not one detach. Tenant-specific deletion still cannot detach one tenant because the hash leaf contains many tenants.

This order can be useful when tenant-only queries dominate and each tenant bucket has long time history, but compare it directly with time-first using the full hierarchy.

## Dedicated Tenants Need Placement, Not Just Partitions

If one tenant needs independent maintenance, encryption keys, recovery, regional placement, or compute, a child table on the same primary may not meet the requirement. Consider:

- a database on a separate PostgreSQL cluster or shard for the tenant;
- a routing directory mapping tenants to placements;
- local time partitioning within each placement;
- a migration protocol for promoting a tenant from shared to dedicated.

A hybrid can reserve list partitions for a small governed set of dedicated tenants while hashing the shared population, but PostgreSQL's declarative bounds and default behavior need a carefully tested hierarchy. Often application-level database routing makes the failure boundary clearer.

## Partitioning Is Not Tenant Authorization

PostgreSQL row-level security restricts which rows a role can read or modify according to policies. Partition pruning is a performance optimization. A tenant partition does not replace RLS, grants, parameter validation, or a secure connection identity.

Policies declared on the partitioned parent apply when users access the parent according to PostgreSQL's RLS and inheritance behavior, but direct child access, table ownership, <code>BYPASSRLS</code>, and security-definer functions require review. Test authorization through every supported access path and deny direct child privileges unless intentionally needed.

Do not expose physical partition names to tenants as a security mechanism.

## Preserve Keys and Foreign Keys

PostgreSQL requires a parent primary or unique constraint to include all partition-key columns. A time-partitioned event key often becomes:

~~~sql
PRIMARY KEY (tenant_id, event_id, occurred_at)
~~~

This does not enforce global uniqueness of <code>(tenant_id, event_id)</code> across time. If event ID must be tenant-globally unique, use a compatible partition key, a separate registry, or an explicitly accepted ID-generation guarantee.

For multi-level partitioning, make the unique tuple compatible with each partitioned level. The example includes tenant and time, so equal full keys route together throughout the hierarchy.

Foreign keys referencing a partitioned parent must target a valid unique key. Foreign keys from events to tenants usually reference a non-partitioned tenants registry:

~~~sql
FOREIGN KEY (tenant_id) REFERENCES tenants (tenant_id)
~~~

Index referencing columns where parent deletion or update must find rows. A cascade over a large tenant can cross many leaves and should be load-tested.

## Score the Alternatives

| Requirement | Time | Tenant hash | Time then hash | Tenant then time |
| --- | --- | --- | --- | --- |
| global time retention | strongest | row deletes | strongest | many detach operations |
| tenant + time query | time prune + index | tenant prune + index | two-stage prune | two-stage prune |
| tenant-only query | all time leaves | one bucket | all months, one bucket each | one subtree |
| one-tenant detach | no | no, shared bucket | no | no |
| object count | low | fixed low | multiplied | multiplied |
| hot single tenant | local index pressure | one hot bucket | one hot leaf per active time | one hot subtree |

Replace “strongest” with measured latency, locks, and I/O. Include the largest tenant and maximum retention horizon.

## Validate at Production Shape

For each candidate:

1. Build all expected leaves and indexes.
2. Load real tenant and time skew.
3. Replay normal and maximum query windows.
4. measure planning, buffers, and p99 execution;
5. replay the largest tenant's write rate;
6. rehearse global retention and tenant deletion;
7. test RLS and direct-child permissions;
8. test missing future partitions and late data;
9. measure backend memory and lock counts;
10. rehearse schema changes across the full tree.

## Official Documentation

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: Partitioning Best Practices](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-BEST-PRACTICES)
- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: Declarative Partitioning Limitations](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS)
- [PostgreSQL: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL: CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [PostgreSQL: Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL: Partition Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)

## Conclusion

Partition by time when global retention and bounded windows dominate, by a fixed tenant hash when tenant routing dominates and row-level time retention is acceptable, and by both only when measured gains justify the multiplied hierarchy. One list leaf per growing tenant is usually an object-management trap, and no local partition creates a tenant failure or security boundary. Include the hottest tenant, broadest query, retention job, uniqueness rule, and RLS path in the decision.
