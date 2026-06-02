# Validation Summary: How to Reduce Athena Query Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Athena
- Amazon S3
- AWS CLI
- AWS SDK for Python (Boto3)
- SQL / Athena CTAS
- Parquet, ORC, CSV, JSON
- Partition projection
- Compression formats

## Sources Consulted
- Amazon Athena pricing: https://aws.amazon.com/athena/pricing/
- Amazon Athena cost model, including failed, DDL, and canceled query billing: https://docs.aws.amazon.com/whitepapers/latest/big-data-analytics-options/amazon-athena.html
- Amazon Athena compression formats: https://docs.aws.amazon.com/athena/latest/ug/compression-formats.html
- Amazon Athena CTAS examples and compression properties: https://docs.aws.amazon.com/athena/latest/ug/ctas-examples.html
- Amazon Athena CREATE TABLE AS reference: https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena partitioning documentation: https://docs.aws.amazon.com/athena/latest/ug/partitions.html
- Amazon Athena partition projection documentation: https://docs.aws.amazon.com/athena/latest/ug/partition-projection.html
- Amazon Athena partition projection supported types: https://docs.aws.amazon.com/athena/latest/ug/partition-projection-supported-types.html
- Amazon Athena workgroup data usage controls: https://docs.aws.amazon.com/athena/latest/ug/workgroups-setting-control-limits-cloudwatch.html
- AWS CLI create-work-group command reference: https://docs.aws.amazon.com/cli/latest/reference/athena/create-work-group.html
- Amazon Athena query result reuse: https://docs.aws.amazon.com/athena/latest/ug/reusing-query-results.html
- Amazon Athena engine version 3 function notes: https://docs.aws.amazon.com/athena/latest/ug/engine-versions-reference-0003.html
- Trino aggregate function reference for approx_distinct: https://trino.io/docs/current/functions/aggregate.html
- Amazon Athena views and materialized view limitations: https://docs.aws.amazon.com/athena/latest/ug/create-view.html and https://docs.aws.amazon.com/athena/latest/ug/querying-iceberg-gdc-mv.html

## Issues Found
- The post said cancelled queries are free. AWS documentation says canceled queries are charged for the amount of data scanned before cancellation. Updated the pricing section and workgroup section accordingly.
- The post said reducing data scanned is the only way to reduce costs. This is accurate for pay-per-query scan billing, but Athena also has compute-based options such as capacity reservations. Updated the sentence to scope it to pay-per-query pricing.
- The post said Snappy is the default for Parquet. Current Athena documentation says GZIP is the default write compression for Parquet in CTAS queries. Updated the wording while preserving Snappy as a common performance-oriented choice.
- The LIMIT example said Athena stops scanning once it has enough rows. Athena can reduce scanned data for simple LIMIT queries, but the behavior is not a substitute for partition pruning or column selection. Updated the comment and explanatory text.
- The post said approximate aggregation functions scan less data. Approximate functions can improve performance and memory use, but they generally do not reduce Athena scan charges because the referenced columns still have to be read. Updated the explanation.
- The post said to create materialized views with CTAS. Athena CTAS creates tables, and Athena does not support CREATE MATERIALIZED VIEW for Glue Data Catalog materialized views. Updated the text to say summary tables with CTAS.

## Review Notes
The SQL and AWS CLI examples are syntactically plausible for Athena and AWS CLI v2. The Boto3 examples use current Athena APIs, but they only inspect the first page of query execution history; production cost reporting should paginate with NextToken.
