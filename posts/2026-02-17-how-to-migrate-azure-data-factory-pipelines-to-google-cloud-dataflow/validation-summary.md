# Validation Summary: How to Migrate Azure Data Factory Pipelines to Google Cloud Dataflow

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Data Factory
- Azure Data Factory Mapping Data Flows
- Google Cloud Dataflow
- Apache Beam Python SDK
- Dataflow templates
- BigQuery
- Google Cloud CLI
- Cloud Composer / Apache Airflow
- Cloud Monitoring

## Sources Consulted
- Azure Data Factory introduction and core concepts: https://learn.microsoft.com/en-us/azure/data-factory/introduction
- Azure Data Factory mapping data flow transformation overview: https://learn.microsoft.com/en-us/azure/data-factory/data-flow-transformation-overview
- Google Cloud Dataflow overview: https://docs.cloud.google.com/dataflow/docs/overview
- Dataflow template execution with gcloud: https://docs.cloud.google.com/dataflow/docs/guides/templates/running-templates
- Cloud Storage CSV files to BigQuery Dataflow template: https://docs.cloud.google.com/dataflow/docs/guides/templates/provided/cloud-storage-csv-to-bigquery
- Cloud Storage Text to BigQuery Dataflow template: https://docs.cloud.google.com/dataflow/docs/guides/templates/provided/cloud-storage-to-bigquery
- Dataflow pipeline options reference: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud CLI `gcloud dataflow jobs run` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Google Cloud CLI argument escaping reference: https://docs.cloud.google.com/sdk/gcloud/reference/topic/escaping
- Google Cloud CLI `gcloud dataflow jobs list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/list
- Google Cloud CLI `gcloud dataflow jobs describe` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/describe
- Apache Beam BigQuery I/O Python documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.bigquery.html
- Apache Beam JDBC I/O Python documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.jdbc.html
- Cloud Composer documentation: https://cloud.google.com/composer/docs/
- Apache Airflow Google provider Dataflow operator documentation: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/operators/cloud/dataflow.html
- Apache Airflow DAG scheduling documentation: https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/cron.html

## Issues Found
- The Dataflow template command used the Cloud Storage Text to BigQuery template without the required JavaScript UDF parameters and used a non-regional template path. Changed the example to the Cloud Storage CSV files to BigQuery template, updated the `gcs-location`, added the required CSV template parameters, and used an alternate `gcloud` list delimiter so the comma CSV delimiter is passed correctly.
- The incremental-load example defined `update_watermark` but never applied it in the Beam pipeline. Chained the update after the BigQuery write result using `destination_load_jobid_pairs`, and corrected the BigQuery `MERGE` insert clause to include target columns.
- The transformation example said the pipeline wrote to "a database" while the code writes to BigQuery. Updated the wording to match the sink.
- The Cloud Composer DAG used `schedule_interval`. Updated it to the current `schedule` parameter used by modern Airflow DAG examples.
- The Azure Blob Storage mapping implied Beam could use `gs://` paths directly for Azure Blob data. Clarified that files should first be moved to Cloud Storage before using Beam Cloud Storage file readers.

## Review Notes
- The migration guidance is conceptually accurate: ADF combines orchestration and data movement, while Dataflow is an Apache Beam execution service and Cloud Composer is the closer orchestration analog on Google Cloud.
- The simple copy example still assumes source files are already in Cloud Storage. A full Azure Blob-to-Google migration would normally include a transfer step, such as Storage Transfer Service or another ingestion mechanism, before the shown Dataflow template.
