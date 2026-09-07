# How to Track Row-Level Data Provenance Without Exploding Storage Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, Data Governance, Change Data Capture, Metadata, Data Engineering

Description: Combine run, partition, key, and log-position evidence to answer row-origin questions without storing an ancestor list on every row.

---

Table and column lineage answers where a field can come from. Row-level provenance answers which source records influenced this particular result. A naive design stores every source row ID beside every output row. Joins, fan-out, repeated runs, and aggregations quickly turn that into more metadata than business data.

The scalable alternative is tiered evidence. Store common provenance once at run or partition level, add compact key mappings where the transformation requires them, and reserve exact many-to-many evidence for regulated or exceptional outputs.

## Define the question before choosing granularity

Different questions need different evidence:

| Question | Minimum useful provenance |
| --- | --- |
| Which job version produced this partition? | Run and output partition |
| Which source change range was consumed? | CDC log offsets or transaction range |
| Which source row produced this copied row? | Stable key mapping |
| Which rows contributed to this aggregate? | Predicate, grouping keys, source snapshot, and run |
| Can I reproduce the exact output? | Inputs, versions, code, parameters, environment, and deterministic behavior |

Do not promise exact row ancestry if you retain only a batch ID. Label the supported resolution in the metadata API: `RUN`, `PARTITION`, `KEY`, or `EXACT_SET`.

## Model provenance as entities and activities

The W3C PROV model describes entities, activities, and agents. A practical data mapping is:

- A source row version, input partition, or output row version is an entity.
- A pipeline run is an activity.
- The service account, application, or owning team is an agent.
- Usage and generation edges connect input entities, the activity, and output entities.

Keep that conceptual model even if the physical storage is relational:

```sql
CREATE TABLE provenance_run (
  run_id uuid PRIMARY KEY,
  job_id text NOT NULL,
  code_version text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  parameter_hash text NOT NULL
);

CREATE TABLE provenance_slice (
  slice_id uuid PRIMARY KEY,
  run_id uuid NOT NULL,
  source_dataset text NOT NULL,
  source_version text,
  source_partition text,
  offset_start text,
  offset_end text,
  target_dataset text NOT NULL,
  target_partition text,
  row_count bigint
);
```

Assign a stable `slice_id` to each input range and target slice, including on retries. This permits null partition names for unpartitioned datasets and multiple ranges for the same dataset pair. One slice record can cover millions of rows that all came from the same input range under the same transformation.

## Put a compact run reference on outputs

For append-only facts, a run ID and source business key often provide sufficient drill-down:

```sql
INSERT INTO analytics.order_fact (
  order_id,
  net_amount,
  provenance_run_id
)
SELECT
  order_id,
  gross_amount - discount_amount,
  $1::uuid
FROM staging.orders
WHERE ingestion_batch_id = $2;
```

The run table points to code and input slices. This adds one fixed-width value per output row instead of a variable-length array of ancestors.

If modifying the business table is unacceptable, keep a side table partitioned like the output. This example assumes the output is partitioned by `output_version`:

```sql
CREATE TABLE order_fact_provenance (
  order_id bigint NOT NULL,
  output_version timestamptz NOT NULL,
  run_id uuid NOT NULL,
  source_key_hash bytea,
  PRIMARY KEY (order_id, output_version)
) PARTITION BY RANGE (output_version);
```

Create matching child partitions before inserting into this partitioned table. Use the output's real primary key and version; a timestamp works only if it uniquely identifies each version of that key. Physical row addresses such as PostgreSQL `ctid` are not durable identities.

## Use key mappings only when they add information

An identity copy does not need a separate mapping row if the same stable business key exists on both sides and the run specifies the source dataset. A rename from `source.order_id` to `target.order_key` can be described in the column mapping.

Store a row mapping when keys change, several inputs merge into one output, or one input fans out:

```sql
CREATE TABLE provenance_key_map (
  run_id uuid NOT NULL,
  target_dataset text NOT NULL,
  target_key_hash bytea NOT NULL,
  source_dataset text NOT NULL,
  source_key_hash bytea NOT NULL,
  relation text NOT NULL,
  PRIMARY KEY (
    run_id,
    target_dataset,
    target_key_hash,
    source_dataset,
    source_key_hash
  )
);
```

Hash the complete source and target row identities, including their versions when keys can be updated within a run. Hashing reduces accidental exposure but is not anonymization when the key space is guessable. Use a keyed HMAC with a managed, rotated key when equality lookup is required, and apply the same access and retention policy as the underlying sensitive data. Record the HMAC key version and retain the required keys for the lookup retention period. A digest cannot be reversed to recover a source key; retain an authorized lookup or queryable source keys for matching.

## Represent aggregates as reproducible slices

An aggregate such as daily revenue may have millions of contributors. Storing all contributor keys for every daily row duplicates information already defined by the group and source snapshot.

Store:

