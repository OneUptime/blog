# How to Capture PySpark DataFrame Lineage Beyond SQL Parsing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PySpark, Apache Spark, OpenLineage, Data Lineage, Data Engineering

Description: Capture PySpark transformations from Spark logical plans, including joins, derived columns, aggregations, and connector-backed writes.

---

A SQL parser cannot see a pipeline built through `DataFrame.select`, `withColumn`, `join`, or `groupBy`. Spark can. PySpark DataFrames use Spark SQL's structured execution engine, so the driver builds analyzed and optimized logical plans even when the author never writes a SQL string.

Runtime lineage should observe those plans at the Spark listener boundary. OpenLineage's Spark integration implements a `SparkListener`, examines execution events and logical plans, and emits datasets, jobs, runs, and supported column mappings.

## Instrument the Spark process, not the Python source

Add the OpenLineage Spark package that matches both the integration release and the cluster's Scala binary version. Then register the listener:

```bash
OPENLINEAGE_VERSION=1.53.0
SCALA_BINARY_VERSION=2.13

spark-submit \
  --packages "io.openlineage:openlineage-spark_${SCALA_BINARY_VERSION}:${OPENLINEAGE_VERSION}" \
  --conf spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener \
  --conf spark.openlineage.transport.type=http \
  --conf spark.openlineage.transport.url=https://lineage.example \
  --conf spark.openlineage.namespace=spark-prod-eu \
  jobs/customer_value.py
```

Do not copy the Scala version from an example. Confirm it from the deployed Spark distribution. You can also bundle the dependency, place it in Spark's `jars` directory, or provide it through `--jars`; avoid loading two releases of the integration at once.

Put transport credentials in the supported OpenLineage client configuration for your environment rather than exposing a token in process arguments. The example shows only non-secret settings.

## Use DataFrame operations normally

This pipeline contains no SQL text for a standalone parser:

```python
from pyspark.sql import functions as F

orders = spark.read.table("raw.orders")
customers = spark.read.table("raw.customers")

daily = (
    orders.alias("o")
    .join(
        customers.alias("c"),
        F.col("o.customer_id") == F.col("c.customer_id"),
        "inner",
    )
    .where(F.col("c.is_active"))
    .withColumn(
        "net_revenue",
        F.col("o.gross_amount") - F.col("o.discount_amount"),
    )
    .groupBy(
        F.col("o.customer_id").alias("customer_id"),
        F.to_date("o.ordered_at").alias("order_date"),
    )
    .agg(F.sum("net_revenue").alias("net_revenue"))
)

daily.write.mode("overwrite").saveAsTable("analytics.daily_customer_value")
```

Spark's logical plan retains attributes and expression relationships across these operations. The integration can see a table read, join predicate, filter, calculated field, grouping, aggregation, and table write without reverse-engineering the Python syntax.

Remember that DataFrames are lazy. Building `daily` does not execute the plan. The write action is what creates a Spark SQL execution that a listener can observe. A helper that constructs a DataFrame but is never used should not produce runtime lineage.

## Enable compact column lineage deliberately

The OpenLineage column lineage documentation recommends this Spark option for the newer compact representation of dataset-wide indirect influences:

```bash
--conf spark.openlineage.columnLineage.datasetLineageEnabled=true
```

Without it, dataset-wide indirect inputs can be repeated for every output field, producing a large near-Cartesian representation. Check support in the exact OpenLineage integration version you deploy.

In current OpenLineage, the Lineage Dataset Facet is the preferred schema for relationships it describes and supersedes overlapping relationships in the older Column Lineage Dataset Facet. Consumers may still receive the older facet from integrations for compatibility. Configure the producer and backend as a tested version pair, and do not assume every backend interprets both shapes identically.

## Give Spark recognizable dataset boundaries

Logical expression lineage is only useful when leaf relations and sinks have stable identities. Prefer catalog tables or explicit storage paths:

