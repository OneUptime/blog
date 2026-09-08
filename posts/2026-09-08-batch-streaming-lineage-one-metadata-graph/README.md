# How to Model Batch and Streaming Lineage in One Metadata Graph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, Streaming, Apache Flink, Kafka, Metadata

Description: Unify finite batch runs and continuous stream processors without confusing jobs, observations, checkpoints, topics, and tables.

---

Batch and streaming pipelines often touch the same business data. Orders may enter through Kafka, flow through a continuous processor, land in an Iceberg table, and feed a nightly warehouse model. Two disconnected lineage systems make root-cause and impact analysis stop at the boundary.

One metadata graph can represent both modes if recurring job identity is separated from execution observations and if streams are modeled as datasets rather than as millions of records.

## Use one logical vocabulary

Keep the core node types small:

```text
Dataset: table, topic, file collection, or materialized view
Job: recurring transformation definition
Run: one finite execution or one lifecycle of a continuous job
Field: optional column or schema-field node
```

Then use the same production pattern for both modes:

```text
(output dataset)-[:PRODUCED_BY]->(job)
(job)-[:CONSUMES]->(input dataset)
```

or its equivalent single `DEPENDS_ON` direction. Pick one convention and keep it consistent.

Do not create a new job node for each batch partition, streaming checkpoint, consumer-group rebalance, or deployment replica. Those are observations of a recurring job.

## Separate processing type from event cadence

OpenLineage's Job Type facet distinguishes `BATCH`, `STREAMING`, and `SERVICE`. Its current model also separates processing type from emission pattern. A streaming job can describe periodic complete snapshots:

```json
{
  "job": {
    "namespace": "flink://production",
    "name": "orders.enrich",
    "facets": {
      "jobType": {
        "_producer": "https://pipelines.example/lineage/2.1.0",
        "_schemaURL": "https://openlineage.io/spec/facets/2-0-4/JobTypeJobFacet.json",
        "processingType": "STREAMING",
        "integration": "FLINK",
        "jobType": "JOB",
        "emissionPattern": {
          "eventTrigger": "PERIODIC",
          "eventContentMode": "COMPLETE_SNAPSHOT",
          "windowDuration": 300
        }
      }
    }
  }
}
```

Batch jobs usually have a finite lifecycle: `START`, optional `RUNNING`, then `COMPLETE`, `FAIL`, or `ABORT`. Streaming jobs may run for weeks. They can emit `START` and a terminal event, but health and current lineage should not depend on receiving `COMPLETE`. Periodic `RUNNING` events provide snapshots while the job remains active.

Create a new streaming run ID on a real application restart or redeployment according to the integration's lifecycle, not for every checkpoint.

## Model topics and tables as stable datasets

A Kafka topic identity should include the cluster identity and topic name:

```text
kafka://prod-eu-cluster/orders.v1
```

A table should include its physical catalog or service namespace:

```text
iceberg://prod-catalog/warehouse/orders
```

Partitions, offsets, checkpoint IDs, table snapshots, and date partitions are observation details. Do not append a Kafka offset to the topic node key or a batch date to the base table key unless the catalog deliberately treats each partition as a first-class dataset.

This produces a stable cross-mode path:

```text
Kafka orders topic
  -> Flink enrich-orders job
  -> Iceberg enriched_orders table
  -> nightly revenue job
  -> warehouse daily_revenue table
  -> finance dashboard
```

These URIs are illustrative internal graph identifiers. OpenLineage represents dataset identity as separate namespace and name fields; its Kafka naming convention uses `kafka://{bootstrap server host}:{port}` as the namespace and the topic as the name. The `iceberg://` examples above are a custom catalog identity convention. Apply a canonical naming policy across integrations or the Kafka sink emitted by one collector will not join the Kafka source emitted by another.

## Keep progress evidence beside the stable edge

The graph edge answers “can data flow this way?” Operational observations answer “how far has this execution progressed?”

For batch, useful evidence includes:

- run ID and nominal schedule
- input and output partitions
- input dataset version and output snapshot
- row and byte counts
- terminal state

For streaming, useful evidence includes:

- application run ID
- consumer group and source partitions
- source offset ranges or timestamps
- checkpoint or savepoint ID
- watermark or event-time range
- sink commit or snapshot identifier
- time of the latest complete observation

Store engine-specific progress in supported standard facets where they exist, or in versioned custom facets that follow the OpenLineage naming and schema rules. Do not overload dataset names with opaque progress state.

Apache Flink's native lineage model makes source and sink datasets available through the job-created event to registered job-status listeners. Current OpenLineage Flink 2.x documentation also describes checkpoint tracking that can emit periodic `RUNNING` events. Connector coverage matters: the documentation notes that Flink 2.x lineage depends on connectors implementing the native lineage interfaces, with Kafka currently called out as supported. Missing connector lineage should become an explicit coverage gap.

## Represent windows without fragmenting the job

A five-minute aggregation window is not a new job definition. Keep one job and attach a bounded observation:

