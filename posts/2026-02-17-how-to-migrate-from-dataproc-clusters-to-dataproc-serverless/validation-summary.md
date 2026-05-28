# Validation Summary: How to Migrate from Dataproc Clusters to Dataproc Serverless

## Status
validated

## Post Type
Migration guide / technical tutorial

## Technologies Covered
- Google Cloud Dataproc
- Google Cloud Serverless for Apache Spark / Dataproc Serverless
- Apache Spark, PySpark, Spark SQL, SparkR
- Google Cloud Storage
- Google Cloud CLI
- Docker custom containers
- Artifact Registry
- Cloud Composer / Apache Airflow
- Dataproc Metastore
- Cloud Logging

## Sources Consulted
- Google Cloud SDK reference: `gcloud dataproc batches submit pyspark` - https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit/pyspark
- Google Cloud SDK reference: `gcloud dataproc jobs submit pyspark` - https://cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/pyspark
- Managed Service for Apache Spark custom containers - https://docs.cloud.google.com/dataproc-serverless/docs/guides/custom-containers
- Managed Service for Apache Spark runtime versions - https://docs.cloud.google.com/managed-spark/docs/concepts/versions/serverless-versions
- Managed Service for Apache Spark properties - https://docs.cloud.google.com/managed-spark/docs/concepts/spark-properties-serverless
- Serverless for Apache Spark network configuration - https://cloud.google.com/dataproc-serverless/docs/concepts/network
- Dataproc Serverless EnvironmentConfig REST reference - https://docs.cloud.google.com/dataproc-serverless/docs/reference/rest/v1/EnvironmentConfig
- Apache Airflow Google provider Dataproc operators - https://airflow.apache.org/docs/apache-airflow-providers-google/stable/operators/cloud/dataproc.html
- Serverless for Apache Spark monitoring and logs - https://docs.cloud.google.com/dataproc-serverless/docs/guides/monitor-troubleshoot-batches
- Serverless for Apache Spark staging buckets - https://cloud.google.com/dataproc-serverless/docs/concepts/buckets
- Google Cloud Dataproc pricing - https://cloud.google.com/dataproc/pricing

## Issues Found
- The post used runtime version `2.1` in gcloud and Airflow examples. Runtime `2.1` is currently unsupported, so the examples now use supported LTS runtime `2.2`.
- The custom container Dockerfile used `gcr.io/dataproc-serverless/spark-runtime:2.1-debian11` as a base image. Current Google guidance recommends building compatible custom containers from a normal OS base image, not including Spark, and adding required utilities. The Dockerfile was updated to use `debian:12-slim`, required Spark utilities, a custom Conda Python environment, `SPARK_EXTRA_CLASSPATH`, and the expected `spark` user.
- The startup-time table gave fixed time ranges that are not guaranteed and can vary with workload and custom image initialization. The wording now describes the operational difference without hard-coded timing claims.
- The gcloud examples used `--subnet=default` while the CLI reference describes the flag as a subnetwork URI. The examples now use a full subnetwork resource path.
- The Airflow batch example used `subnetwork_uri: "default"`, but the Dataproc API field is a subnetwork URI. The example now uses a full subnetwork resource path.
- The networking pitfall said Serverless requires Private Google Access on the subnet. Current documentation says Dataproc automatically enables Private Google Access on the selected subnet, while custom VPCs still need appropriate routes and firewall rules. The wording was corrected.
- The post described Serverless storage as "GCS only" and said all data must live in Cloud Storage. That was narrowed to clarify that Cloud Storage is the usual replacement for HDFS file paths, while supported external data sources and connectors may also be used.
- The billing benefit said only compute time is billed. The wording now says workload resource usage to avoid omitting related billable resources such as shuffle storage and, where used, accelerators.

## Review Notes
- The post still uses the familiar "Dataproc Serverless" name. Google documentation now presents this under "Managed Service for Apache Spark" and notes that it was formerly known as Google Cloud Serverless for Apache Spark / Dataproc Serverless.
- The high-level migration guidance is accurate for Spark batch workloads. Workloads using non-Cloud Storage connectors such as BigQuery should validate connector availability, dependencies, and runtime compatibility separately.
