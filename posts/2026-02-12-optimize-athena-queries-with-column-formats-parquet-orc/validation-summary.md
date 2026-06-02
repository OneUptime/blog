# Validation Summary: How to Optimize Athena Queries with Column Formats (Parquet, ORC)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Athena
- Amazon S3
- Apache Parquet
- Apache ORC
- AWS Glue ETL
- PyArrow
- boto3
- SQL CTAS statements

## Sources Consulted
- Amazon Athena User Guide: Use columnar storage formats - https://docs.aws.amazon.com/athena/latest/ug/columnar-storage.html
- Amazon Athena User Guide: CREATE TABLE AS - https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena User Guide: Examples of CTAS queries - https://docs.aws.amazon.com/athena/latest/ug/ctas-examples.html
- Amazon Athena User Guide: Use compression in Athena - https://docs.aws.amazon.com/athena/latest/ug/compression-formats.html
- Amazon Athena User Guide: Optimize data - https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-data-optimization-techniques.html
- Amazon Athena User Guide: ORC SerDe - https://docs.aws.amazon.com/athena/latest/ug/orc-serde.html
- Amazon Athena User Guide: Handle schema updates - https://docs.aws.amazon.com/athena/latest/ug/handling-schema-updates-chapter.html
- Amazon Athena Pricing - https://aws.amazon.com/athena/pricing/
- AWS Glue Developer Guide: DynamicFrameWriter class - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-dynamic-frame-writer.html
- AWS Glue Developer Guide: Using the Parquet format in AWS Glue - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format-parquet-home.html
- Apache Arrow documentation: pyarrow.parquet.write_table - https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- boto3 documentation: Athena start_query_execution - https://docs.aws.amazon.com/botocore/latest/reference/services/athena/client/start_query_execution.html
- boto3 documentation: Athena get_query_execution - https://docs.aws.amazon.com/boto3/latest/reference/services/athena/client/get_query_execution.html

## Issues Found
- Athena CTAS Parquet compression defaults were described as Snappy. AWS documents GZIP as the Athena CTAS default for Parquet writes, so the post now identifies GZIP as the Athena CTAS default and explicitly uses `write_compression = 'SNAPPY'` where Snappy output is intended.
- CTAS examples used `parquet_compression`. AWS still supports it, but current CTAS documentation recommends the format-neutral `write_compression` property. The examples now use `write_compression`.
- The PyArrow example passed `row_group_size=128 * 1024 * 1024` with a comment saying 128 MB row groups. PyArrow's `row_group_size` is a number of rows, not bytes. The example now uses `row_group_size=1_000_000` and notes that it should be tuned based on row width.
- The Parquet vs. ORC comparison overstated Parquet's advantage for nested and complex types. AWS documentation says ORC can be preferable for some complex type workloads, so the recommendation now says ORC is worth testing when complex types are heavily used.
- The compression table called Snappy the default for Parquet without scoping the default to a specific writer. The table and surrounding text now distinguish common PyArrow/AWS Glue defaults from Athena CTAS defaults.
- The LZO recommendation was too broad for Athena-written Parquet data. The table now frames LZO as most relevant for existing datasets that already use it.

## Review Notes
The post's core explanation of column pruning, compression benefits, predicate pushdown, sorting for min/max metadata skipping, CTAS conversion, Glue DynamicFrame writing, boto3 query statistics, and Athena pricing examples is consistent with the official documentation reviewed. Performance and compression ratios remain illustrative and should be benchmarked for each dataset.
