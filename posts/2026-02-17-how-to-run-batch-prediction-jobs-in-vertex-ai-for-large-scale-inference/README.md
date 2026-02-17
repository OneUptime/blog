# How to Run Batch Prediction Jobs in Vertex AI for Large-Scale Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Batch Predictions, Machine Learning, Inference

Description: Learn how to run batch prediction jobs in Vertex AI to process large datasets efficiently without maintaining a persistent endpoint.

---

Not every prediction needs to happen in real time. If you need to score a million customer records overnight, generate recommendations for your entire user base, or run inference on a large dataset of images, batch predictions are the way to go. Instead of sending one request at a time to an online endpoint, Vertex AI batch predictions process your entire dataset in one job, spinning up the necessary compute, running all the predictions, and writing the results to your output destination.

This approach is cheaper than running a persistent endpoint and better suited for high-volume, latency-tolerant workloads.

## When to Use Batch Predictions

Batch predictions make sense when:

- You have a large dataset to score (thousands to millions of records)
- You do not need results in real time - waiting minutes to hours is acceptable
- You want to process data on a schedule (nightly scoring, weekly reports)
- You want to avoid the cost of keeping an endpoint running 24/7

## Preparing Your Input Data

Vertex AI batch predictions accept input from several sources. The most common are BigQuery tables and files in Cloud Storage (JSONL or CSV format).

Here is an example of preparing JSONL input for a tabular model:

```python
# prepare_input.py
# Prepare input data in JSONL format for batch predictions

import json

# Sample input instances
instances = [
    {"feature1": 0.5, "feature2": 1.2, "feature3": "category_a"},
    {"feature1": 0.8, "feature2": 0.3, "feature3": "category_b"},
    {"feature1": 1.1, "feature2": 2.5, "feature3": "category_a"},
    # ... thousands more rows
]

# Write as JSONL (one JSON object per line)
with open('input_data.jsonl', 'w') as f:
    for instance in instances:
        f.write(json.dumps(instance) + '\n')

print(f"Wrote {len(instances)} instances to input_data.jsonl")
```

Upload the file to GCS:

```bash
# Upload input data to Cloud Storage
gsutil cp input_data.jsonl gs://your-bucket/batch-predictions/input/
```

## Running a Batch Prediction Job

Here is the basic workflow for submitting a batch prediction job using the Python SDK:

```python
# batch_predict.py
# Submit a batch prediction job using a registered model

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the model from the registry
model = aiplatform.Model(
    'projects/your-project-id/locations/us-central1/models/MODEL_ID'
)

# Submit the batch prediction job
batch_prediction_job = model.batch_predict(
    job_display_name='nightly-scoring-job',
    # Input data source - JSONL files in GCS
    gcs_source='gs://your-bucket/batch-predictions/input/input_data.jsonl',
    # Output destination in GCS
    gcs_destination_prefix='gs://your-bucket/batch-predictions/output/',
    # Machine type for the prediction workers
    machine_type='n1-standard-4',
    # Number of starting replicas
    starting_replica_count=2,
    # Maximum replicas (Vertex AI will auto-scale)
    max_replica_count=10,
    # Sync=True means the call blocks until the job completes
    sync=False,
)

print(f"Batch prediction job submitted: {batch_prediction_job.resource_name}")
print(f"Job state: {batch_prediction_job.state}")
```

## Using BigQuery as Input and Output

For tabular data, BigQuery is often more convenient than JSONL files:

```python
# batch_predict_bigquery.py
# Run batch predictions with BigQuery input and output

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

model = aiplatform.Model(
    'projects/your-project-id/locations/us-central1/models/MODEL_ID'
)

# Use BigQuery as both input and output
batch_prediction_job = model.batch_predict(
    job_display_name='bq-scoring-job',
    # BigQuery input table
    bigquery_source='bq://your-project-id.dataset.input_table',
    # BigQuery output - results will be written to a new table
    bigquery_destination_prefix='bq://your-project-id.dataset',
    # Instance type for BigQuery input tells the model
    # how to interpret the table columns
    instances_format='bigquery',
    predictions_format='bigquery',
    machine_type='n1-standard-4',
    starting_replica_count=3,
    max_replica_count=10,
    sync=False,
)

print(f"Job submitted: {batch_prediction_job.resource_name}")
```

## Batch Predictions with GPU

For deep learning models that benefit from GPU acceleration, add GPU configuration:

```python
# batch_predict_gpu.py
# Run batch predictions with GPU acceleration

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

model = aiplatform.Model(
    'projects/your-project-id/locations/us-central1/models/MODEL_ID'
)

batch_prediction_job = model.batch_predict(
    job_display_name='gpu-batch-scoring',
    gcs_source='gs://your-bucket/batch-predictions/input/*.jsonl',
    gcs_destination_prefix='gs://your-bucket/batch-predictions/output/',
    # Use a machine with GPU
    machine_type='n1-standard-4',
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    starting_replica_count=2,
    max_replica_count=5,
    sync=False,
)
```

