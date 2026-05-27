# Validation Summary: How to Submit a PySpark Job to Dataproc Serverless for Batch Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc Serverless / Managed Service for Apache Spark
- PySpark
- Google Cloud CLI
- Cloud Storage
- BigQuery Spark connector
- Cloud Composer / Apache Airflow

## Sources Consulted
- Google Cloud CLI reference for `gcloud dataproc batches submit pyspark`: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit/pyspark
- Managed Service for Apache Spark network configuration: https://docs.cloud.google.com/dataproc-serverless/docs/concepts/network
- Managed Service for Apache Spark Spark properties: https://docs.cloud.google.com/managed-spark/docs/concepts/spark-properties-serverless
- Managed Service for Apache Spark REST Batch resource: https://docs.cloud.google.com/managed-spark/docs/reference/rest/v1/projects.locations.batches
- Google Cloud Dataproc `ExecutionConfig` API reference: https://docs.cloud.google.com/dotnet/docs/reference/Google.Cloud.Dataproc.V1/latest/Google.Cloud.Dataproc.V1.ExecutionConfig
- Managed Service for Apache Spark BigQuery connector guide: https://docs.cloud.google.com/managed-spark/docs/guides/spark-bigquery-connector
- Managed Service for Apache Spark pricing: https://cloud.google.com/products/managed-service-for-apache-spark/pricing
- Apache Airflow Google provider `DataprocCreateBatchOperator` reference: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/_api/airflow/providers/google/cloud/operators/dataproc/index.html

## Issues Found
- Updated the networking prerequisite wording. Current documentation says serverless Spark workloads run on internal IPs and use Private Google Access on the regional subnet, with the default subnet selected when no subnet is specified.
- Changed the sequence diagram response from "Return results" to "Return status" because batch submission and describe operations return workload status and metadata, not the job output data.
- Replaced the dependency bundling example from `pandas scikit-learn` to `requests`; zipped `--py-files` dependencies are appropriate for pure Python libraries, while packages with native extensions are better handled with a custom container.
- Removed the explicit old BigQuery connector jar from the submit command. Supported serverless Spark runtimes include the BigQuery connector.
- Updated the Airflow DAG to use `schedule` instead of the older `schedule_interval` argument and changed `subnetwork_uri` to a full subnetwork URI.
- Removed an unnecessary BigQuery jar from the daily ETL Airflow batch config.
- Corrected the cost section to describe Data Compute Unit billing instead of vCPU-hour and GB-hour billing, and clarified that cluster comparisons must include management, VM, and disk costs.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation used the official Google Cloud CLI reference instead of local `--help` output.
