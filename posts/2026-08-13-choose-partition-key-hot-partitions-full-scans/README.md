# How to Choose a Partition Key Without Hot Partitions or Full Scans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Cassandra, Partition Key, Data Modeling, Query Performance, Hot Partitions

Description: Choose a partition key by measuring predicate coverage, key frequency, growth, retention, and routing behavior so reads prune and peak writes do not collapse onto one key.

---

A partition key has two jobs that can conflict: it must group data so important queries can find a small physical subset, and it must avoid concentrating too much data or traffic in that subset. With range partitioning, a timestamp is excellent for pruning time windows but sends current writes to one range. A tenant identifier is excellent for tenant reads but one large tenant can dominate a partition. A random hash spreads keys but cannot prune a time-only query.

There is no universally balanced key. Choose one from workload evidence and be explicit about the database engine, because “partition” means a table attached to a partitioned table in PostgreSQL and a set of rows sharing a partition-key value, stored on the same replica set, in Cassandra.

## Start With Query Shapes

Collect normalized query fingerprints and classify their predicates:

| Query shape | Frequency | Peak concurrency | Typical rows | Must meet |
| --- | ---: | ---: | ---: | ---: |
| tenant + bounded time | 65% | 300 | 100 | 100 ms |
| tenant only | 15% | 40 | 50,000 | 500 ms |
| bounded time across tenants | 12% | 10 | 2 million | 5 s |
| event ID lookup | 7% | 150 | 1 | 50 ms |
| unbounded export | 1% | 2 | very large | asynchronous |

The values are illustrative; instrument your own system. The key should serve the high-volume and high-criticality shapes, not every possible ad hoc query.

PostgreSQL partition pruning is driven by predicates compatible with the partition bounds. If a table is range-partitioned by <code>occurred_at</code>, a tenant-only predicate does not identify a time range. An index on <code>tenant_id</code> within every leaf can help each scan, but it does not turn a many-partition plan into a one-partition plan.

Cassandra is stricter by design. A partition key determines the replicas that store a partition, and efficient queries normally supply it. Cassandra documentation recommends query-driven modeling and often creates multiple denormalized tables for different access patterns rather than expecting one primary key to serve unrelated queries.

## Measure Candidate-Key Distribution

For each candidate, calculate more than cardinality:

- distinct values and their growth rate;
- bytes and rows per value at median, p95, p99, and maximum;
- reads and writes per value over peak one-, five-, and sixty-minute windows;
- retention horizon per value;
- late-arrival and future-dated frequency;
- null or unknown-value frequency;
- percentage of important queries that constrain the complete key.

For PostgreSQL source data, a first-pass frequency check might be:

~~~sql
SELECT tenant_id,
       count(*) AS rows,
       min(occurred_at) AS oldest,
       max(occurred_at) AS newest
FROM events
GROUP BY tenant_id
ORDER BY rows DESC
LIMIT 50;
~~~

That query can itself be expensive on a large table, so run it on a replica, sample, maintained summary, or controlled analytical system as appropriate. Row counts also miss variable payload sizes and request rates. Combine database statistics with application telemetry.

A key with one million distinct tenants can still be terrible if a single synthetic “public” tenant carries 40% of writes. Average values hide precisely the keys that cause incidents.

## Separate Data Skew From Traffic Skew

**Data skew** means one partition contains far more rows or bytes. It increases scan, compaction, vacuum, backup, and maintenance cost.

**Traffic skew** means one partition receives a disproportionate share of operations. It can be hot even while small-for example, a newly launched live event.

Hashing distributes distinct key values but does not split one value. In Cassandra, all rows sharing a partition key go to the same replica set. Virtual nodes help distribute token ranges among physical nodes; they do not cause one partition key to span multiple replica sets. In PostgreSQL, hash partitioning on <code>tenant_id</code> maps that tenant to one leaf partition.

Treat the largest key as a workload of its own. Ask whether it needs an additional bucket component, dedicated placement, rate limiting, caching, or a separate table.

## Use Time Buckets to Bound Growth

For append-heavy tenant data, a compound logical key such as tenant plus month can bound partition size:

~~~sql
CREATE TABLE events_by_tenant_month (
    tenant_id bigint,
    month_start date,
    occurred_at timestamp,
    event_id uuid,
    payload text,
    PRIMARY KEY ((tenant_id, month_start), occurred_at, event_id)
);
~~~

This is Cassandra CQL: the double parentheses make <code>(tenant_id, month_start)</code> the composite partition key, while <code>occurred_at</code> and <code>event_id</code> are clustering columns. Reads must calculate the months covered by a time range and query those partitions. The benefit is bounded growth; the cost is read fan-out across buckets.

Apache Cassandra's official data-modeling guidance calls this technique bucketing and stresses finding moderate-sized partitions. Bucket size is workload-specific. Daily buckets may be too small for a quiet tenant and hourly buckets may create excessive fan-out; annual buckets may remain too large for a busy tenant.

