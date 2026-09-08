# How to Keep a Data Lineage Catalog Fresh Without Manual Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, Data Catalog, Metadata, Data Governance, Data Engineering

Description: Treat catalog freshness as an automated data product with source reconciliation, evidence leases, review dates, and measurable coverage.

---

A lineage catalog that depends on every team remembering to update a diagram will drift. The remedy is not a louder documentation reminder. Technical lineage should be regenerated from systems of record, while human knowledge should have owners, review dates, and an explicit stale state.

The catalog itself needs an ingestion pipeline, service-level objectives, reconciliation, and incident handling. Treat it like production data.

## Split facts by their source of truth

Do not give every metadata field the same maintenance process.

| Metadata | Preferred source | Freshness mechanism |
| --- | --- | --- |
| Tables, columns, and types | Database or warehouse catalog | Scheduled snapshot or change feed |
| Executed dependencies | Query history or runtime lineage events | Continuous or frequent ingestion |
| Intended dependencies | Compiled manifests and pipeline definitions | CI publication on deploy |
| BI dependencies | BI platform metadata API | Scheduled crawl and publish event |
| Owners and domains | Team directory and catalog workflow | Review date and escalation |
| Business descriptions | Stewarded catalog entry or docs repository | Review date and usage-triggered task |
| Deleted assets | Source snapshot or lifecycle event | Reconciliation and soft deletion |

Automate facts a machine can observe. Ask people to maintain meaning, accountability, and exceptions. A generated description can be a draft, but it is not a substitute for a steward confirming the business meaning.

## Define freshness per source, not for the whole graph

“The catalog is fresh” is too vague. Store source-level watermarks:

```json
{
  "source": "snowflake-prod",
  "inventoryCompleteThrough": "2026-09-08T01:00:00Z",
  "queryHistoryCompleteThrough": "2026-09-08T00:45:00Z",
  "lastSuccessfulFullReconcile": "2026-09-07T02:00:00Z",
  "expectedInventoryIntervalMinutes": 360,
  "expectedLineageLagMinutes": 30
}
```

Track at least four ages:

- **capture age**: how far source extraction has progressed
- **processing age**: how far catalog ingestion has progressed
- **edge observation age**: when a dependency was last evidenced
- **human review age**: when an owner last confirmed a curated assertion

An hourly query-log collector and a weekly manual review should not share one red or green freshness flag.

## Publish metadata from delivery workflows

The best time to update declared lineage is when a change ships. Add catalog publication to the same workflow that deploys:

- dbt manifests and catalog artifacts
- Airflow, Dagster, or other orchestrator definitions
- schema migrations and view definitions
- BI semantic models and workbook metadata
- OpenLineage design-time `JobEvent` and `DatasetEvent` metadata where supported; emit runtime `RunEvent` events as jobs execute

Make publication idempotent and bind it to the deploy's commit or artifact digest. If a deployment rolls back, republish the active version rather than leaving the catalog pointed at the rejected build.

Do not make a best-effort metadata upload look successful. Record `attempted`, `accepted`, and `indexed` separately, with the artifact version at every boundary.

## Schedule independent source reconciliation

CI captures managed changes but misses console edits, ad hoc SQL, retired repositories, and credentials that silently lost access. Run independent crawls against source systems.

OpenMetadata's ingestion framework supports scheduled metadata, lineage, usage, profiler, and other workflows. Its documented default metadata ingestion compares source state to catalog state, including entities removed at the source. Its incremental extraction flow starts from the last successful run, adds a safety margin, fetches structural changes, flags deleted entities, and compares only changed entities for supported connectors.

The general pattern is:

```text
frequent incremental crawl
  + overlap window
  + idempotent upsert
  + periodic complete snapshot
  + safe deletion reconciliation
```

The overlap window protects against clock skew and late source metadata. Deduplication protects against reprocessing that overlap.

Run a complete snapshot periodically even when change feeds exist. It detects current-state drift from missed events and collectors that were offline longer than their retained cursor window. Audit extraction filters and permissions separately: a full snapshot using the same restricted scope cannot reveal excluded assets.

## Lease automated edges instead of deleting on one miss

For each producer, store when it asserted the edge and the completeness scope of that assertion:

```text
edge: analytics.orders -> finance.revenue
producer: snowflake-query-history
last_seen: 2026-09-08T00:42:10Z
valid_through: 2026-09-10T00:42:10Z
capture_window_complete: true
```

Renew the lease when the dependency is observed again. Expire it only after a complete capture window and a grace period appropriate to the pipeline schedule.

Do not remove a monthly-close edge because it was absent from one daily crawl. Learn or declare an expected cadence, and distinguish dormant from deleted.

A complete inventory snapshot can remove an asset with greater confidence than an incremental query-history batch can remove a lineage edge. Deletion policy must reflect that difference.

