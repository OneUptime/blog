# How to Deploy Apache Spark on Kubernetes Using the Spark Operator for ML Data Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Apache Spark, Data Processing, Machine Learning, Big Data

Description: Deploy Apache Spark on Kubernetes using the Spark Operator to run large-scale ML data processing pipelines with dynamic resource allocation and autoscaling.

---

Processing large datasets for machine learning requires distributed computing frameworks. Apache Spark provides a powerful platform for data preprocessing, feature engineering, and ETL pipelines. Running Spark on Kubernetes with the Spark Operator simplifies cluster management, provides better resource utilization, and integrates seamlessly with ML workflows.

This guide shows you how to deploy Spark on Kubernetes and run ML data processing jobs.

## Installing the Spark Operator

Add the Spark Operator Helm repository:

```bash
helm repo add spark-operator https://googlecloudplatform.github.io/spark-on-k8s-operator
helm repo update

# Install Spark Operator
helm install spark-operator spark-operator/spark-operator \
  --namespace spark-operator \
  --create-namespace \
  --set webhook.enable=true \
  --set sparkJobNamespace=spark-apps

# Verify installation
kubectl get pods -n spark-operator
kubectl get crd | grep sparkoperator
```

## Creating a Simple Spark Application

Create a basic PySpark application:

```python
# data_processing.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, mean, stddev, count
import logging

logging.basicConfig(level=logging.INFO)

def main():
    # Create Spark session
    spark = SparkSession.builder \
        .appName("ML Data Processing") \
        .getOrCreate()

    logging.info("Spark session created")

    # Read data from S3/GCS
    df = spark.read.parquet("s3a://my-bucket/raw-data/")

    logging.info(f"Loaded {df.count()} rows")

    # Data cleaning
    df_clean = df.dropna()

    # Feature engineering
    df_features = df_clean \
        .withColumn("feature_mean", mean("value").over()) \
        .withColumn("feature_std", stddev("value").over())

    # Aggregations
    df_agg = df_features.groupBy("category") \
        .agg(
            count("*").alias("count"),
            mean("value").alias("avg_value")
        )

    # Write results
    df_agg.write \
        .mode("overwrite") \
        .parquet("s3a://my-bucket/processed-data/")

    logging.info("Data processing complete")

    spark.stop()

if __name__ == "__main__":
    main()
```

Package as a Docker image:

```dockerfile
# Dockerfile.spark-app
FROM apache/spark-py:v3.5.0

WORKDIR /app

USER root

# Install additional Python packages
RUN pip install --no-cache-dir \
    pandas==2.0.0 \
    numpy==1.24.0 \
    scikit-learn==1.3.0 \
    pyarrow==14.0.0

COPY data_processing.py /app/

USER 185

CMD ["python", "/app/data_processing.py"]
```

Build and push:

```bash
docker build -t your-registry/spark-ml-processor:v1 -f Dockerfile.spark-app .
docker push your-registry/spark-ml-processor:v1
```

## Deploying a SparkApplication

Create a SparkApplication manifest:

```yaml
# spark-app.yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: ml-data-processing
  namespace: spark-apps
spec:
  type: Python
  pythonVersion: "3"
  mode: cluster
  image: your-registry/spark-ml-processor:v1
  imagePullPolicy: Always
  mainApplicationFile: local:///app/data_processing.py

  sparkVersion: "3.5.0"

  # Driver configuration
  driver:
    cores: 2
    coreLimit: "2000m"
    memory: "4g"
    labels:
      version: "3.5.0"
      app: "ml-data-processing"
    serviceAccount: spark-driver

  # Executor configuration
  executor:
    cores: 4
    instances: 5
    memory: "8g"
    labels:
      version: "3.5.0"
      app: "ml-data-processing"

  # Dynamic allocation
  dynamicAllocation:
    enabled: true
    initialExecutors: 2
    minExecutors: 2
    maxExecutors: 10

  # Spark configuration
  sparkConf:
    "spark.sql.shuffle.partitions": "200"
    "spark.default.parallelism": "100"
    "spark.hadoop.fs.s3a.impl": "org.apache.hadoop.fs.s3a.S3AFileSystem"
    "spark.hadoop.fs.s3a.aws.credentials.provider": "com.amazonaws.auth.InstanceProfileCredentialsProvider"
    "spark.kubernetes.allocation.batch.size": "10"
    "spark.sql.adaptive.enabled": "true"
    "spark.sql.adaptive.coalescePartitions.enabled": "true"

  # Restart policy
  restartPolicy:
    type: OnFailure
    onFailureRetries: 3
    onFailureRetryInterval: 10
    onSubmissionFailureRetries: 5
    onSubmissionFailureRetryInterval: 20
```

Create service account:

```yaml
# spark-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: spark-driver
  namespace: spark-apps
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: spark-driver
  namespace: spark-apps
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: spark-driver
  namespace: spark-apps
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: spark-driver
subjects:
- kind: ServiceAccount
  name: spark-driver
  namespace: spark-apps
```

Deploy and monitor:

```bash
kubectl create namespace spark-apps
kubectl apply -f spark-rbac.yaml
kubectl apply -f spark-app.yaml

# Watch application progress
kubectl get sparkapplications -n spark-apps -w

# Check driver logs
kubectl logs -n spark-apps ml-data-processing-driver -f

# Check executor logs
kubectl logs -n spark-apps -l spark-role=executor --tail=100
```

