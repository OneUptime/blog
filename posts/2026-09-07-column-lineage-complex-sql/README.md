# How to Generate Column-Level Lineage from Complex SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, SQL, OpenLineage, Metadata, Data Engineering

Description: Build accurate column lineage for SQL containing CTEs, aliases, window functions, wildcards, and session-scoped temporary tables.

---

Column-level lineage is not a list of table names found after `FROM`. It is a set of relationships between each output field and the input fields that directly or indirectly influenced it. Complex SQL makes those relationships scope-sensitive: a name can refer to a CTE output, a table alias, a window definition, or a temporary relation created by an earlier statement.

A reliable implementation therefore needs three inputs: a dialect-aware syntax tree, the schemas visible when the query ran, and statement order. Regex-based extraction has none of those properties.

## Start with the lineage questions

Consider this PostgreSQL script:

```sql
CREATE TEMP TABLE eligible_orders AS
SELECT o.order_id, o.customer_id, o.ordered_at, o.net_amount
FROM raw.orders AS o
JOIN raw.customers AS c ON c.customer_id = o.customer_id
WHERE c.is_active = true;

WITH ranked AS (
  SELECT
    customer_id,
    order_id,
    net_amount,
    row_number() OVER (
      PARTITION BY customer_id
      ORDER BY ordered_at DESC
    ) AS recency_rank
  FROM eligible_orders
)
INSERT INTO analytics.latest_customer_order (
  customer_id,
  order_id,
  net_amount
)
SELECT customer_id, order_id, net_amount
FROM ranked
WHERE recency_rank = 1;
```

For `analytics.latest_customer_order.order_id`, the direct source is `raw.orders.order_id`. The selected row is also influenced by:

- `raw.customers.customer_id` through the join
- `raw.customers.is_active` through the filter
- `raw.orders.customer_id` through the join and window partition
- `raw.orders.ordered_at` through the window order

Those are not all the same kind of dependency. OpenLineage distinguishes direct `IDENTITY`, `TRANSFORMATION`, and `AGGREGATION` relationships from indirect `JOIN`, `FILTER`, `GROUP_BY`, `SORT`, `WINDOW`, and `CONDITIONAL` influences. Keeping that distinction makes impact analysis useful without claiming that a filter value becomes part of an output value.

## Parse the script as ordered statements

Build one lineage environment for the entire session or transaction, not one isolated parser invocation per statement:

```text
catalog schemas
  -> parse statement 1
  -> resolve names and output columns
  -> register eligible_orders as a temporary dataset
  -> parse statement 2
  -> expand CTE scopes
  -> resolve eligible_orders through the temporary registry
  -> collapse the final mapping to physical sources
```

The registry should key temporary objects by connection or session ID as well as name. Two concurrent sessions can both own a table named `eligible_orders`.

OpenLineage reserves the canonical `inmemory://` namespace for temporary datasets that have no persistence backend. If you deliberately model a database temporary table as that kind of synthetic boundary, put the engine, database, session, and object identity in the name:

```text
namespace: inmemory://
name: postgres/warehouse/session-7f3a/eligible_orders
```

Do not assume every temporary table is literally in memory. When retaining the physical PostgreSQL relation instead, use the PostgreSQL datasource namespace and the observed session-specific `pg_temp_N` schema, then keep the session or run correlation as evidence. For an artificial temporary boundary, OpenLineage recommends dataset type `JOB_OUTPUT` with subtype `TEMPORARY`. In either representation, avoid reusing the identity in a later session.

If the graph is intended for long-term impact analysis, you can instead collapse the temporary node and retain the two physical edges. Keep the intermediate node in a debug view so an engineer can explain how the collapsed relationship was derived.

## Resolve each query scope before tracing expressions

Every `SELECT` creates a scope. For each scope, create a symbol table containing:

1. Table aliases and their catalog schemas.
2. CTE names and the output fields already resolved for those CTEs.
3. Select-list aliases, which are visible only where the SQL dialect permits them.
4. Correlated references inherited from an outer query.

Resolve CTEs in dependency order. A CTE output is a logical field whose sources are the sources of its defining expression. When a later query reads that field, substitute the saved mapping rather than treating the CTE as a physical dataset.

Never expand `*` without a schema snapshot. The meaning of `o.*` is the ordered set of fields on `o` at the time of analysis. Save the catalog version or capture time with the lineage result; otherwise a later added column silently changes the reconstructed mapping.

## Walk expressions and preserve influence types

A small internal model is enough to keep the resolver honest:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class SourceField:
    namespace: str
    dataset: str
    field: str
    relation: str       # DIRECT or INDIRECT
    subtype: str        # IDENTITY, TRANSFORMATION, FILTER, WINDOW, etc.

def combine(expression_sources, context_sources):
    return {
        *expression_sources,
        *(SourceField(s.namespace, s.dataset, s.field,
                      "INDIRECT", s.subtype)
          for s in context_sources),
    }
