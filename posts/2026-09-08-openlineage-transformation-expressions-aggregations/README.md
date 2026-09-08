# How to Add Transformation Expressions and Aggregations to OpenLineage Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenLineage, Data Lineage, Metadata, SQL, Data Engineering

Description: Encode direct derivations, aggregates, and indirect SQL influences in OpenLineage column lineage without inventing unsupported semantics.

---

Table-level lineage says that one dataset depends on another. It cannot explain whether an output column was copied, calculated, aggregated, filtered, or merely grouped by an input column. OpenLineage's column lineage model adds that missing detail through input fields and transformation records.

The important distinction is between value derivation and influence. An amount used in `SUM(amount)` directly contributes to the result. A `status` column used only in `WHERE status = 'paid'` changes which rows contribute, but its values do not become the result.

## Start from the SQL semantics

Consider this transformation:

```sql
CREATE TABLE analytics.daily_sales AS
SELECT
  CAST(order_ts AS DATE) AS sale_date,
  region,
  SUM(net_amount) AS net_sales,
  COUNT(*) AS order_count
FROM raw.orders
WHERE status = 'paid'
GROUP BY CAST(order_ts AS DATE), region;
```

The direct value mappings are:

| Output field | Input field | Direct subtype |
| --- | --- | --- |
| `sale_date` | `order_ts` | `TRANSFORMATION` |
| `region` | `region` | `IDENTITY` |
| `net_sales` | `net_amount` | `AGGREGATION` |

`order_count` has no single field whose value is aggregated because `COUNT(*)` counts rows. The source dataset influences it, but fabricating a dependency on every input column would be misleading. Preserve a dataset-level dependency and put `COUNT(*)` in the expression description or another SQL facet.

The indirect influences are:

- `status` has subtype `FILTER`
- `order_ts` and `region` have subtype `GROUP_BY`

OpenLineage defines direct subtypes `IDENTITY`, `TRANSFORMATION`, and `AGGREGATION`. It defines indirect subtypes `JOIN`, `GROUP_BY`, `FILTER`, `SORT`, `WINDOW`, and `CONDITIONAL`. Use those values rather than creating spellings a consumer will not understand.

## Put column lineage on the output dataset

In a run state update, the `columnLineage` dataset facet belongs under the output dataset's `facets`. Its `fields` map is keyed by output field name:

```json
{
  "namespace": "postgresql://warehouse.example:5432",
  "name": "analytics.public.daily_sales",
  "facets": {
    "columnLineage": {
      "_producer": "https://pipelines.example/lineage/2.4.0",
      "_schemaURL": "https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json",
      "fields": {
        "sale_date": {
          "inputFields": [
            {
              "namespace": "postgresql://warehouse.example:5432",
              "name": "raw.public.orders",
              "field": "order_ts",
              "transformations": [
                {
                  "type": "DIRECT",
                  "subtype": "TRANSFORMATION",
                  "description": "CAST(order_ts AS DATE)",
                  "masking": false
                }
              ]
            }
          ]
        },
        "region": {
          "inputFields": [
            {
              "namespace": "postgresql://warehouse.example:5432",
              "name": "raw.public.orders",
              "field": "region",
              "transformations": [
                {
                  "type": "DIRECT",
                  "subtype": "IDENTITY",
                  "description": "region",
                  "masking": false
                }
              ]
            }
          ]
        },
        "net_sales": {
          "inputFields": [
            {
              "namespace": "postgresql://warehouse.example:5432",
              "name": "raw.public.orders",
              "field": "net_amount",
              "transformations": [
                {
                  "type": "DIRECT",
                  "subtype": "AGGREGATION",
                  "description": "SUM(net_amount)",
                  "masking": false
                }
              ]
            }
          ]
        }
      },
      "dataset": [
        {
          "namespace": "postgresql://warehouse.example:5432",
          "name": "raw.public.orders",
          "field": "status",
          "transformations": [
            {
              "type": "INDIRECT",
              "subtype": "FILTER",
              "description": "status = 'paid'",
              "masking": false
            }
          ]
        },
        {
          "namespace": "postgresql://warehouse.example:5432",
          "name": "raw.public.orders",
          "field": "order_ts",
          "transformations": [
            {
              "type": "INDIRECT",
              "subtype": "GROUP_BY",
              "description": "GROUP BY CAST(order_ts AS DATE)",
              "masking": false
            }
          ]
        },
        {
          "namespace": "postgresql://warehouse.example:5432",
          "name": "raw.public.orders",
          "field": "region",
          "transformations": [
            {
              "type": "INDIRECT",
              "subtype": "GROUP_BY",
              "description": "GROUP BY region",
              "masking": false
            }
          ]
        }
      ]
    }
  }
}
```

The abbreviated object above is the output dataset portion of a `RunEvent`; a complete event also includes the event type and time, run, job, inputs, and producer required by the event schema.

