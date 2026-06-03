# Validation Summary: How to Deploy Apache Spark on Kubernetes Using the Spark Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Spark 3.5.0
- PySpark
- Kubernetes
- Kubeflow Spark Operator
- Helm
- Docker
- Kubernetes CronJob and RBAC
- Amazon S3 via Hadoop S3A
- NVIDIA RAPIDS Accelerator for Apache Spark
- Prometheus metrics

## Sources Consulted
- Kubeflow Spark Operator Getting Started: https://www.kubeflow.org/docs/components/spark-operator/getting-started/
- Kubeflow Spark Operator Writing a SparkApplication: https://www.kubeflow.org/docs/components/spark-operator/user-guide/writing-sparkapplication/
- Kubeflow Spark Operator SparkApplication API reference: https://www.kubeflow.org/docs/components/spark-operator/reference/api-docs/
- Apache Spark 3.5 Kubernetes documentation: https://spark.apache.org/docs/3.5.0/running-on-kubernetes.html
- Apache Spark 3.5 configuration documentation: https://spark.apache.org/docs/3.5.4/configuration.html
- PySpark Window API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Window.html
- NVIDIA RAPIDS Accelerator for Apache Spark documentation: https://docs.nvidia.com/spark-rapids/

## Issues Found
- The Spark Operator Helm repository URL used the old Google Cloud Platform chart location. Updated it to the current Kubeflow Helm repository URL.
- The Helm chart value `sparkJobNamespace` is not the current chart value. Updated it to `spark.jobNamespaces`.
- The first PySpark example called `.over()` without a `WindowSpec`, which would fail at runtime. Added a `Window` import and an explicit window specification.
- The first PySpark example said it read from S3/GCS while using an `s3a://` path only. Changed the comment to S3.
- The Dockerfile copied only `data_processing.py`, but later examples submit `feature_engineering.py` from the same image. Updated the copy instruction to include Python application files.
- The SparkApplication used S3A without adding the Hadoop AWS dependencies needed by the stock Spark image. Added matching `hadoop-aws` and AWS SDK bundle packages for Spark 3.5.0's Hadoop line.
- The dynamic allocation example set `executor.instances: 5` while `initialExecutors` was `2`; the operator uses the larger value. Changed `executor.instances` to `2`.
- The feature engineering PySpark example used `Window` without importing it. Added the import.
- The `rolling_avg_7d` calculation used `.rowsBetween(-7, 0)`, which means seven rows, not seven days. Changed it to a timestamp-based `rangeBetween` window.
- The scheduled Spark job referenced an undefined `spark-submit` service account. Changed it to the previously defined `spark-driver` service account.
- The scheduled PySpark job used the generic Spark image. Changed it to the Python Spark image.
- The GPU example omitted Kubernetes GPU vendor and discovery configuration required by Spark on Kubernetes. Added `spark.executor.resource.gpu.vendor` and `spark.executor.resource.gpu.discoveryScript`.
- The RAPIDS example enabled the plugin without adding the RAPIDS and cuDF JAR packages. Added `spark.jars.packages` entries for the RAPIDS Accelerator and cuDF.
- The RAPIDS Dockerfile started from a CUDA image but did not install Spark. Changed it to start from the Spark Python image.
- The Prometheus metric names did not match the Spark Operator's documented metrics. Updated them to documented operator metric names.
- The performance tuning snippet enabled the external shuffle service, which is not available in Spark's Kubernetes mode. Replaced it with shuffle tracking for dynamic allocation.

## Review Notes
The snippets were checked for Python syntax and YAML parseability after edits. The examples still assume a Kubernetes cluster with the NVIDIA device plugin for GPU scheduling, reachable Maven repositories for `spark.jars.packages`, and appropriate cloud IAM permissions for S3 access.
