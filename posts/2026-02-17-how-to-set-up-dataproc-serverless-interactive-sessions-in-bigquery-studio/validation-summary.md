# Validation Summary: How to Set Up Dataproc Serverless Interactive Sessions in BigQuery Studio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- BigQuery Studio
- Dataproc Serverless / Managed Service for Apache Spark
- Spark Connect
- PySpark
- Spark BigQuery connector
- Google Cloud CLI
- IAM
- VPC networking

## Sources Consulted
- Google Cloud: Run PySpark code in BigQuery Studio notebooks: https://docs.cloud.google.com/bigquery/docs/use-spark
- Google Cloud: Create interactive sessions and session templates: https://docs.cloud.google.com/dataproc-serverless/docs/guides/create-serverless-sessions-templates
- Google Cloud: Managed Service for Apache Spark network configuration: https://docs.cloud.google.com/managed-spark/docs/concepts/network-serverless
- Google Cloud: Managed Service for Apache Spark serverless permissions and roles: https://docs.cloud.google.com/managed-spark/docs/concepts/iam-serverless
- Google Cloud: RuntimeConfig REST reference: https://docs.cloud.google.com/managed-spark/docs/reference/rest/v1/RuntimeConfig
- Google Cloud: EnvironmentConfig REST reference: https://docs.cloud.google.com/managed-spark/docs/reference/rest/v1/EnvironmentConfig
- Google Cloud: SessionTemplate REST reference: https://docs.cloud.google.com/dataproc-serverless/docs/reference/rest/v1/projects.locations.sessionTemplates
- Google Cloud SDK: gcloud beta dataproc sessions create spark: https://docs.cloud.google.com/sdk/gcloud/reference/beta/dataproc/sessions/create/spark
- Google Cloud SDK: gcloud beta dataproc session-templates import: https://docs.cloud.google.com/sdk/gcloud/reference/beta/dataproc/session-templates/import
- Google Cloud SDK: gcloud beta dataproc sessions list: https://docs.cloud.google.com/sdk/gcloud/reference/beta/dataproc/sessions/list
- Google Cloud SDK: gcloud beta dataproc sessions describe: https://docs.cloud.google.com/sdk/gcloud/reference/beta/dataproc/sessions/describe
- Google Cloud: Spark BigQuery connector for Managed Service for Apache Spark: https://docs.cloud.google.com/managed-spark/docs/guides/spark-bigquery-connector
- Google Cloud: Managed Service for Apache Spark pricing: https://cloud.google.com/products/managed-service-for-apache-spark/pricing

## Issues Found
- The prerequisites and API enablement steps omitted the Cloud Storage API and a Cloud Storage bucket, both listed by the official BigQuery Studio PySpark notebook setup docs. Updated the prerequisites and `gcloud services enable` command.
- The IAM role for BigQuery Studio was listed as `roles/bigquery.user`; the current docs require BigQuery Studio User (`roles/bigquery.studioUser`) for user credentials. Updated the role and grant command, and added the Dataproc Worker role note for service account credentials.
- The networking section said users might need to enable Private Google Access manually. Current Dataproc Serverless docs state Private Google Access is enabled automatically on the subnet. Updated the wording while keeping the manual command as an optional subnet configuration example.
- The Dataproc session template command and session commands omitted the `beta` command group used in the current gcloud references. Updated `session-templates import`, `sessions create`, `sessions list`, and `sessions describe`.
- The sample session template used runtime version `2.1` and did not specify Spark Connect. BigQuery Studio notebook session templates require runtime version `2.3` or later and Spark Connect. Updated the YAML to `2.3` and added `sparkConnectSession: {}`.
- The BigQuery Studio launch instructions referenced a non-current "PySpark notebook" flow. Updated the steps to use a BigQuery Studio Notebook and the `Query using Spark` template flow.
- The PySpark examples used a standard `SparkSession.builder.getOrCreate()` pattern. BigQuery Studio notebooks create Spark Connect sessions with `DataprocSparkSession` and a Dataproc `Session` object. Updated both examples.
- The idle timeout example used an unsupported Spark property. Current gcloud exposes idle timeout as `--max-idle`; updated the command.
- The pricing section only mentioned DCUs and omitted shuffle storage, accelerators, and the one-minute minimum. Updated the wording to match current pricing docs.

## Review Notes
The product is now documented in several places as Managed Service for Apache Spark, formerly Dataproc Serverless / Google Cloud Serverless for Apache Spark. The post can keep the Dataproc Serverless wording for reader familiarity, but future updates may want to mention the renamed product explicitly.