## Running Spark SQL for Feature Engineering

Create a feature engineering job:

```python
# feature_engineering.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.ml.feature import VectorAssembler, StandardScaler
from pyspark.ml import Pipeline

def create_features(spark):
    # Read raw data
    df = spark.read.parquet("s3a://my-bucket/raw-data/")

    # Time-based features
    df = df.withColumn("hour", hour("timestamp")) \
           .withColumn("day_of_week", dayofweek("timestamp")) \
           .withColumn("month", month("timestamp"))

    # Aggregations
    df = df.withColumn(
        "rolling_avg_7d",
        avg("value").over(
            Window.partitionBy("user_id")
                  .orderBy("timestamp")
                  .rowsBetween(-7, 0)
        )
    )

    # Categorical encoding
    from pyspark.ml.feature import StringIndexer
    indexer = StringIndexer(inputCol="category", outputCol="category_idx")
    df = indexer.fit(df).transform(df)

    # Feature vector assembly
    feature_cols = ["hour", "day_of_week", "month", "rolling_avg_7d", "category_idx"]
    assembler = VectorAssembler(inputCols=feature_cols, outputCol="features_raw")

    # Scaling
    scaler = StandardScaler(inputCol="features_raw", outputCol="features")

    # Create pipeline
    pipeline = Pipeline(stages=[assembler, scaler])

    # Fit and transform
    model = pipeline.fit(df)
    df_features = model.transform(df)

    # Save features
    df_features.select("user_id", "features", "label") \
               .write \
               .mode("overwrite") \
               .parquet("s3a://my-bucket/features/")

    print(f"Created features for {df_features.count()} records")

if __name__ == "__main__":
    spark = SparkSession.builder.appName("Feature Engineering").getOrCreate()
    create_features(spark)
    spark.stop()
```

## Scheduled Spark Jobs

Create a CronJob for regular data processing:

```yaml
# spark-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-feature-generation
  namespace: spark-apps
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: spark-submit
          restartPolicy: OnFailure
          containers:
          - name: spark-submit
            image: apache/spark:v3.5.0
            command:
            - /bin/sh
            - -c
            - |
              /opt/spark/bin/spark-submit \
                --master k8s://https://kubernetes.default.svc:443 \
                --deploy-mode cluster \
                --name daily-features \
                --conf spark.kubernetes.namespace=spark-apps \
                --conf spark.kubernetes.authenticate.driver.serviceAccountName=spark-driver \
                --conf spark.executor.instances=5 \
                --conf spark.executor.memory=8g \
                --conf spark.executor.cores=4 \
                --conf spark.driver.memory=4g \
                --conf spark.driver.cores=2 \
                --conf spark.kubernetes.container.image=your-registry/spark-ml-processor:v1 \
                local:///app/feature_engineering.py
```

## Using Spark with GPU for ML Training

Configure Spark to use GPUs:

```yaml
spec:
  sparkConf:
    "spark.executor.resource.gpu.amount": "1"
    "spark.task.resource.gpu.amount": "1"
    "spark.rapids.sql.enabled": "true"
    "spark.plugins": "com.nvidia.spark.SQLPlugin"

  executor:
    cores: 4
    instances: 4
    memory: "16g"
    gpu:
      name: "nvidia.com/gpu"
      quantity: 1
```

Install RAPIDS libraries:

```dockerfile
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04

# Install Spark
RUN apt-get update && apt-get install -y openjdk-11-jre python3-pip

# Install RAPIDS
RUN pip install --no-cache-dir \
    cudf-cu11==23.10.0 \
    cuml-cu11==23.10.0 \
    cugraph-cu11==23.10.0
```

## Monitoring Spark Applications

Query Spark metrics:

```promql
# Running applications
spark_applications_running

# Executor count
spark_executors_count

# Task duration
rate(spark_task_duration_seconds_sum[5m])

# Failed tasks
rate(spark_task_failed_total[5m])
```

Access Spark UI:

```bash
# Port forward to driver pod
kubectl port-forward -n spark-apps ml-data-processing-driver 4040:4040

# Open browser to http://localhost:4040
```

## Optimizing Spark Performance

Tune Spark configuration for ML workloads:

```yaml
sparkConf:
  # Memory management
  "spark.memory.fraction": "0.8"
  "spark.memory.storageFraction": "0.3"

  # Shuffle optimization
  "spark.sql.shuffle.partitions": "200"
  "spark.shuffle.service.enabled": "true"

  # Adaptive Query Execution
  "spark.sql.adaptive.enabled": "true"
  "spark.sql.adaptive.coalescePartitions.enabled": "true"
  "spark.sql.adaptive.skewJoin.enabled": "true"

  # Serialization
  "spark.serializer": "org.apache.spark.serializer.KryoSerializer"

  # Network
  "spark.network.timeout": "800s"
  "spark.executor.heartbeatInterval": "60s"
```

## Conclusion

Apache Spark on Kubernetes with the Spark Operator provides a scalable platform for ML data processing. The operator simplifies cluster management, handles dynamic resource allocation, and integrates with Kubernetes' scheduling and monitoring capabilities. Whether you're preprocessing raw data, engineering features, or running distributed ML training, Spark on Kubernetes offers the flexibility and scale needed for production ML pipelines.