```

For a plain column reference, return `DIRECT/IDENTITY`. For arithmetic, casts, string operations, or scalar functions, preserve all leaf fields as `DIRECT/TRANSFORMATION`. For aggregates, mark their value inputs `DIRECT/AGGREGATION`. Add predicate fields as indirect influences:

| SQL location | Lineage classification |
| --- | --- |
| `JOIN ... ON` | `INDIRECT/JOIN` |
| `WHERE` or `HAVING` | `INDIRECT/FILTER` |
| `GROUP BY` | `INDIRECT/GROUP_BY` |
| window `PARTITION BY` or `ORDER BY` | `INDIRECT/WINDOW` |
| final `ORDER BY` | `INDIRECT/SORT` |
| `CASE`, `COALESCE`, conditional expression | `INDIRECT/CONDITIONAL` where appropriate |

Window functions need both value and row-selection reasoning. For `sum(amount) OVER (...)`, `amount` is a direct aggregation input, while partition and ordering fields indirectly determine the window. For `row_number()`, there is no direct value field, but partition and order fields still influence the result.

## Map the target list by position

An `INSERT` with an explicit target list is straightforward: map the first projected expression to the first named target field, and so on. Reject the lineage result if source and target arity differ. For an insert without a target list, obtain the destination's ordered schema from the catalog. Do not infer it alphabetically.

For `CREATE TABLE AS`, the output names come from explicit aliases or the dialect's derived-name rules. Persist the exact names returned by the database when possible because duplicate and unnamed expressions are handled differently across engines.

## Emit the current lineage facet

In OpenLineage 1.53, emit a `DatasetEvent` whose target dataset carries the Lineage Dataset Facet. This shortened event shows the current shape for one field:

```json
{
  "dataset": {
    "namespace": "postgres://warehouse.example:5432",
    "name": "warehouse.analytics.latest_customer_order",
    "facets": {
      "lineage": {
        "_producer": "https://lineage.example/parser/2.4.0",
        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/LineageFacet.json#/$defs/LineageDatasetFacet",
        "inputs": [
          {
            "namespace": "postgres://warehouse.example:5432",
            "name": "warehouse.raw.orders",
            "type": "DATASET"
          },
          {
            "namespace": "postgres://warehouse.example:5432",
            "name": "warehouse.raw.customers",
            "type": "DATASET"
          }
        ],
        "fields": {
          "order_id": {
            "inputs": [
              {
                "namespace": "postgres://warehouse.example:5432",
                "name": "warehouse.raw.orders",
                "type": "DATASET",
                "field": "order_id",
                "transformations": [
                  {
                    "type": "DIRECT",
                    "subtype": "IDENTITY"
                  }
                ]
              },
              {
                "namespace": "postgres://warehouse.example:5432",
                "name": "warehouse.raw.orders",
                "type": "DATASET",
                "field": "customer_id",
                "transformations": [
                  {
                    "type": "INDIRECT",
                    "subtype": "JOIN"
                  },
                  {
                    "type": "INDIRECT",
                    "subtype": "WINDOW"
                  }
                ]
              },
              {
                "namespace": "postgres://warehouse.example:5432",
                "name": "warehouse.raw.customers",
                "type": "DATASET",
                "field": "customer_id",
                "transformations": [
                  {
                    "type": "INDIRECT",
                    "subtype": "JOIN"
                  }
                ]
              },
              {
                "namespace": "postgres://warehouse.example:5432",
                "name": "warehouse.raw.customers",
                "type": "DATASET",
                "field": "is_active",
                "transformations": [
                  {
                    "type": "INDIRECT",
                    "subtype": "FILTER"
                  }
                ]
              },
              {
                "namespace": "postgres://warehouse.example:5432",
                "name": "warehouse.raw.orders",
                "type": "DATASET",
                "field": "ordered_at",
                "transformations": [
                  {
                    "type": "INDIRECT",
                    "subtype": "WINDOW"
                  }
                ]
              }
            ]
          }
        }
      }
    }
  }
}
```

The example assumes `warehouse` is the current PostgreSQL database, which is why every OpenLineage dataset name has the required `database.schema.table` form. The current Lineage Dataset Facet supersedes the older Column Lineage Dataset Facet for relationships it describes. Existing producers and consumers may still use the older facet, which also defines the detailed direct and indirect transformation vocabulary used earlier in this article. If both facets describe the same output, consumers should prefer the current lineage facet. Do not emit conflicting mappings.

Emit the job's run-level inputs and outputs in its `RunEvent` as well. The `DatasetEvent` adds exact structural field relationships; it does not replace run, job, and dataset identities in the OpenLineage object model.

## Test adversarial cases

Use fixtures that force the resolver to prove its scoping rules:

- the same column name on both sides of a join
- nested CTEs that reuse an outer alias
- `SELECT *` after a schema change
- a window result filtered in an outer query
- quoted identifiers and mixed case
- two temporary tables with the same name in different sessions
- `UNION` branches with casts and reordered aliases
- a failed statement followed by rollback

For each fixture, assert the exact source field set and each transformation classification. Also compare the captured target schema to the database after execution. A parser can produce syntactically valid but operationally false lineage when its catalog is stale.

## Conclusion

Accurate lineage for complex SQL comes from resolving names through nested scopes, preserving statement order, expanding wildcards against a versioned catalog, and representing window and predicate fields as indirect influences. Treat temporary tables as session-scoped datasets or deliberately collapse them, then publish the final mapping with current OpenLineage lineage semantics and tested compatibility handling.

## Official Documentation

- [OpenLineage column-level lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [OpenLineage Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/lineage/)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
- [OpenLineage dataset type facet](https://openlineage.io/docs/spec/facets/dataset-facets/type/)
- [OpenLineage schema dataset facet](https://openlineage.io/docs/spec/facets/dataset-facets/schema/)
- [PostgreSQL WITH queries](https://www.postgresql.org/docs/current/queries-with.html)
- [PostgreSQL window functions](https://www.postgresql.org/docs/current/tutorial-window.html)
- [PostgreSQL CREATE TABLE AS](https://www.postgresql.org/docs/current/sql-createtableas.html)
