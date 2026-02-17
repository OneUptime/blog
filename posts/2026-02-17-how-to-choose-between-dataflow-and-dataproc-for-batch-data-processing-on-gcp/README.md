# How to Choose Between Dataflow and Dataproc for Batch Data Processing on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Dataproc, Apache Beam, Apache Spark, Data Processing, Big Data

Description: A hands-on comparison of Google Cloud Dataflow and Dataproc to help you decide which service fits your batch data processing requirements.

---

Google Cloud gives you two managed services for large-scale data processing: Dataflow (managed Apache Beam) and Dataproc (managed Apache Hadoop/Spark). They can both process large datasets, but they are built around different programming models and have different operational characteristics. Choosing between them depends on your team's skills, your processing patterns, and how much infrastructure management you want to deal with.

## The Fundamental Difference

**Dataflow** is serverless. You submit a pipeline (written in Apache Beam), and Google handles all the infrastructure - provisioning workers, scaling, managing failures. You never see or manage VMs.

**Dataproc** is managed Hadoop/Spark. You create a cluster of VMs, submit Spark or Hadoop jobs to it, and manage the cluster lifecycle. Google handles the setup and patching, but you control cluster size, configuration, and autoscaling.

This is the central trade-off: Dataflow gives you less control but zero infrastructure management. Dataproc gives you full control of the Spark/Hadoop ecosystem but requires you to manage clusters.

## Feature Comparison

| Feature | Dataflow | Dataproc |
|---------|----------|----------|
| Programming model | Apache Beam (Python, Java, Go) | Apache Spark, Hadoop, Hive, Pig, Presto |
| Infrastructure | Fully serverless | Managed clusters |
| Cluster management | None | You manage clusters |
| Autoscaling | Automatic | Configurable autoscaling |
| Streaming support | Native (Beam streaming) | Spark Structured Streaming |
| Exactly-once processing | Yes (built into Beam) | Depends on implementation |
| Interactive analysis | No | Yes (Jupyter, Spark Shell, Presto) |
| Machine learning | Limited (Beam ML) | Full MLlib, TensorFlow on Spark |
| Cost model | Per vCPU-hour + per GB-hour (auto) | Per VM instance-hour |
| Startup time | ~2-5 minutes | ~1-3 minutes |
| Ecosystem compatibility | Beam ecosystem | Full Hadoop/Spark ecosystem |

## When to Choose Dataflow

### You Want Zero Infrastructure Management

If you do not want to think about clusters, scaling, or shutdown:

```python
# A Dataflow batch pipeline - no cluster management needed
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp/',
    # Dataflow handles worker scaling automatically
    '--autoscaling_algorithm=THROUGHPUT_BASED',
    '--max_num_workers=50'
])

with beam.Pipeline(options=options) as p:
    (
        p
        # Read raw logs from Cloud Storage
        | 'ReadLogs' >> beam.io.ReadFromText('gs://my-logs/2026/02/*.json')
        # Parse each JSON line
        | 'Parse' >> beam.Map(lambda line: json.loads(line))
        # Filter for error events
        | 'FilterErrors' >> beam.Filter(lambda r: r.get('level') == 'ERROR')
        # Extract key fields
        | 'Extract' >> beam.Map(lambda r: {
            'timestamp': r['timestamp'],
            'service': r['service'],
            'message': r['message'],
            'trace_id': r.get('trace_id', 'unknown')
        })
        # Write results to BigQuery
        | 'WriteBQ' >> beam.io.WriteToBigQuery(
            'my-project:logs_dataset.errors',
            schema='timestamp:TIMESTAMP,service:STRING,message:STRING,trace_id:STRING',
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
        )
    )
```

You submit this pipeline and walk away. Dataflow provisions workers, processes the data, and shuts everything down when done.

### You Need Unified Batch and Streaming

Beam's programming model works for both batch and streaming. The same logic can run either way:

```python
# This pipeline works for both batch and streaming
# Just change the source and windowing
def build_pipeline(p, is_streaming=False):
    if is_streaming:
        # Streaming source
        source = p | 'ReadStream' >> beam.io.ReadFromPubSub(
            topic='projects/my-project/topics/events'
        )
        # Apply windowing for streaming
        windowed = source | 'Window' >> beam.WindowInto(
            beam.window.FixedWindows(60)  # 1-minute windows
        )
    else:
        # Batch source
        windowed = p | 'ReadBatch' >> beam.io.ReadFromText(
            'gs://my-data/events/*.json'
        )

    # Same processing logic for both modes
    (
        windowed
        | 'Parse' >> beam.Map(json.loads)
        | 'CountByType' >> beam.combiners.Count.PerKey()
        | 'Write' >> beam.io.WriteToBigQuery(
            'my-project:dataset.event_counts'
        )
    )
```

### You Need Exactly-Once Processing

Dataflow guarantees exactly-once processing for streaming pipelines. If you are processing financial transactions or other data where duplicates are not acceptable, this matters.

## When to Choose Dataproc

### You Have Existing Spark/Hadoop Code

If your team has invested in Spark pipelines, Dataproc runs them with minimal changes:

