# Choose Hudi Record Keys, Ordering Fields, and Partition Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Data Lakehouse, Spark, Upserts, Data Modeling

Description: Learn how to model Hudi record keys, ordering fields, and partition paths so upserts remain deterministic and efficient.

---

Correct Hudi upserts begin with three independent decisions: which logical entity a row represents, which version of that entity wins, and where the row is stored. In Spark DataSource terms, those decisions map to the record key, ordering fields, and partition path.

Treating the three settings as interchangeable is a common source of silent data-quality problems. A partition path is not a primary key. An event timestamp is not automatically a unique key. A record key alone is not globally unique when the table uses a non-global index.

This guide targets Apache Hudi 1.2.x. The older `hoodie.datasource.write.precombine.field` option still appears in existing jobs, but current Hudi documentation deprecates it in favor of `hoodie.table.ordering.fields`.

## Start with the business identity

Choose a record key that is:

- Stable for the lifetime of the entity.
- Present on every update and delete.
- Deterministic across retries and backfills.
- Unique at the scope enforced by the selected index.

For an order table, `order_id` is usually a better key than a Kafka offset, ingestion UUID, or mutable customer attribute. If uniqueness requires several fields, use a composite key such as `tenant_id,order_id`.

Do not generate a fresh UUID on every retry. Hudi will correctly treat every UUID as a new entity and cannot infer that two rows describe the same order. Hudi can auto-generate keys for insert-oriented workloads, but generated keys are deliberately unsuitable when later writes must address the same logical row.

A typical Spark configuration is:

```python
hudi_options = {
    "hoodie.table.name": "orders",
    "hoodie.datasource.write.recordkey.field": "tenant_id,order_id",
    "hoodie.datasource.write.keygenerator.type": "COMPLEX",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.table.ordering.fields": "source_lsn,event_ts",
    "hoodie.datasource.write.operation": "upsert",
}
```

Hudi materializes the generated key in `_hoodie_record_key`. That protects the identity already written to the table even if a later job changes its key-generation configuration. Changing the key design nevertheless creates a new identity scheme for incoming records, so treat key settings as part of the table contract.

## Decide the uniqueness scope

With a non-global index, Hudi identifies a record by the pair `(record key, partition path)`. The same `order_id` can therefore exist once in `event_date=2026-08-22` and again in `event_date=2026-08-23`. This is efficient because index lookup only examines relevant partitions, but the writer must always derive the same partition for a given key.

With a global index, the record key is unique across the whole table. Use that model when an entity can move between partitions or producers cannot reliably reproduce the original partition path. Global lookup and cross-partition movement cost more, so do not select it merely as insurance against an unclear data model.

Ask this concrete question: if an order's partition value changes, should the table contain two historically distinct rows or one row moved to a new location? Use a partition-scoped key for the former. Use a global index with the appropriate partition-update behavior for the latter.

## Choose ordering fields from source semantics

When several versions of one key arrive, `hoodie.table.ordering.fields` supplies the values Hudi compares. In Hudi 1.x, configuring ordering fields causes the merge mode to default to `EVENT_TIME_ORDERING`. The record with the larger ordering value wins, even if it arrived in an earlier Hudi commit.

For database CDC, prefer a monotonically increasing source value such as a log sequence number, binlog position, or source transaction sequence. Wall-clock timestamps are weaker because two events can share a timestamp and clocks can move. Multiple ordering fields are compared in sequence, so a useful tie breaker can follow the primary sequence:

```text
hoodie.table.ordering.fields=source_lsn,event_ts
```

If no ordering field is configured, the inferred mode is `COMMIT_TIME_ORDERING`: the later Hudi commit wins. That is valid when arrival order is authoritative, but it allows an old source event that arrives late to overwrite newer business state.

Do not switch a populated table between merge modes casually. Hudi persists merge mode in `.hoodie/hoodie.properties`, and the official record-merger documentation warns that changing it can make writers, readers, and compaction apply inconsistent semantics.

## Partition for pruning, not identity

Partition paths should reduce the amount of data readers and writers examine without creating thousands of tiny directories. Common choices are event date, region, or a low-cardinality tenant grouping. Avoid high-cardinality values such as `order_id` and very fine time buckets unless each bucket receives enough data to produce useful file sizes.

For a simple date partition:

```python
hudi_options.update({
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.datasource.write.hive_style_partitioning": "true",
})
```

This produces paths such as `event_date=2026-08-23`. Hudi also supplies timestamp and custom key generators for formatted or multi-level partitions. Writer and catalog-sync jobs must agree on the physical layout and partition fields.

Late data is not a reason to partition by ingestion date automatically. If queries filter by event date, write late events to their event-date partition and make sure updates can locate that same partition. If operations demand append-only arrival partitions, use a global uniqueness strategy or preserve the original partition path in the CDC stream.

## Validate the model before production

Build a small adversarial test with:

1. Two versions of the same key in one batch.
2. An older version arriving in a later commit.
3. A retry of the same batch.
4. A changed partition value for an existing key.
5. A delete carrying the same key and partition contract.

Then inspect Hudi metadata:

```sql
SELECT
  _hoodie_record_key,
  _hoodie_partition_path,
  _hoodie_commit_time,
  order_id,
  source_lsn
FROM orders
WHERE order_id = 'o-1042';
```

The expected snapshot contains one winner at the intended uniqueness scope. Also run a duplicate check on the business key:

```sql
SELECT tenant_id, order_id, count(*) AS copies
FROM orders
GROUP BY tenant_id, order_id
HAVING count(*) > 1;
```

If duplicates appear across partitions, either the partition derivation is unstable or the required uniqueness scope is global. If an old value wins, inspect the ordering field's type and source semantics rather than increasing write parallelism or changing compaction.

## Official Documentation

- [Apache Hudi key generation](https://hudi.apache.org/docs/key_generation/)
- [Apache Hudi record merger and merge modes](https://hudi.apache.org/docs/record_merger/)
- [Apache Hudi indexes](https://hudi.apache.org/docs/indexes/)
- [Apache Hudi write operations](https://hudi.apache.org/docs/write_operations/)

## Conclusion

Model the record key as stable identity, the ordering fields as source-of-truth version order, and the partition path as a physical pruning choice. Once their scopes align, retries become idempotent, late events resolve deterministically, and Hudi can route upserts without sacrificing correctness.
