# Validation Summary: How to Deploy Apache Spark on Kubernetes with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD Applications and GitOps sync configuration
- Kubernetes Deployments and custom resources
- Kubeflow Spark Operator Helm chart
- SparkApplication and ScheduledSparkApplication CRDs
- Apache Spark 3.5 on Kubernetes
- Spark Structured Streaming
- Spark dynamic allocation
- Spark History Server
- Docker images for Spark workloads

## Sources Consulted
- Kubeflow Spark Operator Getting Started: https://www.kubeflow.org/docs/components/spark-operator/getting-started/
- Kubeflow Spark Operator Helm chart 2.5.0 index and chart values: https://kubeflow.github.io/spark-operator/index.yaml
- Kubeflow Spark Operator SparkApplication guide: https://www.kubeflow.org/docs/components/spark-operator/user-guide/writing-sparkapplication/
- Kubeflow Spark Operator scheduled applications guide: https://www.kubeflow.org/docs/components/spark-operator/user-guide/running-sparkapplication-on-schedule/
- Kubeflow Spark Operator v2.5.0 CRD schemas from the official release chart: https://github.com/kubeflow/spark-operator/releases/download/v2.5.0/spark-operator-2.5.0.tgz
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- Apache Spark 3.5.0 Kubernetes documentation: https://spark.apache.org/docs/3.5.0/running-on-kubernetes.html
- Apache Spark 3.5.0 Structured Streaming documentation: https://spark.apache.org/docs/3.5.0/structured-streaming-programming-guide.html
- Apache Spark 3.5.x configuration documentation: https://spark.apache.org/docs/3.5.4/configuration.html

## Issues Found
- The Spark Operator Helm `targetRevision` was pinned to `1.4.0`, but the values used current chart keys such as `controller.workers` and `spark.jobNamespaces`. Updated the chart pin to `2.5.0` and changed `serviceAccounts.spark` to the current `spark.serviceAccount` value path.
- The structured streaming example used `spark.streaming.kafka.maxRatePerPartition`, which is for the older Spark Streaming Kafka direct stream API, not Spark Structured Streaming. Removed it and added a valid Structured Streaming retention configuration.
- The streaming restart policy set `onFailureRetries: -1`, but the SparkApplication CRD requires a non-negative integer. Removed the invalid field and kept `restartPolicy.type: Always`.
- The Dockerfile used Hadoop AWS and AWS SDK bundle versions that did not match the Hadoop dependency line commonly used with Spark 3.5.0 Hadoop 3 builds. Changed them to `hadoop-aws-3.3.4` and `aws-java-sdk-bundle-1.12.262`.
- The image update explanation implied Argo CD detects registry image changes by itself. Clarified that Argo CD detects the Git manifest change when the image tag is updated.
- The dynamic allocation example used only raw `sparkConf` keys and recommended ignoring executor count drift in Argo CD. Updated it to use the Spark Operator native `dynamicAllocation` field and corrected the guidance about initial executor counts.
- The Spark History Server Deployment was invalid because the pod template lacked labels matching the selector. Added `template.metadata.labels`.
- The Spark History Server used `start-history-server.sh`, which can daemonize and exit in a container. Changed the command to run `org.apache.spark.deploy.history.HistoryServer` via `spark-class`.
- The Spark History Server image did not include the S3A dependencies shown earlier, even though it reads event logs from S3. Changed the example to use the custom Spark image and added the WebIdentity credentials provider.

## Review Notes
- All YAML snippets parse successfully after the edits.
- The SparkApplication examples remain illustrative and still require environment-specific RBAC, IAM or cloud identity setup, container images, and application code.