## Monitoring the Job

You can check the status of your batch prediction job programmatically or through the Console:

```python
# monitor_job.py
# Check the status of a batch prediction job

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the job by resource name
job = aiplatform.BatchPredictionJob(
    'projects/your-project-id/locations/us-central1/batchPredictionJobs/JOB_ID'
)

# Check the status
print(f"State: {job.state}")
print(f"Create time: {job.create_time}")
print(f"Start time: {job.start_time}")
print(f"End time: {job.end_time}")

# If completed, get output info
if job.state.name == 'JOB_STATE_SUCCEEDED':
    print(f"Output location: {job.output_info}")
```

Using gcloud:

```bash
# Check the status of a batch prediction job
gcloud ai batch-prediction-jobs describe JOB_ID \
  --region=us-central1 \
  --format="table(displayName,state,createTime,endTime)"

# List all batch prediction jobs
gcloud ai batch-prediction-jobs list \
  --region=us-central1 \
  --format="table(displayName,state,createTime)"
```

## Reading the Output

Once the job completes, your predictions are available at the output destination.

For GCS output, the results are in JSONL format:

```python
# read_output.py
# Read batch prediction results from GCS

from google.cloud import storage
import json

client = storage.Client()
bucket = client.bucket('your-bucket')

# List output files
blobs = bucket.list_blobs(prefix='batch-predictions/output/')

for blob in blobs:
    if blob.name.endswith('.jsonl'):
        # Download and parse each output file
        content = blob.download_as_text()
        for line in content.strip().split('\n'):
            result = json.loads(line)
            instance = result.get('instance', {})
            prediction = result.get('prediction', {})
            print(f"Input: {instance}, Prediction: {prediction}")
```

For BigQuery output:

```python
# read_bq_output.py
# Read batch prediction results from BigQuery

from google.cloud import bigquery

client = bigquery.Client()

# Query the output table
query = """
SELECT *
FROM `your-project-id.dataset.predictions_TIMESTAMP`
LIMIT 100
"""

results = client.query(query)
for row in results:
    print(dict(row))
```

## Handling Large Input Files

For very large datasets, split your input into multiple files. Vertex AI processes them in parallel:

```python
# split_input.py
# Split a large dataset into chunks for parallel processing

import json

def split_jsonl(input_file, output_prefix, chunk_size=10000):
    """Split a large JSONL file into smaller chunks."""
    chunk_num = 0
    current_chunk = []

    with open(input_file, 'r') as f:
        for line in f:
            current_chunk.append(line)

            if len(current_chunk) >= chunk_size:
                # Write the chunk
                output_file = f"{output_prefix}_{chunk_num:04d}.jsonl"
                with open(output_file, 'w') as out:
                    out.writelines(current_chunk)
                print(f"Wrote {len(current_chunk)} records to {output_file}")

                current_chunk = []
                chunk_num += 1

        # Write remaining records
        if current_chunk:
            output_file = f"{output_prefix}_{chunk_num:04d}.jsonl"
            with open(output_file, 'w') as out:
                out.writelines(current_chunk)
            print(f"Wrote {len(current_chunk)} records to {output_file}")

# Split into 10k-record chunks
split_jsonl('large_dataset.jsonl', 'chunks/input', chunk_size=10000)
```

Then upload all chunks and use a wildcard in the GCS source:

```bash
# Upload all chunks
gsutil -m cp chunks/*.jsonl gs://your-bucket/batch-predictions/input/

# In your batch predict call, use a wildcard:
# gcs_source='gs://your-bucket/batch-predictions/input/*.jsonl'
```

## Cost Optimization

Batch prediction costs are based on the machine type, GPU usage, and duration. Here are some ways to reduce costs:

Right-size your machines. If your model is small, you do not need n1-standard-16. Start with n1-standard-2 and scale up if needed.

Use the right number of replicas. More replicas means faster completion but higher cost. Find the sweet spot between speed and budget.

Process during off-peak hours when possible. While GCP does not offer off-peak pricing for Vertex AI, your overall project resource consumption may benefit.

Clean up output data after you have processed it. GCS storage costs can add up with large prediction outputs.

## Wrapping Up

Batch predictions in Vertex AI are the right tool for processing large datasets without the overhead of a persistent online endpoint. Whether you are scoring millions of records nightly, generating bulk recommendations, or running periodic model evaluations, batch predictions give you managed infrastructure that scales to your data size. Set up your input data, point the job at your registered model, and let Vertex AI handle the rest.
