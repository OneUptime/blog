# How to Set Up Kubernetes Batch Processing with Apache Spark Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Apache Spark, Batch Processing

Description: Learn how to deploy and configure Apache Spark Operator on Kubernetes for running large-scale batch processing jobs with declarative SparkApplication resources and automated lifecycle management.

---

Running Apache Spark workloads on Kubernetes has become increasingly popular for batch processing tasks. The Apache Spark Operator makes it easier to deploy and manage Spark applications using native Kubernetes resources. Instead of submitting jobs through spark-submit, you define your Spark applications declaratively as Kubernetes custom resources.

This approach gives you better integration with Kubernetes features like resource quotas, pod security policies, and monitoring tools. The Spark Operator handles the complexity of managing Spark drivers and executors as pods, making your batch processing infrastructure more maintainable.

## Understanding the Spark Operator

The Spark Operator is a Kubernetes operator that extends the Kubernetes API with a SparkApplication custom resource. When you create a SparkApplication, the operator automatically provisions the driver pod, manages executor pods, monitors the application lifecycle, and cleans up resources when jobs complete.

The operator handles several tasks automatically. It creates the driver pod with the correct configuration, sets up role-based access control for the driver to manage executor pods, monitors application status, and restarts failed applications based on your restart policy.

## Installing the Spark Operator

You can install the Spark Operator using Helm, which is the recommended approach. First, add the Spark Operator Helm repository and install the chart.

```bash
# Add the Spark Operator Helm repository
helm repo add spark-operator https://googlecloudplatform.github.io/spark-on-k8s-operator
helm repo update

# Install the Spark Operator
helm install spark-operator spark-operator/spark-operator \
  --namespace spark-operator \
  --create-namespace \
  --set webhook.enable=true \
  --set metrics.enable=true
```

The webhook validates SparkApplication manifests before they are applied, catching configuration errors early. The metrics endpoint exposes Prometheus-compatible metrics for monitoring operator health.

Verify the operator is running correctly.

```bash
# Check operator pods
kubectl get pods -n spark-operator

# Check CRDs installed
kubectl get crd | grep sparkoperator.k8s.io
```

## Creating Your First SparkApplication

A SparkApplication resource defines your Spark job configuration. Here's a basic example that processes data from S3.

```yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: batch-data-processor
  namespace: data-processing
spec:
  type: Scala
  mode: cluster
  image: "gcr.io/spark-operator/spark:v3.1.1"
  imagePullPolicy: Always
  mainClass: com.example.DataProcessor
  mainApplicationFile: "s3a://my-bucket/spark-jobs/processor.jar"

  # Spark version
  sparkVersion: "3.1.1"

  # Restart policy for failed jobs
  restartPolicy:
    type: OnFailure
    onFailureRetries: 3
    onFailureRetryInterval: 10
    onSubmissionFailureRetries: 5
    onSubmissionFailureRetryInterval: 20

  # Driver configuration
  driver:
    cores: 2
    coreLimit: "2000m"
    memory: "4g"
    labels:
      version: "3.1.1"
      app: "batch-processor"
    serviceAccount: spark-driver

    # Volume mounts for driver
    volumeMounts:
      - name: "config"
        mountPath: "/etc/config"

  # Executor configuration
  executor:
    cores: 4
    instances: 5
    memory: "8g"
    labels:
      version: "3.1.1"
      app: "batch-processor"

    # Volume mounts for executors
    volumeMounts:
      - name: "data-cache"
        mountPath: "/tmp/spark-cache"

  # Volumes
  volumes:
    - name: "config"
      configMap:
        name: spark-config
    - name: "data-cache"
      emptyDir:
        sizeLimit: "10Gi"

  # Spark configuration
  sparkConf:
    "spark.sql.shuffle.partitions": "200"
    "spark.dynamicAllocation.enabled": "false"
    "spark.executor.memoryOverhead": "1g"
    "spark.hadoop.fs.s3a.access.key": "$(AWS_ACCESS_KEY_ID)"
    "spark.hadoop.fs.s3a.secret.key": "$(AWS_SECRET_ACCESS_KEY)"

  # Hadoop configuration
  hadoopConf:
    "fs.s3a.impl": "org.apache.hadoop.fs.s3a.S3AFileSystem"
    "fs.s3a.aws.credentials.provider": "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider"
```

This configuration defines a batch processing job with specific resource allocations for the driver and executors. The restart policy ensures failed jobs retry automatically with exponential backoff.

## Configuring Resource Management

