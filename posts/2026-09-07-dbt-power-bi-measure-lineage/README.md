# How to Trace Data Lineage from dbt Models All the Way to Power BI Measures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, Power BI, Data Engineering, Business Intelligence, Metadata

Description: Join dbt artifacts, physical warehouse identities, and Power BI model dependencies into field-level lineage that reaches DAX measures.

---

dbt knows how models and sources relate. Power BI knows how semantic-model tables, columns, and measures relate. Neither system alone necessarily knows that `model.finance.fct_orders.net_revenue` is the same physical field consumed by a Power BI partition. End-to-end lineage requires an explicit identity bridge between those two graphs.

The useful path is:

```text
dbt source column
  -> dbt model column
  -> warehouse relation and column
  -> Power BI partition
  -> semantic-model column
  -> DAX measure
  -> report
```

Build and validate each edge independently. A visually connected graph is not enough if it joins objects only because their display names happen to match.

## Collect the dbt graph and physical schema

Every dbt command that parses a project writes `target/manifest.json`. The manifest contains resources and first-order `parent_map` and `child_map` relationships. It also contains `database`, `schema`, `alias`, and often `relation_name` for model nodes. The catalog artifact adds warehouse-observed columns, types, relation metadata, and statistics.

Save both artifacts from the same production build. Do not combine a current manifest with an old catalog because a renamed field can look like a valid but unrelated object.

This extractor creates canonical model-to-relation records:

```python
import json
from pathlib import Path

manifest = json.loads(Path("target/manifest.json").read_text())
catalog = json.loads(Path("target/catalog.json").read_text())

physical = {}
for unique_id, node in manifest["nodes"].items():
    if node.get("resource_type") != "model":
        continue
    relation = (
        node.get("database"),
        node.get("schema"),
        node.get("alias") or node.get("name"),
    )
    catalog_node = catalog.get("nodes", {}).get(unique_id, {})
    raw_columns = catalog_node.get("columns", [])
    if isinstance(raw_columns, dict):
        # Older catalog artifacts used a name-keyed object.
        column_records = [
            {"name": name, **metadata}
            for name, metadata in raw_columns.items()
        ]
    elif isinstance(raw_columns, list):
        # Current catalog artifacts document an array of column records.
        column_records = raw_columns
    else:
        raise TypeError(f"unsupported catalog columns shape: {type(raw_columns)}")

    observed_columns = {
        column["name"]: column.get("type")
        for column in column_records
    }
    physical[unique_id] = {
        "relation": relation,
        "columns": observed_columns,
        "parents": manifest["parent_map"].get(unique_id, []),
    }
```

Preserve dbt `unique_id` as the logical identity and a separately normalized warehouse identity such as:

```text
postgres://warehouse.example:5432
finance.analytics.fct_orders
net_revenue
```

Validate `metadata.dbt_schema_version` against a supported dbt artifact schema before extracting. Current catalog documentation represents `columns` as an array, while older artifacts can use a name-keyed object. The example accepts both and preserves the observed spelling.

Apply the database's identifier-folding rules after extraction. Lowercasing everything is wrong when quoted, case-sensitive identifiers are possible. Also include the environment or physical endpoint in the namespace so development and production relations do not merge.

The manifest graph is resource-level lineage. If field-level lineage is required, derive it from compiled model SQL with a dialect-aware analyzer or ingest field mappings emitted at runtime. The catalog tells you what columns exist, not which source expression produced each one.

## Extract Power BI metadata at the model boundary

Power BI's workspace lineage view is useful for artifact dependencies such as semantic model to report. It is not a substitute for DAX field dependencies. For a semantic model on supported Fabric, Premium, Premium Per User, or Embedded capacity, the XMLA endpoint provides read access to model metadata. The workspace URL has this form:

```text
powerbi://api.powerbi.com/v1.0/contoso.com/Finance%20Workspace
```

Connect with an Analysis Services client and query model metadata. Start by inventorying measures and calculated dependencies:

```sql
SELECT * FROM $SYSTEM.TMSCHEMA_MEASURES;
SELECT * FROM $SYSTEM.DISCOVER_CALC_DEPENDENCY;
```

`TMSCHEMA_MEASURES` identifies measure objects and expressions. `DISCOVER_CALC_DEPENDENCY` describes dependencies among tabular calculations and can extract DAX expressions from Power BI semantic models through XMLA. Microsoft documents an important limit: it does not include Power Query M dependencies for enhanced-metadata models. That means the last warehouse-to-model edge must come from partitions and their source expressions, not from the DAX dependency rowset alone.

For models stored as Power BI projects, TMDL files provide a source-control-friendly representation of tables, columns, measures, and partitions. Collect the committed TMDL definition in CI and query the published XMLA model after deployment. Comparing them catches an unpublished local change or a production-only edit.

## Build the warehouse-to-semantic-model bridge

For every imported or DirectQuery table, inspect its partition source:

