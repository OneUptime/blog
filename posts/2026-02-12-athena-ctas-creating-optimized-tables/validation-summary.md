# Validation Summary: How to Use Athena CTAS for Creating Optimized Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Athena
- Athena CTAS and INSERT INTO
- Amazon S3
- Parquet, ORC, Avro, JSON, Ion, and text table formats
- AWS Step Functions Athena service integration

## Sources Consulted
- Amazon Athena User Guide: CREATE TABLE AS - https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena User Guide: Examples of CTAS queries - https://docs.aws.amazon.com/athena/latest/ug/ctas-examples.html
- Amazon Athena User Guide: Use CTAS and INSERT INTO to work around the 100 partition limit - https://docs.aws.amazon.com/athena/latest/ug/ctas-insert-into.html
- Amazon Athena User Guide: Use compression in Athena - https://docs.aws.amazon.com/athena/latest/ug/compression-formats.html
- Amazon Athena User Guide: Use ZSTD compression levels - https://docs.aws.amazon.com/athena/latest/ug/compression-support-zstd-levels.html
- Amazon Athena User Guide: What is bucketing? - https://docs.aws.amazon.com/athena/latest/ug/ctas-partitioning-and-bucketing-what-is-bucketing.html
- Amazon Athena Service Quotas - https://docs.aws.amazon.com/athena/latest/ug/service-limits.html
- AWS General Reference: Amazon Athena endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/athena.html
- AWS Step Functions Developer Guide: Run Athena queries with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-athena.html
- AWS Step Functions Developer Guide: Task workflow state - https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html

## Issues Found
- The CTAS format list omitted ION, which is listed in Athena's CTAS table properties. Added ION to the supported format list.
- The compression option description mentioned only `parquet_compression` and `orc_compression`. Those properties are valid, but Athena recommends `write_compression` for CTAS consistency across supported formats. Added `write_compression` and noted the recommendation.
- The bucketed and partitioned examples could exceed Athena's limit of 100 unique partition and bucket combinations if run across too many partitions. Added date filters so the examples stay within the documented limit.
- The limitations section described the limit as only 100 new partitions. Updated it to the more precise 100 unique partition and bucket combinations, with the no-buckets case explained.

## Review Notes
The Step Functions example uses `Parameters`, which remains valid for JSONPath-based state machines. Current AWS examples often show `Arguments` for JSONata, but the snippet does not set `QueryLanguage`, so the default JSONPath behavior applies.