```python
# Existing PySpark job - runs on Dataproc with minimal modifications
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum as spark_sum, count, avg

# SparkSession is automatically configured on Dataproc
spark = SparkSession.builder.appName("SalesAnalysis").getOrCreate()

# Read data from Cloud Storage
sales_df = spark.read.parquet("gs://my-data/sales/")

# Complex transformations using the full Spark API
result = (
    sales_df
    # Filter to recent data
    .filter(col("sale_date") >= "2025-01-01")
    # Join with product catalog
    .join(
        spark.read.parquet("gs://my-data/products/"),
        on="product_id",
        how="inner"
    )
    # Aggregate by category
    .groupBy("category", "region")
    .agg(
        spark_sum("amount").alias("total_sales"),
        count("*").alias("transaction_count"),
        avg("amount").alias("avg_order_value")
    )
    # Add derived columns
    .withColumn(
        "sales_rank",
        spark_sum("total_sales").over(
            Window.partitionBy("region").orderBy(col("total_sales").desc())
        )
    )
)

# Write results to BigQuery using the Spark BigQuery connector
result.write \
    .format("bigquery") \
    .option("table", "my-project.analytics.sales_by_category") \
    .option("temporaryGcsBucket", "my-temp-bucket") \
    .mode("overwrite") \
    .save()
```

```bash
# Submit the job to a Dataproc cluster
gcloud dataproc jobs submit pyspark \
    gs://my-scripts/sales_analysis.py \
    --cluster=my-cluster \
    --region=us-central1 \
    --properties=spark.jars.packages=com.google.cloud.spark:spark-bigquery-with-dependencies_2.12:0.32.0
```

### You Need Interactive Analysis

Dataproc supports Jupyter notebooks, Spark shell, and Presto for interactive data exploration:

```bash
# Create a Dataproc cluster with Jupyter and component gateway
gcloud dataproc clusters create analysis-cluster \
    --region=us-central1 \
    --master-machine-type=n1-standard-4 \
    --worker-machine-type=n1-standard-4 \
    --num-workers=4 \
    --optional-components=JUPYTER \
    --enable-component-gateway \
    --max-idle=30m

# Access Jupyter through the component gateway URL
# No SSH tunneling needed
```

### You Need Machine Learning at Scale

Spark MLlib provides a mature distributed ML library:

```python
# Training a model on Dataproc using Spark MLlib
from pyspark.ml.feature import VectorAssembler, StandardScaler
from pyspark.ml.classification import RandomForestClassifier
from pyspark.ml import Pipeline

# Prepare features
assembler = VectorAssembler(
    inputCols=["feature1", "feature2", "feature3"],
    outputCol="raw_features"
)

scaler = StandardScaler(
    inputCol="raw_features",
    outputCol="features"
)

# Train a Random Forest classifier
rf = RandomForestClassifier(
    labelCol="label",
    featuresCol="features",
    numTrees=100
)

# Build the ML pipeline
pipeline = Pipeline(stages=[assembler, scaler, rf])

# Train on a large dataset distributed across the cluster
model = pipeline.fit(training_data)

# Save the model to Cloud Storage
model.save("gs://my-models/random-forest-v1")
```

### You Need Cost-Effective Ephemeral Clusters

Dataproc excels at the pattern of spinning up clusters, running jobs, and shutting down:

```bash
# Create a cluster, run a job, and delete the cluster
# Using Dataproc Workflows for automated orchestration
gcloud dataproc workflow-templates create my-etl-workflow \
    --region=us-central1

# Define the cluster template
gcloud dataproc workflow-templates set-managed-cluster my-etl-workflow \
    --region=us-central1 \
    --master-machine-type=n1-standard-4 \
    --worker-machine-type=n1-standard-8 \
    --num-workers=10 \
    --image-version=2.1

# Add the job to the workflow
gcloud dataproc workflow-templates add-job pyspark \
    --step-id=etl-step \
    --workflow-template=my-etl-workflow \
    --region=us-central1 \
    -- gs://my-scripts/daily_etl.py

# Run the workflow - cluster is created, job runs, cluster is deleted
gcloud dataproc workflow-templates instantiate my-etl-workflow \
    --region=us-central1
```

## Dataproc Serverless - The Middle Ground

Dataproc also offers a serverless mode that is closer to Dataflow in terms of operations:

```bash
# Submit a Spark job without managing a cluster
gcloud dataproc batches submit pyspark \
    gs://my-scripts/analysis.py \
    --region=us-central1 \
    --subnet=default \
    --properties=spark.executor.instances=10 \
    --version=2.1
```

Dataproc Serverless handles cluster provisioning and teardown automatically. It is a good option if you want the Spark ecosystem without cluster management.

## Cost Comparison

For a typical batch job processing 1 TB of data:

- **Dataflow**: You pay for vCPU-hours and GB-hours used by workers. Autoscaling means you only pay for what you use. No idle costs.
- **Dataproc**: You pay for VM instance-hours. Preemptible/spot VMs can reduce costs by 60-80%. But you pay for the cluster even if it is idle.
- **Dataproc Serverless**: Pricing similar to Dataflow - pay for compute used during job execution.

## Decision Summary

Choose **Dataflow** when you want serverless operations, need unified batch and streaming, or are building new pipelines from scratch. Choose **Dataproc** when you have existing Spark/Hadoop code, need the Spark ecosystem (MLlib, Spark SQL, interactive notebooks), or want fine-grained cluster control. Consider **Dataproc Serverless** as a middle ground if you want Spark without cluster management.