```python
source = (
    spark.read.format("jdbc")
    .option("url", "jdbc:postgresql://warehouse.example:5432/sales")
    .option("dbtable", "raw.orders")
    .option("user", jdbc_user)
    .option("password", jdbc_password)
    .load()
)

source.write.format("parquet").mode("overwrite").save(
    "s3://analytics-prod/orders/run_date=2026-09-07"
)
```

Use the same endpoint, catalog, table, and path normalization across Spark, Airflow, and database integrations. `s3a://bucket/key` and `s3://bucket/key`, or a JDBC alias and its real host, can become duplicate nodes unless normalization is intentional.

Avoid secrets in Spark configuration captured by metadata facets. Review source-code, environment, and Spark-property facets against your security policy before enabling production emission.

## Understand the blind spots

The listener can analyze supported Spark SQL logical plans, but not every computation exposes field semantics:

- A Python UDF usually appears as a transformation with opaque internal logic.
- Converting to an RDD and using arbitrary `mapPartitions` code loses structured field expressions.
- `collect()` reads data but creates no durable output dataset.
- A custom connector may not expose a stable dataset identifier.
- An in-memory DataFrame between actions may not deserve a persistent catalog node.
- Dynamically generated paths can fragment one logical dataset into many physical nodes.

Do not invent detailed field mappings through opaque code. Emit the known dataset edge, classify the transformation as unknown, and add a reviewed manual or custom facet only when the contract is authoritative.

OpenLineage publishes Spark connector extension interfaces for connectors that cannot be identified using ordinary relation metadata. Connector authors can expose lineage dataset identifiers without depending on unstable Spark internals.

## Debug with plans and captured events

`DataFrame.explain` is useful for confirming that Spark resolved the operations you expect:

```python
daily.explain(mode="extended")
```

Use it as diagnostic evidence, not as a production lineage API. Text plan formatting can change, and the listener has access to structured execution information.

For a repeatable integration test, configure an OpenLineage file transport in a disposable environment, run a tiny job, and assert:

1. One application parent and the expected child job events appear.
2. The `raw.orders` and `raw.customers` inputs are present.
3. `analytics.daily_customer_value` is an output only after the write.
4. `net_revenue` depends directly on gross and discount fields.
5. customer activity, join keys, and grouping fields are represented as indirect influences where supported.
6. A failed write emits failure state and does not claim a successful output version.

Run this test after Spark, Scala, connector, or OpenLineage upgrades. Package compatibility failures often show up as listener initialization errors or completely missing events, while unsupported relations show up as events with missing datasets.

## Connect Spark to its orchestrator

When Airflow launches Spark, the Airflow OpenLineage provider can inject parent-job and transport information for supported Spark operators. Enable those settings only after verifying the operator is listed as supported. The resulting parent facet joins the Spark application to the Airflow task rather than leaving duplicate top-level jobs.

Keep job naming stable across retries. An application name containing a random timestamp produces a new job node on every run; the run UUID already distinguishes executions.

## Conclusion

PySpark lineage does not require translating DataFrame code back into SQL. Instrument Spark's execution listener, give sources and sinks canonical identities, enable the tested column-lineage representation, and expose uncertainty around UDFs, RDDs, and custom connectors. Validate emitted events with a real action because unexecuted plans are design intent, not runtime evidence.

## Official Documentation

- [OpenLineage Spark installation](https://openlineage.io/docs/integrations/spark/installation/)
- [OpenLineage Spark main concepts](https://openlineage.io/docs/integrations/spark/main_concept/)
- [Using OpenLineage with Spark](https://openlineage.io/docs/guides/spark/)
- [OpenLineage Spark connector interfaces](https://openlineage.io/docs/guides/spark-connector/)
- [OpenLineage column-level lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [OpenLineage Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/lineage/)
- [Spark SQL and DataFrames guide](https://spark.apache.org/docs/latest/sql-programming-guide.html)
- [PySpark DataFrame explain API](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
