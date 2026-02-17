# How to Reserve BigQuery BI Engine Capacity for Sub-Second Dashboard Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BI Engine, Dashboards, Performance, Looker

Description: Learn how to set up BigQuery BI Engine reservations to deliver sub-second query responses for interactive dashboards and reporting tools.

---

If you have ever built a dashboard on top of BigQuery, you know the pain of waiting several seconds for each chart to load. BigQuery is designed for analytical workloads at massive scale, but interactive dashboards need sub-second response times to feel usable. BigQuery BI Engine solves this by creating an in-memory analysis service that sits on top of BigQuery and caches data for fast, interactive queries.

In this post, I will explain how BI Engine works, how to set up a reservation, and how to configure your dashboards to take advantage of it.

## What BI Engine Actually Does

BI Engine is an in-memory caching layer that accelerates BigQuery queries from compatible BI tools. When a query hits BigQuery and BI Engine has the relevant data cached, the query can return in milliseconds instead of seconds. BI Engine is not a separate service you migrate data to - it works transparently with your existing BigQuery tables.

The way it works is that BI Engine maintains an in-memory cache of frequently accessed table data. When a compatible query arrives, BI Engine's vectorized query engine processes it directly from the cache rather than reading from BigQuery storage. This can reduce query latency from seconds to sub-second for typical dashboard queries.

BI Engine works natively with Looker Studio (formerly Data Studio), Looker, and any tool that connects through the BigQuery SQL interface. However, the level of acceleration varies by tool - Looker Studio gets the deepest integration with BI Engine's vectorized processing.

## Creating a BI Engine Reservation

A BI Engine reservation allocates a specified amount of memory for caching and accelerating queries. The reservation is created at the project level and applies to a specific region.

You can create a reservation through the Google Cloud Console, gcloud CLI, or the API. Here is how to do it with gcloud.

```bash
# Create a BI Engine reservation with 2 GB of memory in us-central1
gcloud bq bi-engine-reservations create \
  --project=my-project \
  --location=us-central1 \
  --size=2Gi
```

You can also create a reservation using the BigQuery API directly.

```bash
# Create a BI Engine reservation using the REST API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://bigqueryreservation.googleapis.com/v1/projects/my-project/locations/us-central1/biReservation" \
  -d '{
    "size": "2147483648"
  }'
```

The size is specified in bytes when using the API directly. 2 GB (2147483648 bytes) is a reasonable starting point, but you may need more depending on the volume of data your dashboards query.

## Sizing Your Reservation

Getting the right reservation size is important. Too small and BI Engine will not be able to cache enough data, reducing the acceleration benefit. Too large and you are paying for memory you do not use.

A few factors affect how much memory you need. The total size of data queried by your dashboards matters - BI Engine needs enough memory to hold the relevant columns. Only the columns actually referenced in queries are cached, so a wide table with 100 columns might only need cache space for the 10 columns your dashboards use. Compression also helps - BI Engine compresses cached data, so the memory footprint is often smaller than the raw data size.

As a rough guideline, start with 1-2 GB per dashboard if your tables are under 100 GB. For larger tables or more dashboards, increase accordingly. You can always adjust the reservation size later based on actual usage patterns.

## Checking BI Engine Status

After creating a reservation, you can verify it is active and check how much capacity is being used.

```bash
# Check the current BI Engine reservation details
gcloud bq bi-engine-reservations describe \
  --project=my-project \
  --location=us-central1
```

For more detailed information about which tables are being cached and how much memory each consumes, query the INFORMATION_SCHEMA.

```sql
-- Check BI Engine statistics for recent queries
SELECT
  job_id,
  creation_time,
  total_bytes_processed,
  bi_engine_statistics.bi_engine_mode AS bi_engine_mode,
  bi_engine_statistics.acceleration_mode AS acceleration_mode
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND bi_engine_statistics IS NOT NULL
ORDER BY
  creation_time DESC
LIMIT 20;
```

The bi_engine_mode field tells you whether BI Engine fully accelerated the query (FULL), partially accelerated it (PARTIAL), or could not accelerate it at all (DISABLED). Partial acceleration means BI Engine ran part of the query but had to fall back to regular BigQuery processing for some operations.

