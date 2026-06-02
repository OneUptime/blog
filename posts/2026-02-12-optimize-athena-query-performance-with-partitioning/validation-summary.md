# Validation Summary: How to Optimize Athena Query Performance with Partitioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Athena
- Amazon S3
- AWS Glue Data Catalog
- AWS Glue crawlers
- Athena partition projection
- Athena CTAS
- Parquet
- Python
- Boto3

## Sources Consulted
- Amazon Athena User Guide: Partition your data - https://docs.aws.amazon.com/athena/latest/ug/partitions.html
- Amazon Athena User Guide: Use partition projection with Amazon Athena - https://docs.aws.amazon.com/athena/latest/ug/partition-projection.html
- Amazon Athena User Guide: Set up partition projection - https://docs.aws.amazon.com/athena/latest/ug/partition-projection-setting-up.html
- Amazon Athena User Guide: Supported types for partition projection - https://docs.aws.amazon.com/athena/latest/ug/partition-projection-supported-types.html
- Amazon Athena User Guide: Optimize data - https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-data-optimization-techniques.html
- Amazon Athena User Guide: CREATE TABLE AS - https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena pricing - https://aws.amazon.com/athena/pricing/
- Boto3 Athena get_query_execution reference - https://docs.aws.amazon.com/boto3/latest/reference/services/athena/client/get_query_execution.html
- AWS Glue Developer Guide: Using crawlers to populate the Data Catalog - https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html

## Issues Found
- The opening sentence said every Athena query has a cost. AWS pricing is based on data processed or compute used, and DDL/no-scan statements are not accurately described by that blanket statement. Changed it to "Every Athena query that scans data has a cost."
- The post said partition columns do not appear in the `STORED AS` part of the definition. That phrasing was inaccurate because `STORED AS` only defines file format. Changed it to explain that partition columns are declared in `PARTITIONED BY`, not the main column list.
- The post described partition projection as "the best approach for most cases" and said it "is faster." AWS documents partition projection as useful for highly partitioned tables and regularly added partitions, but also notes that it can perform worse for sparse tables. Changed the wording to make the guidance conditional.
- The over-partitioning section said each partition should contain at least 128 MB of data. AWS guidance is to avoid too many small files, and documents 128 MB as the default Parquet row group size rather than a hard minimum partition size. Changed the bullet to recommend reasonably large files and note the Parquet row group default.

## Review Notes
The SQL examples use valid Athena DDL/CTAS patterns, including Hive-style partition paths, partition projection table properties, and CTAS partition columns placed last in the SELECT list. The Boto3 `get_query_execution` example uses documented statistics fields. Partition projection remains workload-dependent, especially for sparse partition spaces or queries that omit predicates on partition keys.
