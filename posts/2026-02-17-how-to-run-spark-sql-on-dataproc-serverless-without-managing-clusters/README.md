# How to Run Spark SQL on Dataproc Serverless Without Managing Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataproc, Serverless, Spark SQL, Data Analytics

Description: Run Spark SQL queries on Dataproc Serverless for batch analytics without provisioning or managing clusters, with examples for common data transformation patterns.

---

Spark SQL is a powerful tool for batch data transformation, but traditionally it requires a running Spark cluster. You need to create a Dataproc cluster, submit your SQL job, wait for results, and then clean up. For teams that run SQL transformations a few times a day, maintaining a cluster just for SQL is wasteful.

Dataproc Serverless lets you run Spark SQL batch jobs without managing any infrastructure. You write your SQL, submit it, and get results. The compute resources are provisioned automatically and released when your query finishes.

## Submitting a Spark SQL Job

The most direct way to run Spark SQL on Dataproc Serverless is through a PySpark script that executes SQL queries.

```python
# spark_sql_job.py - Run SQL transformations on Dataproc Serverless
from pyspark.sql import SparkSession
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, help="Processing date")
    parser.add_argument("--output", required=True, help="Output GCS path")
    args = parser.parse_args()

    spark = SparkSession.builder \
        .appName(f"SparkSQL-Transform-{args.date}") \
        .getOrCreate()

    # Register raw data as a temp view
    raw_orders = spark.read.parquet(
        f"gs://my-bucket/data/orders/{args.date}/"
    )
    raw_orders.createOrReplaceTempView("orders")

    raw_products = spark.read.parquet("gs://my-bucket/data/products/")
    raw_products.createOrReplaceTempView("products")

    raw_customers = spark.read.parquet("gs://my-bucket/data/customers/")
    raw_customers.createOrReplaceTempView("customers")

    # Run SQL transformation - join orders with products and customers
    result = spark.sql("""
        SELECT
            o.order_id,
            o.order_date,
            c.customer_name,
            c.customer_segment,
            p.product_name,
            p.category,
            o.quantity,
            o.unit_price,
            o.quantity * o.unit_price AS total_amount,
            CASE
                WHEN o.quantity * o.unit_price > 1000 THEN 'high_value'
                WHEN o.quantity * o.unit_price > 100 THEN 'medium_value'
                ELSE 'low_value'
            END AS order_tier
        FROM orders o
        JOIN products p ON o.product_id = p.product_id
        JOIN customers c ON o.customer_id = c.customer_id
        WHERE o.status != 'cancelled'
    """)

    # Write results as partitioned Parquet
    result.write \
        .mode("overwrite") \
        .partitionBy("category") \
        .parquet(f"{args.output}/{args.date}/")

    print(f"Wrote {result.count()} enriched orders")
    spark.stop()

if __name__ == "__main__":
    main()
```

Submit it to Dataproc Serverless.

```bash
# Submit the Spark SQL job
gcloud dataproc batches submit pyspark \
  gs://my-bucket/jobs/spark_sql_job.py \
  --region=us-central1 \
  --subnet=default \
  --service-account=my-sa@my-project.iam.gserviceaccount.com \
  -- --date=2026-02-17 \
     --output=gs://my-bucket/data/enriched_orders
```

## Reading from BigQuery with Spark SQL

Spark SQL can read directly from BigQuery tables, which is useful for complex transformations that are easier to express in Spark SQL than standard SQL.

