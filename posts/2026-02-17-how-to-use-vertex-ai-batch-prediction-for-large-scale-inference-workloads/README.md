# How to Use Vertex AI Batch Prediction for Large-Scale Inference Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Batch Prediction, Inference, Large Scale

Description: Learn how to run large-scale batch prediction jobs on Vertex AI for efficiently processing millions of records without maintaining always-on serving infrastructure.

---

Not every prediction needs to happen in real-time. When you need to score your entire customer database for a marketing campaign, generate recommendations for all users overnight, or classify millions of documents, running these through an online endpoint is slow and expensive. Batch prediction processes all your data in one job, partitions the work across the compute nodes you request, and shuts down when it is done.

Vertex AI Batch Prediction takes your data from BigQuery or GCS, runs it through your model using multiple machines in parallel, and writes the results back. You pay for the node time used by the job, which can be significantly cheaper than keeping prediction endpoints running 24/7 for occasional large-scale inference.

## When to Use Batch vs Online Prediction

Online prediction is for real-time, low-latency requests - a user makes a purchase and you need a fraud score in milliseconds. Batch prediction is for processing large volumes where latency is not critical - scoring all transactions from the past day for audit purposes.

```mermaid
graph TD
    A{Prediction Need} -->|Low latency required| B[Online Prediction]
    A -->|High volume, latency OK| C[Batch Prediction]
    B --> D["Always-on endpoint<br>Pay per hour<br>Millisecond latency"]
    C --> E["Ephemeral compute<br>Pay per node time<br>Minutes to hours"]
```

## Running a Basic Batch Prediction Job

The simplest batch prediction reads from GCS and writes results back to GCS.

This code submits a batch prediction job:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

# Reference your uploaded model

model = aiplatform.Model(
    "projects/your-project-id/locations/us-central1/models/YOUR_MODEL_ID"
)

# Submit batch prediction job
batch_job = model.batch_predict(
    job_display_name="customer-scoring-2026-02",
    gcs_source="gs://your-bucket/data/customers.jsonl",
    gcs_destination_prefix="gs://your-bucket/predictions/customer-scoring/",
    instances_format="jsonl",  # Input format: jsonl, csv, tf-record, etc
    predictions_format="jsonl",  # Output format
    machine_type="n1-standard-4",
    starting_replica_count=5,  # Start with 5 machines
    sync=False  # Do not block - run in background
)

print(f"Batch job submitted: {batch_job.resource_name}")
print(f"State: {batch_job.state}")
```

## Input Data Formats

Vertex AI Batch Prediction supports several input formats. The format must match what your model expects.

For JSONL input, each line is a JSON object representing one instance:

```json
{"feature1": 0.5, "feature2": "category_a", "feature3": 42}
{"feature1": 0.8, "feature2": "category_b", "feature3": 17}
{"feature1": 0.2, "feature2": "category_a", "feature3": 93}
```

For CSV input:

```text
feature1,feature2,feature3
0.5,"category_a",42
0.8,"category_b",17
0.2,"category_a",93
```

This code prepares JSONL input from a pandas DataFrame:

```python
import pandas as pd
import json

def prepare_batch_input(df, output_path, id_column=None):
    """Convert a DataFrame to JSONL format for batch prediction.

    Args:
        df: Input DataFrame with features
        output_path: Path to write the JSONL file
        id_column: Optional column to keep in the instance for joining results
    """
    with open(output_path, "w") as f:
        for _, row in df.iterrows():
            instance = row.to_dict()

            # Vertex AI includes the sent instance in JSONL output, which can help match results.
            if id_column and id_column in instance:
                pass  # Keep it in the instance for result matching

            f.write(json.dumps(instance) + "\n")

    print(f"Wrote {len(df)} instances to {output_path}")

# Example
df = pd.read_csv("customers.csv")
prepare_batch_input(df, "customers.jsonl", id_column="customer_id")
```

## Batch Prediction from BigQuery

For large datasets already in BigQuery, you can read directly from a BigQuery table and write results back to BigQuery.

This code runs batch prediction with BigQuery I/O:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

model = aiplatform.Model(
    "projects/your-project-id/locations/us-central1/models/YOUR_MODEL_ID"
)

# Batch predict with BigQuery source and destination
batch_job = model.batch_predict(
    job_display_name="bq-customer-scoring",
    bigquery_source="bq://your-project-id.dataset.customer_features",
    bigquery_destination_prefix="bq://your-project-id.dataset",
    instances_format="bigquery",
    predictions_format="bigquery",
    machine_type="n1-standard-8",
    starting_replica_count=10,
    sync=False
)

print(f"Job: {batch_job.resource_name}")
```

Vertex AI creates output tables automatically. When the model has instance and prediction schemata, the `predictions` table contains the instance columns together with the prediction columns; otherwise the output includes the returned instance and prediction values.

## GPU Batch Prediction

For deep learning models, use GPU machines to speed up batch inference.

This code configures a GPU batch job:

```python
batch_job = model.batch_predict(
    job_display_name="image-classification-batch",
    gcs_source="gs://your-bucket/data/images/*.jsonl",
    gcs_destination_prefix="gs://your-bucket/predictions/images/",
    instances_format="jsonl",
    predictions_format="jsonl",
    machine_type="n1-standard-8",
    accelerator_type="NVIDIA_TESLA_T4",
    accelerator_count=1,
    starting_replica_count=5,
    sync=False
)
```

## Batch Prediction with Explanations

You can request feature attributions alongside predictions in batch mode when the model has explanation metadata configured, or when you provide an explanation spec in the batch prediction request. This is useful for model auditing and compliance.

