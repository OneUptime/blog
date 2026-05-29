# Validation Summary: How to Build a Data Lakehouse Architecture on GCP Using Cloud Storage Dataproc

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud Dataproc
- Apache Spark / PySpark
- Apache Iceberg
- BigQuery / BigLake external tables
- Cloud Composer / Apache Airflow
- Google Cloud CLI, bq CLI, and Cloud Storage IAM

## Sources Consulted
- Google Cloud Storage Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage lifecycle configuration examples: https://cloud.google.com/storage/docs/lifecycle-configurations
- Google Cloud Dataproc cluster properties: https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/cluster-properties
- Google Cloud Dataproc 2.2 image version documentation: https://cloud.google.com/dataproc/docs/concepts/versioning/dataproc-release-2.2
- Google BigQuery Cloud resource connections: https://cloud.google.com/bigquery/docs/create-cloud-resource-connection
- Google BigQuery Apache Iceberg external tables: https://cloud.google.com/bigquery/docs/iceberg-external-tables
- Apache Iceberg Spark configuration: https://iceberg.apache.org/docs/latest/spark-configuration/
- Apache Iceberg Spark DDL: https://iceberg.apache.org/docs/latest/spark-ddl/
- Apache Iceberg Spark writes: https://iceberg.apache.org/docs/latest/docs/spark-writes/
- Apache Iceberg Spark multi-engine support: https://iceberg.apache.org/multi-engine-support/
- Apache Spark PySpark functions reference: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/functions.html
- Apache Airflow Google Dataproc operators: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/operators/cloud/dataproc.html
- Apache Airflow DataprocSubmitJobOperator API reference: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/_api/airflow/providers/google/cloud/operators/dataproc/index.html

## Issues Found
- The architecture diagram referenced "BigQuery Metastore", which is not the catalog used by the post's Hadoop-catalog Iceberg examples. Changed it to "Metadata files in Cloud Storage" under "Iceberg Metadata" to match the implementation.
- The Cloud Storage lifecycle JSON omitted the required top-level `lifecycle` object and targeted a `raw/` prefix that did not match the tutorial's bronze landing path. Added the wrapper and changed the prefix to `landing/`.
- The Dataproc cluster text said Iceberg libraries were pre-installed, but the command uses `spark.jars.packages` to load them. Updated the wording and escaped the comma-containing Dataproc `--properties` value with a custom delimiter.
- The Iceberg runtime coordinate used an old Spark 3.5-compatible version. Updated it to the current Spark 3.5-supported Iceberg runtime version listed by Apache Iceberg.
- The silver-layer `MERGE INTO` could fail on the first run because the target table did not exist. Added a `CREATE TABLE IF NOT EXISTS ... AS SELECT ... WHERE 1 = 0` step before the merge.
- The gold-layer PySpark snippet used `when()` without importing it. Added the missing import.
- The gold-layer date aggregation used `date_trunc`, which would produce a timestamp-like field and could make the later BigQuery date predicate invalid. Changed the grouping to use the existing `DATE` column.
- The BigQuery connection commands omitted the project ID in places and used older IAM syntax. Added `--project_id`, used the documented fully qualified connection ID for `bq show`, and changed the IAM grant to `gcloud storage buckets add-iam-policy-binding`.
- The BigQuery `WITH CONNECTION` example omitted the project component and used a fixed Iceberg metadata file name. Updated it to the documented fully qualified connection name and a placeholder for the latest metadata JSON file.
- The Cloud Composer DAG had a syntactically invalid import, `DataprocSubmitPySpark JobOperator`. Replaced the deprecated typed PySpark operator pattern with the current `DataprocSubmitJobOperator` and a PySpark job dictionary.

## Review Notes
The post is technically relevant and validated after fixes. The direct-metadata-file BigQuery Iceberg approach is valid but operationally brittle because the external table must be kept pointed at the latest Iceberg metadata JSON file; Google recommends BigLake metastore for managed Iceberg table integration.
