# How to Preserve Historical Lineage Through Schema Evolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, Schema Evolution, Data Governance, Metadata, PostgreSQL

Description: Keep lineage queryable across field renames, drops, recreation, and backfills by separating stable identities from versioned names.

---

A lineage graph that stores only the latest schema rewrites history every time a table changes. Yesterday's incident path can suddenly contain today's field name, or a dropped field can disappear from the graph entirely. Historical lineage needs immutable observations and explicit identity transitions.

The core design is simple: names are versioned attributes, not permanent identities.

## Separate identity, version, and observation time

Give each logical dataset and field an internal stable ID. Store names and types in validity intervals:

```sql
CREATE TABLE lineage_dataset_version (
  dataset_id uuid NOT NULL,
  namespace text NOT NULL,
  dataset_name text NOT NULL,
  schema_hash text NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  observed_at timestamptz NOT NULL,
  event_type text NOT NULL,
  PRIMARY KEY (dataset_id, valid_from)
);

CREATE TABLE lineage_field_version (
  field_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  field_name text NOT NULL,
  field_type text,
  ordinal_position integer,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (field_id, valid_from)
);
```

`valid_from` and `valid_to` describe when the metadata was true in the data system. `observed_at` describes when the catalog learned it. Those times differ when events arrive late or an operator corrects history.

Lineage edges should also have validity intervals and reference stable IDs. Never overwrite an old edge merely because its display name changed.

## Treat each schema operation explicitly

Use deterministic rules:

| Operation | Identity behavior |
| --- | --- |
| Rename field | Retain `field_id`; close old name version and open new one |
| Drop field | Close its current version; retain history |
| Add field | Allocate a new `field_id` |
| Drop and recreate same name | Allocate a new ID unless authoritative migration metadata links it |
| Change type | Retain ID only when it is the same logical field; open a new version |
| Split or merge | Create new field IDs and explicit transformation edges |

A same-name field created after a drop is not automatically the old field. Reusing identity can make a new meaning inherit unrelated downstream history. Likewise, a similarity heuristic can suggest a rename, but only migration metadata or reviewed confirmation should commit the identity transition.

## Emit lifecycle evidence

OpenLineage defines lifecycle changes such as `CREATE`, `ALTER`, `DROP`, `OVERWRITE`, `RENAME`, and `TRUNCATE`. A rename can carry the previous identifier:

```json
{
  "namespace": "postgres://warehouse.example:5432",
  "name": "warehouse.analytics.customer_orders",
  "facets": {
    "lifecycleStateChange": {
      "_producer": "https://migrations.example/lineage/1.0.0",
      "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/LifecycleStateChangeDatasetFacet.json",
      "lifecycleStateChange": "RENAME",
      "previousIdentifier": {
        "namespace": "postgres://warehouse.example:5432",
        "name": "warehouse.analytics.client_orders"
      }
    }
  }
}
```

OpenLineage's external dataset identity is still namespace plus name, so a rename changes that external identity. The lifecycle facet links old and new identifiers. Your catalog's internal stable ID can then represent the continuity without pretending the physical names are identical.

Attach a version facet when the storage system has a meaningful dataset version, such as a table-format snapshot ID. Do not manufacture a random version per crawler run; crawler time belongs in observation metadata.

## Capture DDL from the authoritative path

Migration manifests are the best source because they express intent before deployment:

```yaml
change: rename_column
dataset: warehouse.analytics.client_orders
new_dataset: warehouse.analytics.customer_orders
effective_at: 2026-09-07T01:30:00Z
ticket: DATA-1842
```

Database observation verifies what actually happened. PostgreSQL event triggers can inspect completed DDL with `pg_event_trigger_ddl_commands()` and dropped objects with `pg_event_trigger_dropped_objects()` in the appropriate events. A drop callback includes object type, schema, name, identity, and whether the object was temporary.

Event triggers require elevated care and do not fire for every conceivable operation. Keep migration ingestion and periodic catalog snapshots as independent evidence sources. For MySQL, binary logs include DDL as statements even when row-based logging is selected, but retention and replication filters still affect what a consumer can reconstruct.

Record producer, server, transaction or migration ID, and ingestion checkpoint. Deduplicate events by a stable source-event key so replay does not create a second history transition.

## Version column lineage with the schema

Suppose `gross_amount` becomes `gross_revenue`. Close the old field-name interval and open the new one on the same `field_id`. Existing edges remain attached to that ID, but their display at a requested time uses the matching version.

For a transformation change, create a new edge version:

```sql
CREATE TABLE lineage_edge_version (
  edge_id uuid NOT NULL,
  source_field_id uuid NOT NULL,
  target_field_id uuid NOT NULL,
  transform_type text NOT NULL,
  expression_hash text,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (edge_id, valid_from)
);
```

Changing `gross - discount` to `gross - discount - refund` opens a new edge set even if the output name and type stay unchanged. Schema history alone cannot capture semantic lineage changes.

## Query the graph as it was

Resolve every node and edge at the same effective timestamp:

```sql
SELECT field_id, dataset_id, field_name, field_type
FROM lineage_field_version
WHERE valid_from <= $1
  AND (valid_to IS NULL OR $1 < valid_to);
```

Use half-open intervals `[valid_from, valid_to)` to avoid ambiguity at a boundary. Traverse only edges valid at the incident time, then render field and dataset names valid at that time.

For late corrections, keep the original `observed_at` record or audit log and insert corrected validity data with a new observation time. This provides two answers:

- What did the pipeline topology actually look like at 01:45?
- What did the catalog believe it looked like at 01:45?

That distinction matters during audits of delayed or lost metadata events.

## Preserve tombstones and aliases

A drop should create a tombstone, not delete the node. Mark it inactive and retain its last schema, owner, and incoming and outgoing historical edges. Current searches can hide inactive objects by default while time-travel queries still find them.

Aliases help users search old names, but they must be scoped by namespace and validity interval. A global alias from `customers` to `clients` can incorrectly merge unrelated datasets.

## Reconcile events with snapshots

Periodically compare the current open intervals with a fresh catalog snapshot:

```text
open history object, present in snapshot       -> unchanged or altered
open history object, absent from snapshot      -> candidate missed drop
closed history object, present in snapshot     -> candidate recreation
same name, incompatible fingerprint            -> require identity review
```

Do not automatically close an object after one failed crawl. Permissions and transient connectivity can make a live table appear absent. Require repeated evidence or a DDL event.

Test rename, drop and recreate, rollback, out-of-order delivery, duplicate delivery, and a backdated correction. For every fixture, assert both current lineage and an as-of query before the change.

## Conclusion

Historical lineage survives schema evolution when internal IDs stay stable only across proven continuity, while names, schemas, and edges are immutable versioned facts. Use lifecycle events to link external identities, keep tombstones, distinguish effective time from observation time, and reconcile DDL evidence with catalog snapshots.

## Official Documentation

- [OpenLineage object model](https://openlineage.io/docs/spec/object-model/)
- [OpenLineage lifecycle state change facet](https://openlineage.io/docs/spec/facets/dataset-facets/lifecycle_state_change/)
- [OpenLineage schema dataset facet](https://openlineage.io/docs/spec/facets/dataset-facets/schema/)
- [OpenLineage version facet](https://openlineage.io/docs/spec/facets/dataset-facets/version_facet/)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
- [PostgreSQL event trigger functions](https://www.postgresql.org/docs/current/functions-event-triggers.html)
- [PostgreSQL event triggers](https://www.postgresql.org/docs/current/event-triggers.html)
- [MySQL binary log format](https://dev.mysql.com/doc/refman/8.4/en/binary-log-setting.html)