The `dataset` array is the compact representation for indirect dependencies that affect the dataset as a whole. The Spark integration exposes `spark.openlineage.columnLineage.datasetLineageEnabled=true` for this representation and recommends enabling it. Without it, dataset-wide influences are copied into output-field mappings, which can approach a Cartesian product.

## Map expressions to all value-contributing fields

For an expression with several inputs, attach the direct transformation to each contributing input:

```sql
gross_margin = (revenue - cost) / NULLIF(revenue, 0)
```

`gross_margin` directly depends on both `revenue` and `cost`. Do not store only the first identifier found by the parser. Conversely, numeric literals and deterministic functions are not dataset fields and need no fake node.

For a conditional:

```sql
CASE WHEN is_refund THEN -amount ELSE amount END AS signed_amount
```

`amount` is a direct `TRANSFORMATION` input. `is_refund` has an indirect `CONDITIONAL` influence. If a field supplies a returned branch value, it can have both a direct transformation and an indirect conditional role.

Window functions combine several roles:

```sql
SUM(amount) OVER (
  PARTITION BY account_id
  ORDER BY event_time
) AS running_total
```

- `amount` is direct `AGGREGATION`
- `account_id` is indirect `WINDOW`
- `event_time` is indirect `WINDOW`, and may also be described as ordering in a richer internal model

Use the OpenLineage vocabulary in the emitted event even if the producer retains more precise parser roles internally.

## Treat joins as influence unless their values are selected

In this query, `customer_id` controls row matching, while `segment` contributes the output value:

```sql
SELECT o.order_id, c.segment
FROM raw.orders AS o
JOIN raw.customers AS c
  ON o.customer_id = c.customer_id;
```

Emit direct identity mappings for `o.order_id` and `c.segment`. Emit both join keys as indirect `JOIN` influences. Do not claim that either join key directly derives `segment` merely because it was necessary to find the row.

If an output includes the join key itself, that key has a separate direct identity mapping as well.

## Use descriptions carefully

The transformation `description` is human-readable context, not a second schema language. Prefer a normalized expression scoped to the output field:

```text
SUM(net_amount)
DATE_TRUNC('day', event_time)
SHA256(LOWER(email))
```

Do not put the entire unredacted query into every field. It increases payload size and can copy literals or sensitive expressions into the metadata store. Keep a protected query reference or the standard SQL job facet when full SQL retention is permitted.

The Spark integration can generate expression descriptions with `spark.openlineage.columnLineage.descriptionsEnabled=true`; current documentation says it is disabled by default because descriptions noticeably increase event size.

## Set `masking` based on policy and semantics

`masking` indicates that an input value was obfuscated. Hashing an email into a stable token is a likely masking transformation:

```json
{
  "type": "DIRECT",
  "subtype": "TRANSFORMATION",
  "description": "SHA256(LOWER(email))",
  "masking": true
}
```

Do not set `masking` merely because a transformation is an aggregation. The official specification notes that which methods count as masking depends on the source system. A count can still disclose sensitive information in a small group. Apply a reviewed classification policy.

## Distinguish run lineage from structural lineage

Use a `RunEvent` when the mapping was observed as part of a job execution. Current OpenLineage also defines a Lineage Dataset Facet for `DatasetEvent`, useful for structural relationships such as views or catalog-curated lineage where no natural job owns the relationship. That newer facet can express dataset, job, and field inputs and supersedes the Column Lineage Dataset Facet for relationships it describes on the dataset event.

Do not emit both forms blindly. Choose based on the evidence:

- runtime transformation: output `columnLineage` on a `RunEvent`
- durable view or catalog relationship without a natural run: `dataset.facets.lineage` on a `DatasetEvent`

Keep producer, schema URL, and evidence time so consumers can reconcile updates.

## Validate generated facets

For every SQL parser or framework adapter, test fixtures for:

- renamed identity columns
- arithmetic using multiple inputs
- aggregates and `COUNT(*)`
- join-only and filter-only columns
- grouping, sorting, and window clauses
- `CASE`, `COALESCE`, casts, and masking functions
- nested fields, quoted identifiers, and duplicate column names

Validate the complete event against the referenced OpenLineage schema. Then assert semantics, because schema validation cannot tell whether a filter was mislabeled as direct derivation.

Track coverage separately: output fields seen, output fields resolved, expressions parsed, unresolved functions, and indirect influences emitted. Missing lineage should be visible, not converted into empty confident mappings.

## Conclusion

OpenLineage transformation metadata is most useful when it preserves the difference between values and control. Map copied, calculated, and aggregated values with direct transformations; map joins, filters, grouping, sorting, windows, and conditions as indirect influences. Use compact dataset-wide influences, redact descriptions, and validate both schema and semantics.

## Official Documentation

- [OpenLineage Column Level Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [OpenLineage Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/lineage/)
- [OpenLineage facets and extensibility](https://openlineage.io/docs/spec/facets/)
- [OpenLineage object model](https://openlineage.io/docs/spec/object-model/)
- [OpenLineage Spark configuration parameters](https://openlineage.io/docs/integrations/spark/configuration/spark_conf/)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
