# Validation Summary: ClickHouse vs Snowflake for Analytics

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- ClickHouse (self-hosted and ClickHouse Cloud)
- Snowflake (cloud data warehouse)
- SQL (ClickHouse dialect and Snowflake/ANSI SQL)
- Apache Kafka (mentioned for ClickHouse streaming ingestion)
- S3/GCS/Azure (mentioned for storage and bulk loading)

## Sources Consulted
- Snowflake documentation on virtual warehouse sizing and credit consumption: https://docs.snowflake.com/en/user-guide/warehouses-overview
- Snowflake pricing documentation on credit costs by edition: https://docs.snowflake.com/en/user-guide/credits
- ClickHouse documentation on `toStartOfDay()`, `count()`, `uniq()`, `uniqExact()` functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on data ingestion and Kafka engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- Snowflake documentation on Snowpipe and Snowflake Streaming: https://docs.snowflake.com/en/user-guide/data-load-snowpipe-intro
- Snowflake documentation on Data Sharing: https://docs.snowflake.com/en/user-guide/data-sharing-intro
- Snowflake SQL function reference for DATE_TRUNC: https://docs.snowflake.com/en/sql-reference/functions/date_trunc

## Issues Found

### 1. Incorrect Snowflake credit pricing description
**What was wrong:** The post stated "An XL warehouse costs roughly $16/credit and consumes 16 credits/hour." The "$16/credit" figure is incorrect — Snowflake credits cost approximately $2-$4 each depending on the edition (Standard, Enterprise, Business Critical). The calculation in the cost example already used the correct $2/credit figure, creating an internal contradiction.
**What was changed:** Reworded to: "An XL warehouse consumes 16 credits/hour when active, with each credit costing roughly $2-$4 depending on the edition."
**Why:** The original phrasing was factually wrong and contradicted the cost calculation that followed it.

### 2. SQL query mislabeled as working on "Both" platforms
**What was wrong:** The time-series aggregation query used ClickHouse-specific functions (`toStartOfDay()`, `count()` without `*`, `uniqExact()`) but was labeled with the comment "Both: time-series aggregation over 1 billion rows." This query would not execute on Snowflake, which uses `DATE_TRUNC('DAY', ...)`, `COUNT(*)`, and `COUNT(DISTINCT ...)`.
**What was changed:** Changed the comment to "ClickHouse:" and added the Snowflake equivalent query as a comment block below it.
**Why:** Readers trying to run the query on Snowflake would get syntax errors. Showing both dialects reinforces the SQL differences discussed later in the post.

## Review Notes
- The performance claims (ClickHouse 5-50x faster on single-table aggregations, 1-3s vs 10-30s on XL) are in the right ballpark based on published benchmarks like ClickBench, though actual results vary significantly by data shape, query complexity, and configuration. These are reasonable directional claims for a comparison blog post.
- The ClickHouse Cloud pricing range ($600-1,200/month for a 4-node cluster) is approximate and will vary based on instance types, regions, and ClickHouse Cloud's evolving pricing model. This is acceptable for a comparison post but readers should check current pricing.
- The post correctly notes that ClickHouse Cloud supports compute-storage separation, which is an important nuance often missed in comparisons.
- Snowflake Streaming (Snowpipe Streaming) latency is described as "seconds" which is accurate for the newer Snowpipe Streaming API, distinct from the original Snowpipe which has minute-level latency.
