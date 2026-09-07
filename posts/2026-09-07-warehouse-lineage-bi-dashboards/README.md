# How to Connect Warehouse Lineage to Tableau, Looker, and Power BI Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, Tableau, Looker, Power BI, Business Intelligence

Description: Normalize warehouse identities and ingest each BI platform's metadata so upstream fields resolve to governed dashboards and reports.

---

Warehouse lineage usually stops at a table. Business users experience a dashboard, workbook, Explore, semantic model, or measure. Connecting the two requires platform-specific metadata adapters and one canonical graph model.

Do not force Tableau, Looker, and Power BI into identical native objects. Normalize their identities and relationships while preserving each platform's semantics and evidence.

## Define a canonical boundary

Use physical warehouse identity as the join point:

```yaml
warehouse_field:
  namespace: postgres://warehouse.example:5432
  dataset: analytics.public.fct_orders
  field: net_revenue
```

Every BI adapter should emit edges from this identity to its own stable objects:

```text
warehouse field
  -> BI connection or partition
  -> BI model field
  -> calculation or measure
  -> worksheet, tile, visual, report, or dashboard
```

Include platform, tenant or site, workspace or project, stable adapter ID, native object ID where available, object type, display name, URL, owner, and capture version on every BI node. Not every native object has an immutable ID: scope LookML names to the instance, project, and model, and reconcile renames explicitly. Display names are not IDs.

Keep development and production separate. A workbook in a test Tableau site and one with the same name in production are different nodes even if their source points to the same warehouse.

## Normalize connections before matching tables

BI tools may store a gateway alias, DNS CNAME, JDBC connection name, or cloud account alias instead of the hostname seen by the warehouse lineage producer. Maintain reviewed connection aliases:

```yaml
connection_aliases:
  - platform: tableau
    observed: warehouse-ro.internal
    canonical: postgres://warehouse.example:5432
  - platform: looker
    observed: finance_warehouse
    canonical: postgres://warehouse.example:5432
  - platform: powerbi
    observed: pg-gateway-source-17
    canonical: postgres://warehouse.example:5432
```

An alias record needs owner, environment, effective dates, and evidence. Never merge endpoints based only on a similar host or database name.

Apply engine-aware identifier rules after resolving the connection. Preserve quoted case and include database and schema where the engine requires them.

## Ingest Tableau through the Metadata API

Tableau's Metadata API exposes Tableau content such as published and embedded data sources, workbooks, sheets, calculated fields, flows, and parameters. It also exposes external assets such as databases, tables, and columns. Its GraphQL schema includes upstream and downstream lineage relationships.

For Tableau Cloud, the Metadata API is enabled. For Tableau Server it must be enabled by an administrator, and programmatic access uses a Tableau REST API authentication token. Submit GraphQL to:

```text
https://TABLEAU_HOST/api/metadata/graphql
```

Start with a minimal verified query in the site's GraphiQL explorer:

```graphql
query WarehouseInventory {
  databases(filter: {name: "analytics"}) {
    id
    name
    tables {
      id
      name
    }
  }
}
```

Then add the upstream and downstream shortcut fields exposed by that site's schema, such as downstream data sources, workbooks, sheets, and columns. Use connection-style fields and pagination for large sites. Tableau explicitly scopes results to the caller's permissions, so an empty result can mean invisible metadata rather than no dependency.

Store Tableau object IDs or LUIDs and the GraphQL path that proved each edge. Custom SQL is represented by a `CustomSQLTable`, but upstream lineage depends on Tableau's SQL support; retain `isUnsupportedCustomSql` or `containsUnsupportedCustomSql` as a coverage gap rather than inventing an upstream table.

## Ingest Looker from LookML and the API

In Looker, a model points to a database connection, an Explore exposes a base view and joins, and a view defines dimensions and measures over a table or derived table. Saved Looks and dashboard tiles issue queries through a model and Explore.

The Looker API lists models:

```http
GET /api/4.0/lookml_models?fields=name,project_name,explores
```

For every model and Explore, request its field metadata:

```http
GET /api/4.0/lookml_models/ecommerce/explores/orders?fields=id,name,connection_name,fields
```

Use the exact fields parameter supported by your Looker release and inspect the generated SDK types. The Explore response can describe dimensions and measures, while the LookML project remains the authoritative source for `sql_table_name`, derived SQL, joins, and field expressions.

A basic view makes the mapping explicit:

```lookml
view: orders {
  sql_table_name: public.fct_orders ;;

  dimension: order_id {
    primary_key: yes
    sql: ${TABLE}.order_id ;;
  }

  measure: total_revenue {
    type: sum
    sql: ${TABLE}.net_revenue ;;
  }
}
```

For PostgreSQL, the Looker connection already selects the `analytics` database, so the executable table reference is `public.fct_orders`. PostgreSQL also accepts `database.schema.table` when the database matches the current connection; it does not support cross-database references this way. The adapter combines the connection's database with the observed schema and table to produce the canonical `analytics.public.fct_orders` identity.

Parse LookML substitutions and SQL column references so `orders.total_revenue` depends on the physical `net_revenue` column, resolved through `sql_table_name` and the model's connection. `${TABLE}.net_revenue` does not reference a LookML field named `orders.net_revenue`. SQL-based and native derived tables can each be temporary or persistent; preserve intermediate datasets and, for persistent derived tables, their independent build and refresh behavior.

