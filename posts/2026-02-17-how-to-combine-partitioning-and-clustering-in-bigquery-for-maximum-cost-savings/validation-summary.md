# Validation Summary: How to Combine Partitioning and Clustering in BigQuery for Maximum Cost Savings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery partitioned tables
- BigQuery clustered tables
- BigQuery INFORMATION_SCHEMA
- BigQuery on-demand query pricing

## Sources Consulted
- Google Cloud BigQuery documentation: Introduction to partitioned tables: https://cloud.google.com/bigquery/docs/partitioned-tables
- Google Cloud BigQuery documentation: Creating partitioned tables: https://cloud.google.com/bigquery/docs/creating-partitioned-tables
- Google Cloud BigQuery documentation: Introduction to clustered tables: https://cloud.google.com/bigquery/docs/clustered-tables
- Google Cloud BigQuery documentation: Querying clustered tables: https://cloud.google.com/bigquery/docs/querying-clustered-tables
- Google Cloud BigQuery documentation: Manage clustered tables: https://cloud.google.com/bigquery/docs/manage-clustered-tables
- Google Cloud BigQuery pricing: https://cloud.google.com/bigquery/pricing

## Issues Found
- The post said to aim for at least 1 GB per partition. Google Cloud documentation recommends an average partition size of at least 10 GB when considering partitioning in addition to clustering, so this guidance was updated.
- The clustering-column guidance included JOIN conditions. BigQuery's clustering documentation focuses on filtering and aggregation for pruning and performance benefits, so the wording was narrowed to WHERE clauses and GROUP BY statements.
- The post used $5 per TB for on-demand query pricing. Current BigQuery pricing lists $6.25 per TiB after the first 1 TiB per month free tier, so the pricing statement and examples were updated.
- The cost calculation used TB/GB units and arithmetic based on the old price. The example now uses TiB/GiB units and updated daily/monthly savings.
- The post said clustering order is permanent and cannot be changed without recreating the table. Current BigQuery documentation says clustering specifications can be changed, but existing rows must be rewritten or updated to be organized under the new specification. The warning was corrected.
- The tiny-partition warning implied BigQuery handles tiny partitions without issue. The documentation notes that many small partitions increase metadata overhead and can affect metadata access times, so the wording was corrected.

## Review Notes
The SQL examples use valid BigQuery GoogleSQL syntax for creating partitioned and clustered tables and querying INFORMATION_SCHEMA. The query-log regex example is intentionally heuristic and only catches simple equality filters, but it is acceptable as an exploratory workload-analysis query.