```python
batch_job = model.batch_predict(
    job_display_name="batch-with-explanations",
    gcs_source="gs://your-bucket/data/loan-applications.jsonl",
    gcs_destination_prefix="gs://your-bucket/predictions/loan-explanations/",
    instances_format="jsonl",
    predictions_format="jsonl",
    machine_type="n1-standard-8",
    starting_replica_count=5,
    generate_explanation=True,  # Include feature attributions
    sync=False
)
```

## Monitoring Batch Job Progress

Track the progress and status of your batch prediction job.

This code monitors a running job:

```python
from google.cloud import aiplatform
from google.cloud.aiplatform_v1.types import JobState
import time

def monitor_batch_job(job_resource_name):
    """Monitor a batch prediction job until completion."""
    job = aiplatform.BatchPredictionJob(job_resource_name)

    while True:
        job_state = job.state

        if job_state == JobState.JOB_STATE_SUCCEEDED:
            print("Job completed successfully!")
            print(f"Output: {job.output_info}")
            return True

        elif job_state == JobState.JOB_STATE_FAILED:
            print(f"Job failed: {job.error}")
            return False

        elif job_state == JobState.JOB_STATE_CANCELLED:
            print("Job was cancelled")
            return False

        else:
            print(f"Job state: {job_state}")
            # Check completion percentage if available
            if hasattr(job, "completion_stats"):
                stats = job.completion_stats
                if stats:
                    print(f"  Completed: {stats.successful_count}")
                    print(f"  Failed: {stats.failed_count}")
                    print(f"  Incomplete: {stats.incomplete_count}")

            time.sleep(60)  # Check every minute

monitor_batch_job("projects/your-project/locations/us-central1/batchPredictionJobs/JOB_ID")
```

## Processing Batch Results

After the job completes, process the output predictions.

This code reads and processes JSONL output:

```python
import json
import pandas as pd
from google.cloud import storage

def read_batch_results(gcs_output_prefix):
    """Read all prediction output files from GCS."""
    client = storage.Client()

    # Parse the GCS prefix
    parts = gcs_output_prefix.replace("gs://", "").split("/", 1)
    bucket_name = parts[0]
    prefix = parts[1]

    bucket = client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=prefix))

    all_results = []
    for blob in blobs:
        if blob.name.endswith(".jsonl"):
            content = blob.download_as_text()
            for line in content.strip().split("\n"):
                result = json.loads(line)
                all_results.append(result)

    print(f"Read {len(all_results)} predictions from {len(blobs)} files")
    return all_results

def results_to_dataframe(results):
    """Convert batch results to a pandas DataFrame."""
    rows = []
    for result in results:
        instance = result.get("instance", {})
        prediction = result.get("prediction", {})

        row = {**instance}

        # Flatten prediction into the row
        if isinstance(prediction, dict):
            for k, v in prediction.items():
                row[f"pred_{k}"] = v
        else:
            row["prediction"] = prediction

        rows.append(row)

    return pd.DataFrame(rows)

# Read and process results
results = read_batch_results("gs://your-bucket/predictions/customer-scoring/")
df = results_to_dataframe(results)

# Analyze the results
print(f"Total predictions: {len(df)}")
print(f"Positive predictions: {(df['prediction'] > 0.5).sum()}")
print(f"Average score: {df['prediction'].mean():.4f}")
```

## Scheduling Recurring Batch Jobs

For regular batch processing, use Cloud Scheduler to trigger batch jobs automatically.

This Cloud Function runs a batch prediction on schedule:

```python
import functions_framework
from google.cloud import aiplatform
from datetime import datetime

@functions_framework.http
def run_daily_batch(request):
    """Cloud Function triggered by Cloud Scheduler for daily batch prediction."""
    aiplatform.init(project="your-project-id", location="us-central1")

    today = datetime.now().strftime("%Y-%m-%d")

    model = aiplatform.Model(
        "projects/your-project-id/locations/us-central1/models/YOUR_MODEL_ID"
    )

    batch_job = model.batch_predict(
        job_display_name=f"daily-scoring-{today}",
        bigquery_source="bq://your-project-id.features.daily_features",
        bigquery_destination_prefix="bq://your-project-id.predictions",
        instances_format="bigquery",
        predictions_format="bigquery",
        machine_type="n1-standard-8",
        starting_replica_count=10,
        sync=False
    )

    return {
        "status": "submitted",
        "job_name": batch_job.resource_name,
        "date": today
    }
```

## Cost Optimization Tips

Batch prediction pricing is based on compute hours (machine type and duration) plus any accelerators. Here are ways to minimize costs.

Choose the right machine type. For CPU models, start with the smallest machine type that has enough CPU and memory for your model, then increase replicas for throughput. Larger machines help if your model is memory-intensive. For GPU models, a single T4 per machine is often a cost-effective option for inference, but you should benchmark with your model and region pricing.

Set `starting_replica_count` based on your data size and target completion time. For custom-trained batch prediction jobs, Vertex AI uses `starting_replica_count` and ignores `max_replica_count`, so choose the replica count you actually want the job to use.

Use Spot VMs for non-urgent, fault-tolerant inference jobs when they fit your requirements. Spot VMs can reduce costs, but they can be preempted and are configured through the supported API or SDK paths rather than the Google Cloud console.

Split very large jobs. If you have a billion records, split them into smaller batch jobs that run in parallel. This provides better fault tolerance - if one job fails, you only need to retry that portion.

Batch prediction on Vertex AI removes the need to maintain always-on prediction infrastructure for periodic, high-volume inference workloads. The managed parallel execution and automatic cleanup mean you process your data efficiently and pay for the node time your jobs use.
