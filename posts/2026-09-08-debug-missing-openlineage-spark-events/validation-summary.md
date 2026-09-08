# Validation Summary: How to Debug Missing OpenLineage Events from Spark Jobs

## Status
validated

## Post Type
Technical troubleshooting guide with Spark submission, configuration, and PySpark examples.

## Technologies Covered
- OpenLineage Spark integration and Java client
- Apache Spark, Spark SQL, PySpark, and Scala binary compatibility
- Hadoop S3A and Amazon S3
- HTTP and Kafka transports
- Log4j 2
- Data lineage, column lineage, and streaming lifecycle events

## Sources Consulted
- OpenLineage Spark installation: https://openlineage.io/docs/integrations/spark/installation/
- OpenLineage Spark configuration usage: https://openlineage.io/docs/integrations/spark/configuration/usage/
- OpenLineage Spark configuration parameters: https://openlineage.io/docs/integrations/spark/configuration/spark_conf/
- OpenLineage Spark transport configuration: https://openlineage.io/docs/integrations/spark/configuration/transport/
- OpenLineage Java client configuration, including console logging and transport behavior: https://openlineage.io/docs/client/java/configuration/
- OpenLineage debug facet: https://openlineage.io/docs/integrations/spark/debug_facet/
- OpenLineage column-level lineage: https://openlineage.io/docs/integrations/spark/spark_column_lineage/
- OpenLineage extension interfaces: https://openlineage.io/docs/integrations/spark/developing/built_in_lineage/
- OpenLineage integration metrics: https://openlineage.io/docs/integrations/spark/metrics/
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/
- OpenLineage Job Type facet and emission patterns: https://openlineage.io/docs/spec/facets/job-facets/job-type/
- Apache Spark configuration: https://spark.apache.org/docs/latest/configuration.html
- Apache Spark application submission: https://spark.apache.org/docs/latest/submitting-applications.html
- Apache Spark cloud integration and S3A prerequisites: https://spark.apache.org/docs/latest/cloud-integration.html
- Spark SQL getting started: https://spark.apache.org/docs/latest/sql-getting-started.html
- PySpark createDataFrame: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.SparkSession.createDataFrame.html
- PySpark temporary views: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.createOrReplaceTempView.html
- PySpark Parquet writer: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.parquet.html

## Issues Found
1. **The S3 canary assumed a platform-specific URI and omitted storage prerequisites.** Changed `s3://lineage-canary/output/run-1` to `s3a://lineage-canary/output/run-1`, the scheme documented for Hadoop S3A. Added the requirement to substitute a writable test bucket and supply compatible dependencies, credentials, and network access on the driver and executors. Some managed platforms support `s3://`, but a generic Spark submission cannot assume that mapping. Also identified the Python snippet as `lineage_canary.py`, matching the submission command.
2. **Smart debugging omitted its lifecycle restriction.** Added that the conditional debug facet is emitted only on qualifying `COMPLETE` events. This prevents readers from expecting it on every event or when no completion event is emitted.

## Review Notes
- Confirmed the listener class, `--packages` and `--conf` usage, Scala artifact suffix guidance, startup registration, non-additive listener configuration, Databricks listener preservation, and `spark.logConf` behavior.
- Confirmed console JSON logging at INFO, disabling through Spark configuration or environment, facet defaults, column-lineage defaults, filtering options, extension interfaces, and debug configuration names and values.
- Confirmed the documented job/run identities and batch/streaming lifecycle model. Specification support for periodic `RUNNING` events does not guarantee that every Spark integration version emits them on a particular schedule.
- The small in-memory canary tests emission and a physical output; it intentionally has no external input dataset. The separate permanent canary requirements correctly call for a known external input to validate input identities and column mappings.
- Transport counters are diagnostic instrumentation targets, not a claim that all listed measurements are supplied automatically by every transport. Receiver indexing, deduplication, UI filters, and processing lag depend on the selected backend.
- All eight links in the Official Documentation section resolved to the intended official resources. Documentation served during review identified OpenLineage 1.53.0 and Spark 4.2.0; the post intentionally requires runtime-compatible artifact selection rather than prescribing a fixed release. Readers on older releases should consult matching documentation, particularly for smart debugging and extension interfaces.
- Parsed the Python example with Python's AST parser and checked the submission command with `bash -n`; both passed. No deprecated APIs were identified in the example. No live Spark cluster, S3 write, Kafka delivery, or receiver ingestion test was performed, so validation is based on official documentation and static syntax checks rather than end-to-end execution.