In PostgreSQL, time-bucketed range partitioning is physical DDL rather than a CQL primary-key definition:

~~~sql
CREATE TABLE events (
    tenant_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    event_id uuid NOT NULL
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026_08
    PARTITION OF events
    FOR VALUES FROM (TIMESTAMPTZ '2026-08-01 00:00:00+00')
                 TO (TIMESTAMPTZ '2026-09-01 00:00:00+00');
~~~

Add a local <code>(tenant_id, occurred_at)</code> index to serve tenant-and-time lookups. If the active time partition is still operationally hot, range partitions can be subpartitioned by hash on tenant, but remember that all leaves remain on the same PostgreSQL server unless the surrounding architecture distributes them.

## Salt Only With a Read Plan

Salting appends a deterministic bucket:

~~~text
logical key: account-42
physical keys: (account-42, 0) ... (account-42, 15)
write bucket: stable_hash(event_id) mod 16
~~~

This spreads writes for one logical key across 16 physical partitions. It also means a read for the complete logical key must query 16 buckets and merge results. If an exact event ID is available, the same stable hash can target one bucket. A time-range read may need all buckets for each time bucket.

Never choose a random salt without storing enough information to reproduce routing. Never silently change the bucket count: <code>mod 16</code> and <code>mod 32</code> can map existing values differently. Version the scheme or keep a directory describing which bucket generations contain a logical key.

Salt only known hot keys when possible. Applying 64-way salting to every low-volume tenant creates sparse partitions and fan-out without meaningful distribution benefit.

## Align Retention and Constraints

A good key also groups data that leaves together. PostgreSQL can detach a complete time partition far faster than deleting old rows individually and avoids the vacuum overhead of that bulk delete. A tenant partition is less useful for global time retention because every tenant leaf contains old and new rows.

Constraints may narrow the choice. PostgreSQL requires a primary or unique constraint declared on a partitioned parent to include all partition-key columns, and the partition key cannot use expressions for that constraint. MySQL requires every unique key on a partitioned table to include every column used in the partitioning expression. If the business identifier is globally unique without the partition key, decide how that invariant will be enforced before migration.

Cassandra's primary-key composition and column types cannot be changed with <code>ALTER TABLE</code>. Changing the partition key means a new table and data migration.

## Validate Pruning and Routing

For PostgreSQL, create a production-shaped prototype and use:

~~~sql
EXPLAIN (ANALYZE, BUFFERS, SETTINGS)
SELECT *
FROM events
WHERE tenant_id = 42
  AND occurred_at >= TIMESTAMPTZ '2026-08-13 10:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-08-13 11:00:00+00';
~~~

Check which leaves execute, planning time, actual rows, and buffers. Test prepared statements too, because execution-time pruning can differ from a custom plan with constants.

For Cassandra, test exact CQL query shapes against a cluster-sized dataset. Use <code>nodetool getendpoints</code> for specific partition keys, <code>nodetool tablestats</code> for table-level partition-size metrics, and request/latency metrics by node. Do not infer evenness from token ownership alone; workload frequency matters.

Include failure cases:

- no partition predicate;
- a hottest tenant at peak rate;
- a query spanning the maximum supported time window;
- late records crossing old buckets;
- unknown region or category;
- bucket-count evolution;
- retries and duplicate writes during migration.

## Use an Explicit Scorecard

Score each candidate against required behavior:

~~~text
candidate                           query coverage   max-key load                                 retention   fan-out
PostgreSQL time range               high for time    hot current                                  excellent   all time leaves for tenant-only reads
PostgreSQL tenant hash              high for tenant  hot tenant                                   poor        all hash leaves for global-time reads
Cassandra tenant + month bucket     high combined    growth bounded; traffic not                  moderate    months in query range
PostgreSQL time then tenant hash    high combined    hot tenant stays one leaf per time bucket    excellent   time buckets × hash leaves for global reads
~~~

Reject a candidate if it violates a hard limit even when its average score is attractive. A design that serves 99.9% of tenants but lets the largest tenant destabilize a replica set is incomplete.

## Official Documentation

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: Partitioning Best Practices](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-BEST-PRACTICES)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [Apache Cassandra: CQL Data Definition and Partition Keys](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra: Evaluating and Refining Data Models](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_refining.html)
- [Apache Cassandra: Dataset Partitioning](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Apache Cassandra: nodetool getendpoints](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/getendpoints.html)
- [Apache Cassandra: nodetool tablestats](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/tablestats.html)

## Conclusion

Choose a partition key from complete query shapes, peak key frequency, partition growth, and lifecycle boundaries. Hashing many distinct values does not cure one hot value, and a key that distributes writes can force broad read fan-out. Bound large logical keys with time buckets or targeted deterministic salts, and design the corresponding read path before writing data. Then validate pruning or replica routing with production-shaped data and the hottest real keys, not averages.
