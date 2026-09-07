# Validation Summary: How to Capture PySpark DataFrame Lineage Beyond SQL Parsing

## Status
validated

## Post Type
Technical guide with PySpark examples, Spark submission commands, configuration, and integration-test guidance.

## Technologies Covered
- Python and PySpark DataFrames
- Apache Spark SQL, logical plans, listeners, and spark-submit
- Scala binary compatibility
- OpenLineage Spark integration 1.53.0, transports, dataset identities, and lineage facets
- PostgreSQL JDBC, Parquet, Amazon S3, and Hadoop S3A
- Apache Airflow OpenLineage provider

## Sources Consulted
- OpenLineage Spark installation: https://openlineage.io/docs/integrations/spark/installation/
- OpenLineage Spark main concepts: https://openlineage.io/docs/integrations/spark/main_concept/
- OpenLineage Spark configuration usage: https://openlineage.io/docs/integrations/spark/configuration/usage/
- OpenLineage Spark configuration parameters: https://openlineage.io/docs/integrations/spark/configuration/spark_conf/
- OpenLineage Spark job hierarchy: https://openlineage.io/docs/integrations/spark/job-hierarchy/
- OpenLineage Spark column lineage: https://openlineage.io/docs/integrations/spark/spark_column_lineage/
- OpenLineage Column Lineage Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- OpenLineage Lineage Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/lineage/
- OpenLineage run cycle: https://openlineage.io/docs/spec/run-cycle/
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/
- OpenLineage 1.17.1 release notes (S3 scheme normalization): https://openlineage.io/docs/1.42.1/releases/1_17_1/
- OpenLineage Java client configuration and file transport: https://openlineage.io/docs/client/java/configuration/
- Using OpenLineage with Spark: https://openlineage.io/docs/guides/spark/
- OpenLineage connector extension interfaces: https://openlineage.io/docs/guides/spark-connector/
- Spark SQL and DataFrames guide: https://spark.apache.org/docs/latest/sql-programming-guide.html
- Spark application submission: https://spark.apache.org/docs/latest/submitting-applications.html
- PySpark DataFrame quickstart: https://spark.apache.org/docs/latest/api/python/getting_started/quickstart_df.html
- PySpark join API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html
- PySpark withColumn API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.withColumn.html
- PySpark groupBy API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.groupBy.html
- PySpark to_date API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.to_date.html
- PySpark saveAsTable API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.saveAsTable.html
- PySpark explain API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html
- Spark JDBC data source: https://spark.apache.org/docs/latest/sql-data-sources-jdbc.html
- Spark cloud integration: https://spark.apache.org/docs/latest/cloud-integration.html
- Airflow OpenLineage Spark integration: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/spark.html

## Issues Found
1. **Missing SparkSession in the submitted Python application.** The example used `spark` without initializing it. Unlike the interactive PySpark shell, a Python script submitted through spark-submit does not automatically receive that variable. Added the SparkSession import and builder with a stable application name. Clarified required source tables, target database, and field types.
2. **Undocumented JDBC/S3 prerequisites and nonportable S3 scheme.** The example used `s3://` without identifying a filesystem implementation. Changed the executable path to `s3a://` and documented the PostgreSQL JDBC driver, compatible S3A dependencies, S3 credentials, and supplied JDBC credential variables.
3. **S3 normalization was presented as entirely manual.** OpenLineage Spark has normalized s3a/s3n dataset schemes to s3 since release 1.17.1. Clarified this existing behavior while retaining the need to align other producers and JDBC host identities.
4. **Compact column lineage could be confused with the newer Lineage Dataset Facet.** Clarified that datasetLineageEnabled controls the dataset member of columnLineage; it does not select the separate lineage facet used for structural DatasetEvent relationships. Retained the documented precedence of the newer facet for overlapping relationships.
5. **Test assertions assumed SQL table labels were emitted dataset names.** Catalog and storage connectors determine namespace/name pairs, and file-backed tables can be represented through storage identities. Updated the assertions to match the datasets corresponding to the example tables using the deployed connector's identifiers.
6. **Output-event timing and failure assertions were too strong.** OpenLineage can include output datasets in START events, before a write succeeds. Updated the test to inspect the write execution and distinguish FAIL from COMPLETE for an observed failed run. Clarified that output presence and connector-specific version metadata alone do not establish successful commit.

## Review Notes
- Reviewed as a technical guide and validated after the corrections above. The original section structure and transformation logic were preserved.
- The documented 1.53.0 installation coordinates use the Scala suffix shown in the post. The example's 2.13 value remains illustrative; the actual Spark/Scala/connector combination must be supported by the integration. The post does not claim universal Spark-version compatibility.
- The compact column-lineage setting is explicitly recommended in the official facet documentation. Direct arithmetic/aggregation dependencies and indirect filter, join, and grouping influences are consistent with the documented model, subject to supported plan visitors.
- Listener-based collection, lazy transformations, opaque UDF internals, loss of structured expressions through arbitrary RDD code, and collect without a durable sink are consistent with Spark's execution model. Declaring an opaque transformation unknown is guidance, not a claim that every integration automatically emits an UNKNOWN subtype.
- The Airflow provider documents parent and transport injection for supported operators. Support differs by operator/provider release; parent support alone does not guarantee transport injection support.
- All eight official documentation links in the post resolved to the intended resources. The older Spark walkthrough explicitly warns that its examples may require changes; current installation/configuration pages were used for package and configuration validation. Placeholder service hosts require replacement before execution.
- Validation performed: Python AST parsing for all three Python blocks, bash -n for both shell/configuration blocks, and JSON parsing with exact status/date checks. The standalone --conf line is an argument fragment to append to spark-submit, not a complete command.
- No Spark, JDBC, S3, or OpenLineage backend integration job was executed. PySpark is not installed in the review environment, and the post references example infrastructure. Runtime event contents, connector commit behavior, and backend facet interpretation still require the disposable integration test described in the post.
