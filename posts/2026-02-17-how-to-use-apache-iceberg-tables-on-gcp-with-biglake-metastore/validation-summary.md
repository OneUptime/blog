# Validation Summary: How to Use Apache Iceberg Tables on GCP with BigLake Metastore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigLake Metastore
- Apache Iceberg
- BigQuery external tables
- Dataproc / Apache Spark
- PySpark and Spark SQL
- Cloud Storage

## Sources Consulted
- Google Cloud BigLake Metastore classic documentation: https://docs.cloud.google.com/bigquery/docs/manage-open-source-metadata
- Google Cloud BigLake REST API catalog creation reference: https://docs.cloud.google.com/bigquery/docs/reference/biglake/rest/v1/projects.locations.catalogs/create
- Google Cloud BigLake REST API database resource reference: https://docs.cloud.google.com/bigquery/docs/reference/biglake/rest/v1alpha1/projects.locations.catalogs.databases
- Google Cloud BigQuery Apache Iceberg external table documentation: https://docs.cloud.google.com/bigquery/docs/iceberg-external-tables
- Google Cloud Lakehouse Iceberg REST catalog documentation: https://docs.cloud.google.com/lakehouse/docs/lakehouse-iceberg-rest-catalog
- Apache Iceberg Spark DDL documentation: https://apache.github.io/iceberg/docs/latest/spark-ddl/
- Apache Iceberg Spark SQL configuration documentation: https://apache.github.io/iceberg/docs/latest/spark-configuration/
- Apache Iceberg Spark query and time travel documentation: https://iceberg.apache.org/docs/nightly/spark-queries/
- Apache Iceberg Spark procedures documentation: https://apache.github.io/iceberg/docs/latest/spark-procedures/
- Apache Iceberg schema and partition evolution documentation: https://iceberg.apache.org/docs/1.4.2/evolution/

## Issues Found
- The BigLake Metastore catalog ID used hyphens (`my-iceberg-catalog`), but the classic metastore naming rules allow letters, numbers, and underscores. Changed it to `my_iceberg_catalog` in the API calls, Spark configuration, and BigQuery URI.
- The Dataproc Spark configuration referenced `org.apache.iceberg.gcp.biglake.BigLakeCatalog` without installing the BigLake Iceberg catalog plugin JAR. Added the official BigLake catalog JAR and aligned the Iceberg runtime package version with it.
- The Spark configuration omitted `spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions`, which is required for Iceberg Spark SQL extensions such as stored procedures. Added it to the cluster properties.
- The Iceberg partition transform used `days(event_time)`. Updated it to the documented Spark DDL transform `day(event_time)`.
- The BigQuery external table used a direct metadata JSON file URI even though the surrounding text describes querying through BigLake Metastore. Replaced it with the documented `blms://...` URI so BigQuery points at the metastore table.
- The time travel description said the table could be queried at any point in the past. Clarified that this depends on retained snapshots.
- The post described Spark on Dataproc as the best current way to create and write Iceberg tables on GCP. Changed this to "a common way" to avoid an outdated or subjective claim.

## Review Notes
`gcloud` is not installed in this workspace, so CLI flag verification was based on Google Cloud documentation rather than local `gcloud --help` output. The post uses BigLake Metastore classic APIs and the classic `BigLakeCatalog` Spark integration; Google Cloud also documents the newer Lakehouse Iceberg REST catalog, which may be preferable for a future update.
