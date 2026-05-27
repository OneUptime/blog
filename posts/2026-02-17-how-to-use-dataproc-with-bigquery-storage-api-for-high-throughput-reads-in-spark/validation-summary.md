# Validation Summary: How to Use Dataproc with BigQuery Storage API for High-Throughput Reads in Spark

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Dataproc / Managed Service for Apache Spark
- BigQuery
- BigQuery Storage Read API
- BigQuery Storage Write API
- Spark BigQuery connector
- Apache Spark / PySpark
- Apache Arrow
- Apache Avro
- Google Cloud CLI

## Sources Consulted
- Google Cloud Dataproc / Managed Service for Apache Spark documentation: Use the Spark BigQuery connector: https://docs.cloud.google.com/dataproc/docs/tutorials/bigquery-connector-spark-example
- Spark BigQuery connector official README and option reference: https://github.com/GoogleCloudDataproc/spark-bigquery-connector
- BigQuery Storage Read API official documentation: https://docs.cloud.google.com/bigquery/docs/reference/storage
- BigQuery Storage API RPC reference: https://docs.cloud.google.com/bigquery/docs/reference/storage/rpc/google.cloud.bigquery.storage.v1

## Issues Found
- The post described the current Spark BigQuery connector as a standard export-based connector. Current official documentation states that the Spark BigQuery connector takes advantage of the BigQuery Storage API for reads. I changed this language to refer to older export-based read paths instead.
- The setup examples pinned an older connector jar with `spark.jars` even though Dataproc 2.1 and later images include the connector by default. I removed the unnecessary jar configuration from the Dataproc and Serverless examples.
- The code examples used the deprecated `table` option. I changed reads and writes to use `.load("project.dataset.table")` and `.save("project.dataset.table")`, matching the connector's current documented style.
- The query example omitted `viewsEnabled`, which the connector requires for reading from views or query results. I added `.option("viewsEnabled", "true")`.
- The performance benchmark incorrectly labeled `readDataFormat=AVRO` as a standard export path. Avro is also a BigQuery Storage Read API serialization format, so I reframed the benchmark as Arrow versus Avro.
- The explanation said Storage API streams are formatted specifically as Apache Arrow. The Storage Read API supports both Apache Arrow and Avro, so I corrected that wording.

## Review Notes
The examples are illustrative and still depend on valid project IDs, datasets, IAM permissions, service account access, API enablement, and regional compatibility in the reader's Google Cloud environment. The performance figures are presented as anecdotal examples rather than guaranteed results.