```python
# bigquery_transform.py - Transform BigQuery data with Spark SQL
from pyspark.sql import SparkSession

def main():
    spark = SparkSession.builder \
        .appName("BigQuery-SparkSQL-Transform") \
        .getOrCreate()

    # Read a BigQuery table into a Spark DataFrame
    orders = spark.read \
        .format("bigquery") \
        .option("table", "my-project.sales.orders") \
        .load()
    orders.createOrReplaceTempView("orders")

    # Read another BigQuery table
    returns = spark.read \
        .format("bigquery") \
        .option("table", "my-project.sales.returns") \
        .load()
    returns.createOrReplaceTempView("returns")

    # Complex SQL that is easier in Spark SQL than BigQuery SQL
    # Window functions with multiple partitions and custom frames
    analysis = spark.sql("""
        WITH order_history AS (
            SELECT
                customer_id,
                order_date,
                total_amount,
                SUM(total_amount) OVER (
                    PARTITION BY customer_id
                    ORDER BY order_date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS cumulative_spend,
                COUNT(*) OVER (
                    PARTITION BY customer_id
                    ORDER BY order_date
                    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
                ) AS orders_last_30_days,
                LAG(order_date, 1) OVER (
                    PARTITION BY customer_id ORDER BY order_date
                ) AS previous_order_date
            FROM orders
        ),
        return_rates AS (
            SELECT
                o.customer_id,
                COUNT(DISTINCT r.return_id) / COUNT(DISTINCT o.order_id) AS return_rate
            FROM orders o
            LEFT JOIN returns r ON o.order_id = r.order_id
            GROUP BY o.customer_id
        )
        SELECT
            oh.customer_id,
            oh.order_date,
            oh.total_amount,
            oh.cumulative_spend,
            oh.orders_last_30_days,
            DATEDIFF(oh.order_date, oh.previous_order_date) AS days_since_last_order,
            rr.return_rate,
            CASE
                WHEN oh.cumulative_spend > 10000 AND rr.return_rate < 0.1 THEN 'platinum'
                WHEN oh.cumulative_spend > 5000 AND rr.return_rate < 0.2 THEN 'gold'
                WHEN oh.cumulative_spend > 1000 THEN 'silver'
                ELSE 'bronze'
            END AS customer_tier
        FROM order_history oh
        JOIN return_rates rr ON oh.customer_id = rr.customer_id
    """)

    # Write results back to BigQuery
    analysis.write \
        .format("bigquery") \
        .option("table", "my-project.analytics.customer_analysis") \
        .option("temporaryGcsBucket", "my-bucket-temp") \
        .mode("overwrite") \
        .save()

    print(f"Analysis complete: {analysis.count()} records written")
    spark.stop()

if __name__ == "__main__":
    main()
```

Submit with the BigQuery connector.

```bash
# Submit BigQuery Spark SQL job
gcloud dataproc batches submit pyspark \
  gs://my-bucket/jobs/bigquery_transform.py \
  --region=us-central1 \
  --subnet=default \
  --service-account=my-sa@my-project.iam.gserviceaccount.com \
  --jars=gs://spark-lib/bigquery/spark-bigquery-with-dependencies_2.12-0.32.2.jar \
  --properties="\
spark.executor.memory=8g,\
spark.driver.memory=4g"
```

## Running Multiple SQL Transformations

For complex ETL pipelines, you often need to run a series of SQL transformations in order.

```python
# multi_step_sql.py - Run multiple SQL transformations in sequence
from pyspark.sql import SparkSession

def main():
    spark = SparkSession.builder \
        .appName("Multi-Step-SQL-ETL") \
        .getOrCreate()

    # Step 1: Load raw data
    spark.read.parquet("gs://my-bucket/raw/events/").createOrReplaceTempView("raw_events")
    spark.read.parquet("gs://my-bucket/raw/users/").createOrReplaceTempView("raw_users")

    # Step 2: Clean events
    spark.sql("""
        SELECT
            event_id,
            LOWER(TRIM(user_id)) AS user_id,
            event_type,
            CAST(timestamp AS TIMESTAMP) AS event_timestamp,
            properties
        FROM raw_events
        WHERE event_id IS NOT NULL
        AND timestamp IS NOT NULL
    """).createOrReplaceTempView("clean_events")

    print(f"Step 2 complete: cleaned events")

    # Step 3: Sessionize events
    spark.sql("""
        SELECT
            *,
            SUM(new_session) OVER (
                PARTITION BY user_id ORDER BY event_timestamp
            ) AS session_id
        FROM (
            SELECT
                *,
                CASE
                    WHEN LAG(event_timestamp) OVER (
                        PARTITION BY user_id ORDER BY event_timestamp
                    ) IS NULL THEN 1
                    WHEN UNIX_TIMESTAMP(event_timestamp) -
                         UNIX_TIMESTAMP(LAG(event_timestamp) OVER (
                             PARTITION BY user_id ORDER BY event_timestamp
                         )) > 1800 THEN 1
                    ELSE 0
                END AS new_session
            FROM clean_events
        )
    """).createOrReplaceTempView("sessionized_events")

    print("Step 3 complete: sessionized events")

    # Step 4: Compute session-level metrics
    session_metrics = spark.sql("""
        SELECT
            user_id,
            session_id,
            MIN(event_timestamp) AS session_start,
            MAX(event_timestamp) AS session_end,
            COUNT(*) AS event_count,
            COUNT(DISTINCT event_type) AS unique_event_types,
            UNIX_TIMESTAMP(MAX(event_timestamp)) -
                UNIX_TIMESTAMP(MIN(event_timestamp)) AS session_duration_seconds,
            MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS converted
        FROM sessionized_events
        GROUP BY user_id, session_id
    """)

    print("Step 4 complete: session metrics computed")

    # Step 5: Join with user data for final output
    session_metrics.createOrReplaceTempView("session_metrics")

    final_output = spark.sql("""
        SELECT
            sm.*,
            u.signup_date,
            u.country,
            u.acquisition_source,
            DATEDIFF(sm.session_start, u.signup_date) AS days_since_signup
        FROM session_metrics sm
        LEFT JOIN raw_users u ON sm.user_id = u.user_id
    """)

    # Write final output
    final_output.write \
        .mode("overwrite") \
        .partitionBy("country") \
        .parquet("gs://my-bucket/processed/session_metrics/")

    print(f"Pipeline complete: {final_output.count()} session records written")
    spark.stop()

if __name__ == "__main__":
    main()
```