## Configuring Looker Studio for BI Engine

Looker Studio automatically uses BI Engine when a reservation exists in the same project and region as the BigQuery data source. No special configuration is needed - just create your Looker Studio report pointing at a BigQuery table and the acceleration happens transparently.

However, there are some query patterns that BI Engine accelerates better than others. To get the most benefit, keep these guidelines in mind.

Use standard aggregations like SUM, COUNT, AVG, MIN, and MAX. These are fully accelerated. Avoid complex subqueries or CTEs in custom SQL data sources, as these may not be fully accelerated. Use date range filters rather than complex date functions. Prefer calculated fields in Looker Studio over complex SQL expressions.

## Using BI Engine with Looker

If you are using Looker (not Looker Studio), BI Engine can accelerate queries sent from Looker to BigQuery. The setup is mostly automatic, but you should make sure your Looker connection is configured to use the same project and region where your BI Engine reservation exists.

In your Looker model, stick to simple LookML dimensions and measures for the best acceleration results.

```lookml
# LookML model that works well with BI Engine acceleration
view: daily_metrics {
  sql_table_name: `my_project.analytics.daily_metrics` ;;

  dimension: date {
    type: date
    sql: ${TABLE}.date ;;
  }

  dimension: region {
    type: string
    sql: ${TABLE}.region ;;
  }

  measure: total_revenue {
    type: sum
    sql: ${TABLE}.revenue ;;
  }

  measure: avg_session_duration {
    type: average
    sql: ${TABLE}.session_duration_seconds ;;
  }
}
```

## Optimizing Table Design for BI Engine

While BI Engine works with any BigQuery table, certain table designs get better acceleration. Partitioned and clustered tables are particularly effective because BI Engine can cache just the relevant partitions.

```sql
-- Create a table optimized for BI Engine caching
CREATE OR REPLACE TABLE `my_project.analytics.dashboard_metrics`
PARTITION BY date
CLUSTER BY region, product_category
AS
SELECT
  date,
  region,
  product_category,
  SUM(revenue) AS total_revenue,
  COUNT(DISTINCT user_id) AS unique_users,
  SUM(page_views) AS total_page_views
FROM
  `my_project.analytics.raw_events`
GROUP BY
  date, region, product_category;
```

Pre-aggregating data into a summary table is another effective strategy. Instead of having BI Engine cache raw event data, cache pre-computed aggregations that match what your dashboards actually need. This reduces the memory footprint and improves query performance.

## Adjusting Reservation Size

You can change the reservation size at any time without downtime. If you find that BI Engine is not caching enough data, increase the reservation.

```bash
# Increase the BI Engine reservation to 5 GB
gcloud bq bi-engine-reservations update \
  --project=my-project \
  --location=us-central1 \
  --size=5Gi
```

To remove the reservation entirely, set the size to 0.

```bash
# Remove the BI Engine reservation
gcloud bq bi-engine-reservations update \
  --project=my-project \
  --location=us-central1 \
  --size=0
```

## Cost Considerations

BI Engine reservations are charged per GB of memory per hour. The cost is relatively modest compared to on-demand BigQuery query costs, especially for dashboards that are accessed frequently. If a dashboard runs the same query 100 times a day across multiple users, paying for BI Engine memory to cache that data is almost certainly cheaper than paying for 100 full BigQuery scans.

The key to cost optimization is right-sizing your reservation. Monitor the acceleration status of your queries and adjust the reservation size based on actual usage. If most queries are fully accelerated, your reservation is well-sized. If you see many partially accelerated or unaccelerated queries, you might need more capacity.

## Wrapping Up

BigQuery BI Engine is one of those GCP features that provides a significant user experience improvement with minimal setup effort. Creating a memory reservation, pointing your dashboards at BigQuery, and letting BI Engine handle the caching gives you sub-second dashboard performance without redesigning your data architecture. For any team running interactive dashboards on BigQuery data, it is one of the first optimizations worth trying.