Fetch saved content and dashboard elements to connect selected model, Explore, and fields to user-facing assets. Run Looker's Content Validator during model migrations, but treat validation and lineage as separate signals: valid content can still depend on a field you plan to remove.

## Ingest Power BI at two levels

Power BI's lineage view connects external sources, dataflows, semantic models, reports, and dashboards within the service. Use it for artifact-level context and impact analysis. Field and DAX measure dependencies require semantic-model metadata.

For workspaces on supported capacity or Premium Per User, ensure XMLA read access is enabled and the caller has the required license and semantic-model permissions, then connect to the XMLA endpoint:

```text
powerbi://api.powerbi.com/v1.0/contoso.com/Finance%20Workspace
```

Select the semantic model as the connection's database and run each DMV query separately to inventory measures and calculation dependencies:

```sql
SELECT * FROM $SYSTEM.TMSCHEMA_MEASURES;
SELECT * FROM $SYSTEM.DISCOVER_CALC_DEPENDENCY;
```

Resolve imported or DirectQuery table partitions to warehouse relations by inspecting their source definitions. Microsoft documents that `DISCOVER_CALC_DEPENDENCY` does not include Power Query M dependencies for enhanced-metadata models, so a DAX-only crawl cannot prove the warehouse-to-model edge.

Power BI projects can store semantic model definitions as TMDL files. Ingest the committed project for design lineage and query the deployed XMLA model for observed deployment state. Preserve tabular lineage tags when available because they support stable identification through model renames, but keep them separate from warehouse IDs.

## Store provenance for every edge

One normalized edge record can serve all adapters. Here `DEPENDS_ON` points from a consumer to its input, the reverse of the downstream path shown earlier. The illustrative measure and column keys use model-scoped lineage tags resolved from model metadata; the DMV proves only this model-level dependency:

```json
{
  "from": "powerbi-measure:workspace-31/model-8/lineage-tag-measure-17",
  "to": "powerbi-column:workspace-31/model-8/lineage-tag-column-42",
  "relation": "DEPENDS_ON",
  "producer": "powerbi-xmla-adapter/3.2.0",
  "evidence": "DISCOVER_CALC_DEPENDENCY",
  "capturedAt": "2026-09-07T02:10:00Z",
  "confidence": "OBSERVED"
}
```

Use `DECLARED` for manually curated links and `INFERRED` for a reviewed heuristic. Do not label a name match as observed. Version or close edges when a dashboard is republished, a LookML commit deploys, or Tableau reindexes content.

## Handle incomplete platform views

Every adapter has blind spots:

- Tableau returns only metadata visible to the caller and may not parse unsupported custom SQL.
- Looker derived SQL, Liquid templating, and user attributes can select runtime-dependent relations.
- Power BI M expressions and gateways can obscure physical connection details.
- Reports can contain local calculations not stored in the central semantic model.
- Deleted or unpublished content can linger until the platform's metadata refresh completes.

Represent an unresolved node at the boundary and explain why resolution stopped. For example, keep a `tableau-custom-sql:ID` node with a coverage flag. Removing the node makes the graph look falsely complete.

## Reconcile and test all three adapters

Create one canary asset per platform that reads a dedicated warehouse field. After each crawl, assert the exact downstream path and stable IDs. Measure:

- percentage of active BI assets crawled
- percentage of BI source relations resolved canonically
- percentage of calculations with field dependencies
- age of the newest successful platform snapshot
- count of permission-hidden, unsupported, and ambiguous boundaries

Run reverse checks too. Every production dashboard should reach at least one governed dataset or carry an explicit exception. Alert on a new ungoverned source, but allow a metadata-refresh grace period to avoid flagging assets while platform indexing is still in progress.

Use each platform's native impact tools before a change, then use the unified graph to find consumers across platform boundaries. The unified graph adds reach; native tools retain platform-specific detail.

## Conclusion

Connecting warehouse lineage to BI is an adapter and identity problem. Normalize physical connections through reviewed aliases, preserve native Tableau, Looker, and Power BI objects, attach evidence to every edge, and make unresolved boundaries visible. The result can trace one warehouse field to all affected user-facing assets without relying on brittle display-name matches.

## Official Documentation

- [Tableau Metadata API getting started](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_start.html)
- [Tableau Metadata API model](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_model.html)
- [Tableau lineage impact analysis](https://help.tableau.com/current/server/en-us/dm_lineage.htm)
- [Looker LookML terms and concepts](https://cloud.google.com/looker/docs/lookml-terms-and-concepts)
- [Looker Get All LookML Models API](https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/LookmlModel/all_lookml_models)
- [Looker Get LookML Model Explore API](https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/LookmlModel/lookml_model_explore)
- [Power BI data lineage view](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-lineage)
- [Power BI semantic model impact analysis](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-dataset-impact-analysis)
- [Power BI XMLA endpoint](https://learn.microsoft.com/en-us/fabric/enterprise/powerbi/service-premium-connect-tools)
- [Analysis Services dynamic management views](https://learn.microsoft.com/en-us/analysis-services/instances/use-dynamic-management-views-dmvs-to-monitor-analysis-services)