## SQL Files for Separation of Concerns

For large SQL transformations, store SQL in separate files and load them in your PySpark script.

```python
# sql_runner.py - Load and execute SQL from files
from pyspark.sql import SparkSession
import argparse
from google.cloud import storage

def load_sql_from_gcs(bucket_name, blob_path):
    """Load a SQL file from GCS."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    return blob.download_as_text()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sql-bucket", required=True)
    parser.add_argument("--sql-path", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    spark = SparkSession.builder.appName("SQL-Runner").getOrCreate()

    # Load source data
    spark.read.parquet("gs://my-bucket/data/").createOrReplaceTempView("source_data")

    # Load SQL from GCS
    sql_query = load_sql_from_gcs(args.sql_bucket, args.sql_path)
    print(f"Executing SQL:\n{sql_query[:200]}...")

    # Execute the SQL
    result = spark.sql(sql_query)

    # Write output
    result.write.mode("overwrite").parquet(args.output)
    print(f"Wrote {result.count()} records to {args.output}")

    spark.stop()

if __name__ == "__main__":
    main()
```

This pattern lets SQL analysts write and maintain the transformation logic without touching Python code.

## Performance Tuning for Spark SQL

For large SQL jobs, tuning Spark SQL settings can significantly improve performance.

```bash
# Submit with optimized Spark SQL settings
gcloud dataproc batches submit pyspark \
  gs://my-bucket/jobs/spark_sql_job.py \
  --region=us-central1 \
  --subnet=default \
  --service-account=my-sa@my-project.iam.gserviceaccount.com \
  --properties="\
spark.sql.adaptive.enabled=true,\
spark.sql.adaptive.coalescePartitions.enabled=true,\
spark.sql.adaptive.skewJoin.enabled=true,\
spark.sql.shuffle.partitions=200,\
spark.sql.broadcastTimeout=600,\
spark.sql.autoBroadcastJoinThreshold=104857600,\
spark.executor.memory=8g,\
spark.executor.cores=4,\
spark.dynamicAllocation.maxExecutors=30"
```

Adaptive Query Execution (AQE) is especially useful. It lets Spark optimize the query plan at runtime based on actual data statistics, automatically handling partition coalescing and skew joins.

## Comparing Costs with BigQuery

For pure SQL workloads, you might wonder whether to use Dataproc Serverless or just use BigQuery directly. The answer depends on your use case.

BigQuery is better for ad-hoc queries, simple transformations, and when your data is already in BigQuery. Its serverless model charges per TB scanned.

Dataproc Serverless Spark SQL is better when you need complex multi-step transformations, custom UDFs, integration with non-BigQuery data sources, or when you want to use Spark-specific SQL features like window functions with custom frame specifications.

For many teams, the best approach is using both: BigQuery for interactive analytics and simple ETL, and Dataproc Serverless for complex batch transformations.

Running Spark SQL on Dataproc Serverless gives you the power of Spark's SQL engine without the overhead of cluster management. Submit your SQL jobs, let Google handle the infrastructure, and focus on your data transformations.