DataHub's documented stateful ingestion saves checkpoints and can soft-delete tables and views present in a previous successful run but absent in the current one. That pattern is valuable because comparison is against successful state, not an arbitrary empty run. Use fail-safe thresholds and review large deletion batches before applying them.

## Keep producer ownership separate

One edge can be reported by a dbt manifest, runtime query history, and a manual steward. Do not let one producer overwrite the others.

Store assertions independently:

```json
{
  "edgeKey": "warehouse.raw.orders->warehouse.analytics.orders",
  "assertions": [
    {"producer": "dbt-manifest", "type": "DECLARED", "active": true},
    {"producer": "query-history", "type": "OBSERVED", "active": true},
    {"producer": "catalog-ui", "type": "CURATED", "active": true}
  ]
}
```

The visible edge stays active while a valid assertion supports it. If declared and observed sources disagree, raise a drift signal. Do not conceal the difference by choosing whichever arrived last.

DataHub's lineage guide warns that manual and programmatic edits can conflict and recommends care when automated ingestion also controls an entity. Producer-scoped assertions avoid turning that conflict into silent loss.

## Put an expiry workflow on human knowledge

Every curated edge, description, exception, and ownership override should carry:

- accountable owner or steward group
- created and last-reviewed timestamps
- review interval based on criticality
- evidence or rationale
- status: `ACTIVE`, `REVIEW_DUE`, `DISPUTED`, or `RETIRED`

Do not delete overdue descriptions. Mark them visibly as unreviewed and create a targeted task. Route it to the current owner and include the source diff that triggered review.

Make requests specific:

```text
finance.revenue changed from 14 to 17 columns.
Two downstream dashboards use renamed fields.
Confirm owner and business definition by 2026-09-15.
```

This is more actionable than a quarterly message asking everyone to “update the catalog.”

## Trigger focused recrawls from change signals

Use cheap signals to start narrow work:

- DDL or schema version changed: recrawl that schema and downstream BI assets
- a view definition changed: reparse its lineage
- a job artifact digest changed: republish its declared graph
- a new query ID writes a governed dataset: parse immediately
- an owner left the directory: reassign owned critical assets
- a dashboard became popular: shorten its metadata and lineage SLO

Debounce bursts and preserve a periodic schedule as a backstop. Event-driven ingestion lowers lag; reconciliation establishes completeness.

## Measure what is actually covered

A useful catalog dashboard shows:

```text
inventory sources within SLO              38 / 40
lineage collectors within SLO             35 / 40
successful writes with parsed lineage     97.8%
critical assets with a current owner       99.2%
curated assertions past review date        143
soft deletions awaiting review              21
canary paths complete                       9 / 10
```

Do not use raw edge count as a success metric. A parser bug can create more edges while reducing accuracy.

Add one canary path per important platform: known source column, transformation, output, semantic model, and dashboard. After each crawl, assert stable identities and the complete path. Also assert a deletion canary so stale cleanup is tested, not merely configured.

## Make destructive reconciliation safe

A credential failure can make a source appear empty. Before soft deletion or expiry:

1. Require the crawl to have succeeded.
2. Compare counts and scopes with the last successful checkpoint.
3. Reject implausibly large changes or require approval.
4. Verify that inclusion and exclusion filters did not change unexpectedly.
5. Soft-delete first and retain restoration evidence.

OpenMetadata supports soft deletion and metadata version history, which is preferable to destroying ownership, descriptions, and lineage immediately. Align the exact behavior with the selected catalog and connector.

## Conclusion

A fresh lineage catalog is produced by automation, reconciliation, and explicit human review, not memory. Publish declared metadata during deployment, ingest runtime evidence continuously, reconcile against source snapshots, lease edges according to their cadence, and soft-delete only after a successful complete comparison. Teams can forget a diagram and the catalog can still tell the truth.

## Official Documentation

- [OpenMetadata metadata ingestion guide](https://docs.open-metadata.org/latest/how-to-guides/admin-guide/how-to-ingest-metadata)
- [OpenMetadata ingestion framework deployment](https://docs.open-metadata.org/latest/deployment/ingestion)
- [OpenMetadata incremental extraction](https://docs.open-metadata.org/latest/connectors/ingestion/workflows/metadata/incremental-extraction)
- [OpenMetadata features and soft deletion](https://docs.open-metadata.org/latest/features)
- [DataHub stateful ingestion](https://github.com/datahub-project/datahub/blob/master/metadata-ingestion/docs/dev_guides/stateful.md)
- [DataHub lineage guide](https://docs.datahub.com/docs/features/feature-guides/lineage)
- [OpenLineage object model](https://openlineage.io/docs/spec/object-model/)
- [OpenLineage lifecycle state change facet](https://openlineage.io/docs/spec/facets/dataset-facets/lifecycle_state_change/)