- source dataset and immutable version, or a base snapshot plus the complete retained CDC history needed to reconstruct that version
- group key values or a protected digest
- filter predicate or transformation version
- window boundaries and timezone
- pipeline run and code version
- input and output counts

Then reconstruct contributors from the retained source version when an authorized investigation requires it. This works only if that version remains queryable for the promised retention period. If sources are mutable and no historical snapshot exists, a predicate is not exact provenance.

For legally critical aggregates where sources cannot be retained, store compressed contributor sets in a separate tier. Sort integer surrogate keys and encode ranges or deltas; partition by run and output bucket. Measure cardinality before choosing this design.

Bloom filters can quickly say that a key is definitely absent or possibly present, but false positives mean they are not proof of contribution. Use them as an index in front of exact evidence, never as the audit record itself.

## Reuse CDC positions

Change data capture already carries compact ordering evidence. Debezium's PostgreSQL connector includes database, schema, table, transaction ID, log sequence number, and source timestamp in its `source` metadata. The operation is in the event envelope's `op` field. With transaction metadata enabled, it also emits transaction boundaries and per-event transaction ordering information.

Persist the consumed range with the run in application-defined metadata, for example:

```json
{
  "connector": "orders-postgres",
  "sourceDataset": "sales.public.orders",
  "lsnStart": 46523128,
  "lsnEnd": 46598240,
  "transactionIds": [556, 561],
  "targetPartition": "order_date=2026-09-07"
}
```

Avoid storing a large transaction ID list when a contiguous checkpoint range and archived change log can answer the same query. Record whether range boundaries are inclusive or exclusive and retain per-topic, per-partition consumer checkpoints when using Kafka. An LSN range alone is not an exact record of which Kafka events were processed. Confirm the connector's ordering and partitioning guarantees. For example, Debezium documents that truncate events have no message key, so ordering relative to keyed changes is guaranteed only with a single-partition topic.

Before promising before-images for updates or deletes, check the database's replica identity and connector configuration. The PostgreSQL connector notes that available `before` values depend on `REPLICA IDENTITY`.

## Deduplicate retries

At-least-once processing can emit the same mapping twice. Derive an idempotency key from stable source evidence rather than wall-clock time:

```python
import hashlib
import json

def evidence_id(connector, topic, partition, offset, target_dataset,
                target_key, target_version, transformation_version):
    # Use stable strings for identities/versions and integers for partition/offset.
    value = json.dumps(
        [connector, topic, partition, offset, target_dataset,
         target_key, target_version, transformation_version],
        ensure_ascii=True, separators=(",", ":"), allow_nan=False,
    )
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
```

This example uses Kafka topic, partition, and offset to identify a consumed record; it does not deduplicate connector duplicates published at different Kafka offsets. To deduplicate those, use a connector-specific stable source event identity, including any required within-transaction ordering. Use this ID in an upsert or uniqueness constraint. Keep the pipeline run ID separately because a replay can produce a new run while consuming the same source event.

For updates, provenance belongs to a row version, not only a business key. Otherwise the most recent mapping overwrites the origin of earlier values.

## Control retention and access

Create explicit retention classes:

- Run and slice metadata: long-lived and cheap.
- HMAC key mappings: aligned with business-data retention.
- Exact contributor sets: shortest justified retention, restricted access.
- Raw query text and parameters: excluded or redacted unless essential.

Deleting a subject's business record may also require deleting or rendering inaccessible key-level provenance. A hash is still linkable metadata. Consult the applicable privacy and records policy rather than assuming provenance is exempt.

Track storage per output row, mapping cardinality per transformation, late event rate, and percentage of outputs resolvable at each granularity. Automatically demote verbose capture only where the provenance contract permits it, or alert before one unusual fan-out exhausts storage.

## Test what an investigation can recover

For each provenance class, run a drill-down test:

1. Pick an output version.
2. Resolve its run and input slices.
3. Verify code and parameter hashes.
4. Recover exact source keys only where the contract promises `KEY` or `EXACT_SET`.
5. Recompute a sample and compare its value.

A table full of provenance IDs is not useful if the referenced code artifact, source version, HMAC key, or CDC log has already expired.

## Conclusion

Row-level provenance scales when repeated context is factored into runs and slices, while key mappings and exact contributor sets are used only where they add necessary evidence. Reuse CDC positions, version output rows, deduplicate retries, and publish the supported resolution honestly. Storage grows with retained runs, rows, and mappings; avoiding ancestry lists reduces that growth, while retention and capture limits bound total storage.

## Official Documentation

- [W3C PROV overview](https://www.w3.org/TR/prov-overview/)
- [W3C PROV model primer](https://www.w3.org/TR/prov-primer/)
- [W3C PROV-O recommendation](https://www.w3.org/TR/prov-o/)
- [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)
- [PostgreSQL replica identity](https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-REPLICA-IDENTITY)
- [MySQL binary logging formats](https://dev.mysql.com/doc/refman/8.4/en/binary-log-formats.html)
- [OpenLineage run cycle](https://openlineage.io/docs/spec/run-cycle/)