- A direct navigation expression may identify server, database, schema, and table.
- A native SQL query needs SQL lineage analysis.
- A reference to another Power Query query needs traversal through the M query graph.
- A calculated table has DAX dependencies instead of a warehouse partition.

Normalize a resolved source to the same canonical identity used for dbt. Keep connection identities environment-specific, then apply reviewed aliases only where infrastructure hides equivalent endpoints behind different names.

A mapping record should retain evidence:

```json
{
  "powerBiObject": "model:finance/table:Fact Orders/column:Net Revenue",
  "warehouseField": {
    "namespace": "postgres://warehouse.example:5432",
    "dataset": "finance.analytics.fct_orders",
    "field": "net_revenue"
  },
  "evidence": "partition-native-query",
  "modelVersion": "9c535ad",
  "capturedAt": "2026-09-07T02:00:00Z"
}
```

Do not join on `Fact Orders` versus `fct_orders`. Labels are presentation metadata and change freely. Use the physical relation resolved from the partition.

## Traverse from model columns into measures

Normalize the DMV rows into directed edges such as:

```text
column Fact Orders[Net Revenue] -> measure [Gross Revenue]
measure [Gross Revenue] -> measure [Gross Margin %]
```

Then traverse backward from a measure until the graph reaches imported columns. A depth-first walk needs cycle protection because measures can have complex dependency structures, even though a valid deployed model should not contain an executable circular calculation:

```python
def upstream_columns(node, edges, kinds, seen=None):
    seen = set() if seen is None else seen
    if node in seen:
        return set()
    if kinds[node] == "column":
        return {node}
    seen.add(node)
    result = set()
    for parent in edges.get(node, []):
        result |= upstream_columns(parent, edges, kinds, seen.copy())
    return result
```

Preserve transformation text or a digest of the DAX expression as edge evidence. A measure depending on another measure should not be flattened so aggressively that the intermediate business definition disappears.

Power BI lineage tags can provide stable object identification within compatible semantic models and help bindings survive renames. Retain them when available, but do not use a Power BI lineage tag as a warehouse identifier. It describes a tabular model object, not the dbt relation that supplied its data.

## Attach reports and declare dbt exposures

Power BI lineage view and administrative metadata can connect semantic models to reports and dashboards. Treat that as the consumption edge after measure lineage. If report-level measures exist, collect report metadata too; they are not semantic-model measures and can otherwise become a blind spot.

Record the dashboard contract in dbt as an exposure:

```yaml
exposures:
  - name: finance_executive_dashboard
    label: Finance Executive Dashboard
    type: dashboard
    maturity: high
    url: https://app.powerbi.com/groups/WORKSPACE_ID/reports/REPORT_ID
    depends_on:
      - ref('fct_orders')
      - ref('dim_customer')
    owner:
      name: Finance Analytics
      email: finance-analytics@example.com
```

An exposure is a reviewed declaration and gives dbt a downstream node. The extracted Power BI graph is observed metadata. Compare them: an observed model not listed in `depends_on` should prompt an exposure update, while a declared model that no longer appears in Power BI may be stale.

## Validate the joined graph

Fail or warn on concrete quality conditions:

- a production Power BI partition resolves to no warehouse relation
- a warehouse relation resolves to more than one environment unexpectedly
- a semantic column is absent from the dbt catalog artifact
- a measure dependency refers to a missing model object
- an exposure differs from observed report dependencies
- artifact generation times or deployment versions do not align

Sample known paths in both directions. Starting at `raw.orders.net_amount`, verify the expected finance measures and reports are downstream. Starting at `Gross Margin %`, verify every upstream field reaches a physical warehouse column. Store the unresolved frontier instead of dropping it, so users can see exactly where lineage stops.

## Conclusion

End-to-end dbt and Power BI lineage is a graph join, not a name-matching exercise. Use dbt artifacts for logical resources and warehouse identities, resolve Power BI partitions to those identities, traverse DAX dependencies through XMLA or TMDL, and use exposures as reviewed dashboard contracts. Version every artifact so the final measure-to-source path is reproducible.

## Official Documentation

- [dbt manifest artifact](https://docs.getdbt.com/reference/artifacts/manifest-json)
- [dbt catalog artifact](https://docs.getdbt.com/reference/artifacts/catalog-json)
- [dbt exposures](https://docs.getdbt.com/docs/build/exposures)
- [Power BI data lineage view](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-lineage)
- [Power BI XMLA endpoint](https://learn.microsoft.com/en-us/fabric/enterprise/powerbi/service-premium-connect-tools)
- [Analysis Services dynamic management views](https://learn.microsoft.com/en-us/analysis-services/instances/use-dynamic-management-views-dmvs-to-monitor-analysis-services)
- [Power BI project semantic model folder](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset)
- [Tabular measure lineage tags](https://learn.microsoft.com/en-us/dotnet/api/microsoft.analysisservices.tabular.measure.lineagetag)