Proper resource configuration prevents your Spark jobs from overwhelming the cluster. Set CPU and memory limits that match your workload requirements.

```yaml
spec:
  driver:
    cores: 2
    coreLimit: "2000m"  # Kubernetes CPU limit
    memory: "4g"
    memoryOverhead: "512m"  # Extra memory for off-heap usage

  executor:
    cores: 4
    coreLimit: "4000m"
    memory: "8g"
    memoryOverhead: "1g"
    instances: 10
```

The memory overhead accounts for non-heap memory used by the JVM, Python workers, and other processes. A good rule is to set memory overhead to 10-15% of the executor memory.

## Managing Job Dependencies

For batch jobs that depend on JAR files or Python packages, you can specify dependencies in the SparkApplication.

```yaml
spec:
  deps:
    jars:
      - s3a://my-bucket/jars/postgresql-42.2.18.jar
      - s3a://my-bucket/jars/spark-avro_2.12-3.1.1.jar

    files:
      - s3a://my-bucket/config/application.conf

    pyFiles:
      - s3a://my-bucket/python/utils.py
      - s3a://my-bucket/python/transformers.zip
```

The operator downloads these dependencies before starting the application, making them available to both driver and executor pods.

## Setting Up Dynamic Allocation

For variable workloads, dynamic allocation adjusts executor count based on pending tasks. This saves resources during low activity periods.

```yaml
spec:
  dynamicAllocation:
    enabled: true
    initialExecutors: 2
    minExecutors: 1
    maxExecutors: 20
    shuffleTrackingTimeout: 60s

  sparkConf:
    "spark.dynamicAllocation.enabled": "true"
    "spark.dynamicAllocation.shuffleTracking.enabled": "true"
    "spark.dynamicAllocation.executorIdleTimeout": "60s"
    "spark.dynamicAllocation.schedulerBacklogTimeout": "5s"
```

Dynamic allocation requires shuffle tracking to determine when executors can be safely removed without losing shuffle data.

## Monitoring Batch Jobs

The Spark Operator exposes application status through the SparkApplication resource status field.

```bash
# Check application status
kubectl get sparkapplication batch-data-processor -n data-processing

# Get detailed status
kubectl describe sparkapplication batch-data-processor -n data-processing

# View driver logs
kubectl logs -n data-processing batch-data-processor-driver

# View executor logs (find pod name first)
kubectl get pods -n data-processing -l spark-role=executor
kubectl logs -n data-processing batch-data-processor-1234567890-exec-1
```

You can also expose the Spark UI through a service to monitor job progress in real-time.

```yaml
spec:
  sparkUIOptions:
    servicePort: 4040
    serviceType: ClusterIP
```

## Implementing Scheduled Batch Jobs

For recurring batch processing, combine SparkApplication with Kubernetes CronJobs or use the ScheduledSparkApplication custom resource.

```yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: ScheduledSparkApplication
metadata:
  name: daily-batch-processor
  namespace: data-processing
spec:
  schedule: "0 2 * * *"  # Run at 2 AM daily
  concurrencyPolicy: Forbid
  successfulRunHistoryLimit: 3
  failedRunHistoryLimit: 1

  template:
    type: Scala
    mode: cluster
    image: "gcr.io/spark-operator/spark:v3.1.1"
    mainClass: com.example.DailyProcessor
    mainApplicationFile: "s3a://my-bucket/spark-jobs/daily.jar"
    # ... rest of SparkApplication spec
```

The concurrencyPolicy prevents multiple instances from running simultaneously, which is important for jobs that process the same data source.

## Best Practices

Always set resource limits to prevent runaway jobs from consuming all cluster resources. Use appropriate storage classes for shuffle data if your jobs process large datasets. Configure monitoring and alerting to catch failed jobs quickly.

Set up RBAC properly so driver pods have only the permissions they need to manage executor pods. Use secrets for sensitive configuration like database passwords or API keys instead of hardcoding them in SparkConf.

For production workloads, implement proper logging by shipping Spark logs to a centralized logging system. The operator supports various logging configurations including sidecar containers and log persistence to external storage.

## Conclusion

The Apache Spark Operator simplifies running batch processing workloads on Kubernetes by providing a declarative way to define Spark applications. It handles the operational complexity of managing Spark clusters while giving you the benefits of Kubernetes orchestration.

With proper configuration of resources, monitoring, and scheduling, you can build robust batch processing pipelines that scale with your data processing needs. The operator's integration with Kubernetes features makes it easier to operate Spark workloads alongside your other containerized applications.