```json
{
  "runId": "018f4b1a-6d7e-7bc0-a99d-102030405060",
  "windowStart": "2026-09-08T01:00:00Z",
  "windowEnd": "2026-09-08T01:05:00Z",
  "checkpointId": "18421",
  "inputs": [
    {"dataset": "kafka://prod/orders", "offsets": {"0": [9200, 9471]}}
  ],
  "outputs": [
    {"dataset": "iceberg://prod/enriched_orders", "snapshot": "8859912"}
  ]
}
```

This is an internal illustrative observation, not a claim that OpenLineage defines those exact custom fields. If emitted as a custom facet, publish an immutable versioned JSON schema and a distinct producer prefix.

Use half-open ranges such as `[start, end)` and document whether offsets identify records consumed, processed, or committed. A checkpoint attempted is not automatically a sink transaction committed.

## Avoid per-record lineage in the main graph

Record-level provenance can dwarf the business graph and make traversal unusable. Keep the main graph at dataset and field level. Retain record or offset evidence in a specialized store keyed by job run, checkpoint, partition, and output version.

The graph can link to that evidence:

```text
current lineage edge -> latest observation -> detailed offset manifest
```

Users can answer impact questions quickly and drill into exact records only when the retention and compliance contract supports it.

## Reconcile schema across the boundary

A topic schema field and a table column may represent the same business field but are not the same physical field. Keep both identities and connect them through column lineage. Flink 2.x native lineage interfaces do not currently provide column lineage, so this mapping requires additional instrumentation or authoritative transformation metadata:

```text
kafka orders.value.customer_id
  -> flink orders.enrich
  -> iceberg enriched_orders.customer_id
  -> warehouse daily_revenue.customer_id
```

Attach schema registry subject and version to the streaming observation and table schema or snapshot version to the sink. If a field was renamed during serialization, record the transformation rather than joining fields by name.

Do not assume one topic has one schema forever. Preserve schema versions on observations and keep the stable topic node as their parent.

## Join batch and streaming identities at materialization points

The most common disconnect occurs when the streaming integration calls a sink by a storage path while the batch integration calls it by catalog table name. Use reviewed aliases or symlink relationships based on authoritative catalog metadata:

```text
s3://lake/prod/orders/       physical location
iceberg://prod/orders        catalog dataset
```

Do not merge them only because paths look similar. Iceberg, Delta, Hive, and object-store writers can have different table boundaries over the same prefix.

OpenLineage provides a Symlinks Dataset Facet and a Catalog Dataset Facet for representing relevant identity context. Apply them consistently at ingestion boundaries.

## Handle late, duplicate, and out-of-order metadata events

Lineage transports can deliver at least once and backend processing can reorder events. Upsert observations with a deterministic identity such as producer, run ID, event type, and observation or checkpoint key. Preserve the source event time and ingestion time separately.

Do not let a late `START` overwrite a newer `RUNNING` snapshot. Terminal state transitions need an explicit ordering policy. A streaming job restarted with a new run ID must not make the old run appear current merely because an older event is reprocessed.

Current topology should be derived from the latest valid assertions, while immutable events remain available for rebuilding.

## Query the unified graph with mode-aware health

Impact traversal can ignore processing mode:

```text
Which dashboards are downstream of orders.value.customer_id?
```

Health traversal cannot. For each path segment, evaluate freshness according to its type:

- batch: last successful run compared with expected schedule
- streaming: latest progress observation and checkpoint age
- table: latest committed version or partition
- topic: latest known source and consumer progress

This prevents a healthy continuous job from looking incomplete because it has no terminal event and prevents a stale batch job from looking healthy because an old edge still exists.

## Test one cross-mode canary path

Build a canary that publishes a known record to a topic, processes it through the stream job, commits it to a table, runs a batch aggregate, and exposes one test dashboard field. Assert:

- stable topic, table, job, and field identities
- periodic streaming observation and finite batch terminal event
- checkpoint or offset evidence tied to the correct streaming run
- batch input version tied to the committed streaming sink version
- end-to-end upstream and downstream traversal
- no duplicate nodes after replaying events

Run the test after connector, runtime, schema registry, catalog, and lineage backend upgrades.

## Conclusion

Batch and streaming lineage belong in one graph when they share stable dataset and job identities. Keep checkpoints, offsets, windows, and partitions as execution evidence; model batch runs as finite and stream runs as continuous lifecycles; and join the modes at authoritative catalog identities. One topology can then answer impact questions while mode-aware observations answer freshness and health.

## Official Documentation

- [OpenLineage Job Type Job Facet](https://openlineage.io/docs/spec/facets/job-facets/job-type/)
- [OpenLineage object model](https://openlineage.io/docs/spec/object-model/)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
- [OpenLineage facets and extensibility](https://openlineage.io/docs/spec/facets/)
- [OpenLineage Catalog Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/catalog/)
- [OpenLineage Symlinks Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/symlinks/)
- [Apache Flink native lineage support](https://nightlies.apache.org/flink/flink-docs-stable/docs/internals/data_lineage/)
- [OpenLineage Flink 2.x integration](https://openlineage.io/docs/integrations/flink/flink2/)
- [OpenLineage Flink configuration](https://openlineage.io/docs/integrations/flink/configuration/)
