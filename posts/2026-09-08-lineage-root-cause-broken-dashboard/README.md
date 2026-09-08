# How to Use Data Lineage to Find the Root Cause of a Broken Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, Business Intelligence, Root Cause Analysis, Observability, Data Quality

Description: Combine field-level lineage, deployment history, run outcomes, and data quality signals to isolate the first broken upstream boundary.

---

A lineage graph can reduce a dashboard incident from dozens of possible systems to one evidence-backed path. It cannot identify the root cause by topology alone. The graph tells you what can affect the dashboard; run, schema, freshness, and quality evidence tells you what actually changed near the incident.

The investigation goal is to find the first unhealthy boundary when walking from the visible symptom toward its sources.

## Classify what “broken” means

Start with an observable symptom and timestamp:

- refresh failed
- visual shows no rows
- value is wrong but query succeeds
- field or measure is missing
- dashboard is stale
- only one tenant, region, or filter is wrong
- users receive a permission error

Record dashboard ID, workspace or site, report or workbook version, visual, semantic-model field, filter state, affected audience, first bad time, and last known good time.

“Revenue dashboard is broken” is too broad for useful lineage. “The `net_revenue` measure in tile 7 became zero after the 01:00 refresh” gives the graph a starting field and a time window.

## Verify the dashboard identity and native lineage

Use a platform's stable IDs rather than display names. Tableau's Metadata API indexes workbooks, data sources, flows, fields, external tables, and other content and exposes upstream and downstream relationships through GraphQL. Power BI's lineage view shows relationships among workspace artifacts, external semantic models, dataflows, and data sources.

Native tools retain platform-specific detail that a unified catalog may simplify. Begin there to identify:

```text
visual or sheet
  -> calculated field or measure
  -> semantic model or published data source
  -> physical connection
```

Then join that connection and field to the cross-platform catalog. Check permissions and coverage before treating an empty native result as no lineage. Tableau documents that Metadata API results depend on what the caller can see, and Power BI lineage view is also permission-scoped.

## Trace one field before the whole dashboard

A dashboard can depend on hundreds of tables. Expand only the affected metric or field first:

```text
Dashboard: Executive Revenue
  net_revenue measure
    -> semantic_model.orders.net_revenue
      -> warehouse.daily_orders.net_revenue
        -> transform build_daily_orders
          -> raw.orders.gross_amount
          -> raw.orders.discount_amount
```

Column-level lineage removes unrelated branches. It should include direct derivations and indirect influences. A field used only in a join, filter, group, conditional, or window can change the output even though its values are not copied into the metric.

If only table-level lineage exists, continue with a lower confidence label and a wider candidate set. Do not invent column mappings by matching names.

## Overlay health on every node and edge

For the incident window, attach operational evidence:

| Graph object | Evidence to inspect |
| --- | --- |
| Dashboard or report | publish time, refresh status, query error, permission change |
| Semantic model | deployment version, refresh history, measure definition |
| Dataset | schema version, freshness, volume, null rate, partition status |
| Job | code version, run state, start and end time, retry, error |
| Lineage edge | producer, evidence type, first and last seen, parser version |
| Source | ingestion lag, CDC offset, availability, upstream contract |

OpenLineage separates a recurring job from each run and supports run states plus dataset and data-quality facets. A catalog can use those events or equivalent platform telemetry to color the graph for a specific time instead of showing only today's topology.

An active green edge with a failed producer run is not healthy. An old red edge may be irrelevant if it was replaced before the incident. Always use an as-of view when the catalog supports it, or reconstruct one from versioned observations.

## Compare last good with first bad

Build a change ledger between the last known good dashboard result and the first bad one:

```text
00:42  raw.orders schema v81 published
00:51  build_daily_orders code abc123 deployed
01:00  build_daily_orders started
01:07  build_daily_orders completed, row count down 93%
01:11  semantic model refresh completed
01:13  dashboard returned zero for EMEA
```

Then traverse upstream in reverse time order. The first correlated abnormality is a candidate, not yet the cause.

Ask for each candidate:

1. Does it lie on the affected field's path?
2. Did it change inside the incident window?
3. Does its failure mode explain the exact scope?
4. Can a query or replay reproduce the symptom?
5. Did remediation restore the dashboard?

A failed unrelated job is noise. A row-count collapse in the exact partition and field path is much stronger evidence.

## Find the first broken boundary

Walk from the dashboard toward root sources and evaluate the boundary between each pair:

```text
dashboard reads semantic model          healthy query, wrong value
semantic model reads warehouse table    refresh succeeded, source already wrong
warehouse model writes daily table      output volume 93% low
model reads raw orders                   source volume normal
```

The first broken boundary is the warehouse transformation. Inspect its SQL, parameters, indirect filter fields, and code deployment before investigating the source application.

This method prevents “upstream” from becoming an unlimited escalation chain. Stop when the upstream side is correct and the downstream side first becomes incorrect.

## Use quality assertions as localization evidence

Place lightweight checks along critical lineage paths:

- source partition arrived
- row count and distinct key count are within expected bounds
- join key null rate is acceptable
- model output reconciles to source totals
- semantic model refreshed after its input changed
- canary dashboard query returns a known invariant

OpenLineage's Data Quality Assertions facet can associate pass or fail results with a dataset and optionally a column. A failure at `warehouse.daily_orders.net_revenue` with passing checks at both raw inputs narrows the suspect transformation.

Quality checks are signals, not proof. A passing null check does not validate a currency conversion, and an anomaly threshold can miss a small but important segment.

## Investigate common incident patterns

### Schema change

A source column was renamed or changed type. Column lineage identifies affected measures and dashboards. Confirm the schema version used by the failed run, not only the current schema after a rollback.

### Stale partition

Every query succeeds, but the expected daily partition never arrived. Compare the dashboard refresh time, model completion time, and source watermark. A downstream refresh can successfully ingest yesterday's data.

### Join or filter regression

The selected amount columns look healthy, but a changed join key or predicate removes rows. Follow indirect column influences, code version, and segment-level counts.

### Partial retry

One task retried and overwrote a complete output with one partition. Inspect run hierarchy, output partitions, write mode, and dataset lifecycle evidence.

### Permission or connection change

The data is correct, but the BI service identity lost access or a gateway points at another database. Native BI lineage and connection metadata are more useful here than warehouse field lineage alone.

## Query an incident-ready lineage projection

Expose one service operation that returns bounded upstream paths and health summaries:

```http
GET /lineage/upstream?field=tableau://finance/workbook-18/net_revenue
  &asOf=2026-09-08T01:13:00Z
  &maxDepth=8
```

The response should include stable IDs, path length, edge evidence, last successful run, latest schema version, freshness, failed assertions, and unresolved boundaries. Page high-fan-out results and prefer the affected field path.

Do not make responders open five tools merely to align timestamps. Deep links to the native job, warehouse query, dataset profile, and BI artifact can still provide detailed evidence.

## Watch for misleading lineage

Common traps include:

- current lineage shown for a historical incident
- stale edges retained after a model change
- missing edges caused by collector permissions
- display-name matches across development and production
- view nodes flattened so ownership boundaries disappear
- a table-level edge treated as proof of a field mapping
- a successful job treated as proof of correct data
- a dashboard cache hiding whether a repair worked

Show capture time, producer, and confidence on each edge. An explicit unresolved boundary is safer than an apparently complete graph built from guesses.

## Turn the investigation into a reusable runbook

For every critical dashboard, store:

- stable dashboard and field identifiers
- owners for BI, semantic model, pipeline, and source
- expected refresh and pipeline schedules
- critical upstream paths and unresolved gaps
- links to run and query logs
- quality checks along the path
- last successful end-to-end canary

After the incident, add the causal query, field mapping, or missing connector support to the test corpus. Do not hard-code the incident's temporary table or run ID into durable topology.

## Conclusion

Lineage accelerates dashboard root-cause analysis when it is field-specific, time-aware, and joined to operations. Pin the exact symptom, use native BI metadata to reach the semantic field, traverse the unified graph upstream, and compare last good with first bad. The root cause is at the first boundary where healthy input became unhealthy output, confirmed by reproducible evidence.

## Official Documentation

- [Tableau Metadata API introduction](https://help.tableau.com/current/api/metadata_api/en-us/)
- [Tableau Metadata API model](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_model.html)
- [Tableau lineage impact analysis](https://help.tableau.com/current/server/en-us/dm_lineage.htm)
- [Power BI data lineage](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-lineage)
- [Power BI data source impact analysis](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-source-impact-analysis)
- [OpenMetadata lineage API](https://docs.open-metadata.org/latest/api-reference/lineage/index)
- [OpenLineage object model](https://openlineage.io/docs/spec/object-model/)
- [OpenLineage Data Quality Assertions facet](https://openlineage.io/docs/spec/facets/dataset-facets/data_quality_assertions/)
