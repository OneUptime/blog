# Validation Summary: How to Set Up Kubernetes Batch Processing with Apache Spark Operator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Apache Spark
- Kubeflow Spark Operator
- Helm
- SparkApplication and ScheduledSparkApplication custom resources
- S3A / Hadoop AWS configuration

## Sources Consulted
- Kubeflow Spark Operator Getting Started: https://www.kubeflow.org/docs/components/spark-operator/getting-started/
- Kubeflow Spark Operator Writing a SparkApplication: https://www.kubeflow.org/docs/components/spark-operator/user-guide/writing-sparkapplication/
- Kubeflow Spark Operator Working with SparkApplications: https://www.kubeflow.org/docs/components/spark-operator/user-guide/working-with-sparkapplication/
- Kubeflow Spark Operator API Reference: https://kubeflow.github.io/spark-operator/docs/api-docs.html
- Kubeflow Spark Operator ScheduledSparkApplication guide: https://www.kubeflow.org/docs/components/spark-operator/user-guide/running-sparkapplication-on-schedule/
- Apache Spark Running on Kubernetes documentation: https://spark.apache.org/docs/latest/running-on-kubernetes.html
- Apache Spark Configuration documentation: https://spark.apache.org/docs/latest/configuration.html
- Apache Hadoop AWS S3A authentication documentation: https://apache.github.io/hadoop/hadoop-aws/tools/hadoop-aws/authentication.html

## Issues Found
- The Helm repository URL used the old Google Cloud Platform chart location. Updated it to the current official Kubeflow Spark Operator Helm repository.
- The install command did not configure the operator to watch the `data-processing` namespace used by the SparkApplication example. Added idempotent namespace creation and `spark.jobNamespaces={data-processing}`.
- The text said the webhook validates SparkApplication manifests. The official documentation describes it as a mutating admission webhook for Spark driver and executor pod customization, so the explanation was corrected.
- The post implied the operator sets up driver RBAC automatically for the SparkApplication. Updated the explanation and example to use the Helm chart's generated service account for the configured job namespace.
- The S3 example attempted to put `$(AWS_ACCESS_KEY_ID)` and `$(AWS_SECRET_ACCESS_KEY)` directly into Spark configuration. Spark configuration values are not shell-expanded that way, and hardcoding credentials in configuration is not recommended. Replaced this with Kubernetes Secret-backed environment variables and an S3A environment-variable credential provider.
- The restart policy description said retries use exponential backoff. Spark Operator documentation describes configured retry intervals and linear backoff, so the text was corrected.
- The dynamic allocation snippet used `shuffleTrackingTimeout: 60s`, but the Spark Operator API defines this field as an integer number of milliseconds. Updated it to `60000`.
- The dynamic allocation explanation was narrowed to the Kubernetes-specific requirement that shuffle tracking is needed because Kubernetes mode does not support Spark's external shuffle service.

## Review Notes
The examples still use Spark 3.1.1, matching the post's original version-specific examples and Kubeflow's older sample manifests. For a future refresh, consider updating the examples to a newer Spark image and matching Hadoop AWS dependency versions.
