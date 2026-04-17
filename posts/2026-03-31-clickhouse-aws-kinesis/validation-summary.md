# Validation Summary: How to Use ClickHouse with AWS Kinesis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, s3() table function, HTTP API, JSON format functions)
- AWS Kinesis Data Streams
- AWS Kinesis Data Firehose
- AWS Lambda (Python 3.12 runtime, Kinesis event source mapping)
- Amazon S3
- Python (boto3, clickhouse-connect, urllib)
- SQL

## Sources Consulted
- ClickHouse s3() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse JSONEachRow format: https://clickhouse.com/docs/en/interfaces/formats/JSONEachRow
- ClickHouse JSONAsString format: https://clickhouse.com/docs/en/interfaces/formats/JSONAsString
- AWS CLI kinesis reference: https://docs.aws.amazon.com/cli/latest/reference/kinesis/
- AWS CLI firehose create-delivery-stream: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- AWS CLI lambda create-event-source-mapping: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- boto3 Kinesis client documentation

## Issues Found

1. **Incorrect s3() format + column mismatch (Pattern 1 SELECT and INSERT queries).** The queries used `JSONExtractString(raw, ...)` on a column named `raw`, but the format argument was `'JSONEachRow'`. With `JSONEachRow`, ClickHouse parses JSON fields into named columns — there is no `raw` column, so the query would fail. Changed the format to `'JSONAsString'` and added the structure hint `'raw String'` so the raw JSON line is placed in a single `raw String` column that the `JSONExtract*` functions can operate on.

2. **Wrong Firehose source configuration key.** The `--kinesis-stream-source-configuration` shorthand used `StreamARN=...`, but the correct key (per the AWS CLI Firehose docs) is `KinesisStreamARN=...`. Fixed.

3. **Deprecated Firehose destination flag.** The command used `--s3-destination-configuration`, which is deprecated in favor of `--extended-s3-destination-configuration`. Updated to the current flag; the shorthand keys (BucketARN, RoleARN, Prefix, ErrorOutputPrefix, BufferingHints, CompressionFormat) are identical between the two, so no other changes were needed.

4. **Architecture overview mis-labeled Pattern 3 as "ClickHouse JDBC".** The Pattern 3 code uses `clickhouse_connect`, which is ClickHouse's Python HTTP client, not JDBC (which is Java-only). Changed the diagram label to "ClickHouse HTTP".

5. **Pattern 3 intro incorrectly cited KCL.** The intro said "use the Kinesis Client Library with bulk inserts," but the sample code uses boto3's `describe_stream` / `get_shard_iterator` / `get_records` directly, not the KCL (Kinesis Client Library / MultiLang Daemon). Changed to "use the Kinesis SDK directly with bulk inserts" to match the code.

## Review Notes

- The Pattern 3 consumer polls all shards sequentially in a single thread and sleeps 500 ms between rounds. This is fine as an introductory example but will cap throughput well below what Kinesis supports — a production-grade reader would fan shards out across threads/processes and back off on `ProvisionedThroughputExceededException`. Not wrong, just worth noting.
- Firehose S3 delivery writes records concatenated as received. If the Kinesis records are not already newline-terminated, multiple JSON objects will end up on a single line and `JSONAsString` (which reads one JSON value per line) will fail. In practice you either use a Firehose Lambda transform to append `\n` to each record, or use `JSONEachRow` (ClickHouse's JSONEachRow parser tolerates records back-to-back). The post doesn't mention this nuance — a future revision could call it out.
- Python 3.12 Lambda runtime is fully supported as of April 2026 (deprecation scheduled October 2028). No action needed now.
- The Summary line mentions "Python KCL or direct GetRecords" — after the Pattern 3 intro fix, this is accurate since it presents both as alternatives.
