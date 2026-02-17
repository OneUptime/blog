# How to Implement Batch Inference with Gemini on Vertex AI for High-Throughput Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Batch Inference, High Throughput

Description: Learn how to set up and run batch inference with Gemini on Vertex AI for processing large datasets efficiently with higher throughput and lower costs.

---

When you need to process thousands or millions of prompts through Gemini, making individual API calls is not practical. The latency adds up, you hit rate limits, and the cost structure is not optimal. Batch inference on Vertex AI solves this by letting you submit large jobs that run asynchronously with higher throughput and often at a lower per-token price.

I have used batch inference for everything from classifying large document sets to generating product descriptions at scale. Let me walk you through how to set it up and the patterns that work well.

## When to Use Batch Inference

Batch inference makes sense when you have a large number of prompts to process and you do not need real-time responses. Typical use cases include document classification at scale, data extraction from thousands of records, content generation for product catalogs, bulk summarization of reports, and sentiment analysis across large datasets.

The trade-off is latency for throughput. Individual requests might take seconds, but batch jobs can take minutes to hours depending on size. The benefit is significantly higher throughput and better cost efficiency.

## Preparing Your Input Data

Batch inference expects input in JSON Lines format, where each line is a separate request. You store this file in Cloud Storage.

Here is how to prepare a batch input file:

```python
import json
from google.cloud import storage

def create_batch_input(prompts, output_path):
    """Create a JSONL input file for batch inference."""
    lines = []
    for i, prompt in enumerate(prompts):
        # Each line is a complete API request
        request = {
            "request": {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}]
                    }
                ],
                "generation_config": {
                    "temperature": 0.2,
                    "max_output_tokens": 256
                }
            }
        }
        lines.append(json.dumps(request))

    # Write to a local file
    with open(output_path, "w") as f:
        f.write("\n".join(lines))

    return len(lines)

# Create input data
prompts = [
    f"Classify this support ticket: '{ticket}'"
    for ticket in load_tickets()  # Your data loading function
]

count = create_batch_input(prompts, "batch_input.jsonl")
print(f"Created batch input with {count} requests")
```

## Uploading to Cloud Storage

The input file needs to be in Cloud Storage before you can submit the batch job.

```python
def upload_to_gcs(local_path, bucket_name, blob_name):
    """Upload a file to Google Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path)
    return f"gs://{bucket_name}/{blob_name}"

# Upload the batch input file
input_uri = upload_to_gcs(
    "batch_input.jsonl",
    "your-batch-bucket",
    "batch-jobs/input/tickets_classification.jsonl"
)
print(f"Input uploaded to: {input_uri}")
```

## Submitting a Batch Inference Job

With your input in Cloud Storage, you can submit the batch job through the Vertex AI API.

This code creates and submits a batch prediction job:

```python
import vertexai
from vertexai.batch_prediction import BatchPredictionJob

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Submit the batch prediction job
batch_job = BatchPredictionJob.submit(
    source_model="gemini-2.0-flash",
    input_dataset=input_uri,
    output_uri_prefix="gs://your-batch-bucket/batch-jobs/output/"
)

print(f"Job submitted: {batch_job.resource_name}")
print(f"State: {batch_job.state}")
```

## Monitoring Job Progress

Batch jobs run asynchronously. You need to check their status periodically or set up notifications.

```python
import time

def monitor_batch_job(job, poll_interval=60):
    """Monitor a batch job until completion."""
    print(f"Monitoring job: {job.resource_name}")

    while True:
        job.refresh()
        state = job.state.name

        print(f"State: {state}")

        if state == "JOB_STATE_SUCCEEDED":
            print("Job completed successfully!")
            print(f"Output location: {job.output_info}")
            return True
        elif state in ("JOB_STATE_FAILED", "JOB_STATE_CANCELLED"):
            print(f"Job ended with state: {state}")
            if hasattr(job, 'error'):
                print(f"Error: {job.error}")
            return False
        elif state == "JOB_STATE_RUNNING":
            # Show progress if available
            if hasattr(job, 'completion_stats'):
                stats = job.completion_stats
                print(f"  Completed: {stats.successful_count}/{stats.total_count}")

        time.sleep(poll_interval)

# Monitor the job
success = monitor_batch_job(batch_job)
```

## Processing Batch Output

When the job completes, the results are written to Cloud Storage in JSONL format. Each line contains the original request and the model's response.

```python
def download_and_parse_results(output_uri, local_path):
    """Download and parse batch prediction results."""
    # Download from GCS
    client = storage.Client()

    # The output might be split across multiple files
    bucket_name = output_uri.split("/")[2]
    prefix = "/".join(output_uri.split("/")[3:])

    bucket = client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=prefix))

    results = []
    for blob in blobs:
        if blob.name.endswith(".jsonl"):
            content = blob.download_as_text()
            for line in content.strip().split("\n"):
                result = json.loads(line)
                results.append(result)

    return results

# Parse the output
results = download_and_parse_results(
    "gs://your-batch-bucket/batch-jobs/output/",
    "batch_output.jsonl"
)

# Process each result
for i, result in enumerate(results[:5]):
    response = result.get("response", {})
    candidates = response.get("candidates", [])
    if candidates:
        text = candidates[0]["content"]["parts"][0]["text"]
        print(f"Result {i}: {text[:100]}...")
```

## Building a Complete Batch Pipeline

Here is an end-to-end pipeline that handles the full lifecycle:

```python
class BatchInferencePipeline:
    """End-to-end batch inference pipeline."""

    def __init__(self, project_id, bucket_name, model_name="gemini-2.0-flash"):
        vertexai.init(project=project_id, location="us-central1")
        self.bucket_name = bucket_name
        self.model_name = model_name
        self.storage_client = storage.Client()

    def prepare_input(self, prompts, job_name):
        """Prepare and upload input data."""
        # Create JSONL content
        lines = []
        for prompt in prompts:
            request = {
                "request": {
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generation_config": {"temperature": 0.2, "max_output_tokens": 512}
                }
            }
            lines.append(json.dumps(request))

        # Upload to GCS
        blob_name = f"batch-jobs/{job_name}/input.jsonl"
        bucket = self.storage_client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_string("\n".join(lines))

        return f"gs://{self.bucket_name}/{blob_name}"

    def submit_job(self, input_uri, job_name):
        """Submit the batch job."""
        output_prefix = f"gs://{self.bucket_name}/batch-jobs/{job_name}/output/"

        job = BatchPredictionJob.submit(
            source_model=self.model_name,
            input_dataset=input_uri,
            output_uri_prefix=output_prefix
        )
        return job

    def wait_for_completion(self, job, timeout_minutes=120):
        """Wait for job completion with timeout."""
        start_time = time.time()
        timeout_seconds = timeout_minutes * 60

        while time.time() - start_time < timeout_seconds:
            job.refresh()
            if job.state.name == "JOB_STATE_SUCCEEDED":
                return True
            elif job.state.name in ("JOB_STATE_FAILED", "JOB_STATE_CANCELLED"):
                return False
            time.sleep(30)

        return False

    def run(self, prompts, job_name):
        """Run the complete pipeline."""
        print(f"Starting batch job: {job_name}")
        print(f"Processing {len(prompts)} prompts...")

        # Prepare and upload
        input_uri = self.prepare_input(prompts, job_name)
        print(f"Input uploaded to: {input_uri}")

        # Submit
        job = self.submit_job(input_uri, job_name)
        print(f"Job submitted: {job.resource_name}")

        # Wait
        success = self.wait_for_completion(job)

        if success:
            print("Job completed. Downloading results...")
            output_uri = f"gs://{self.bucket_name}/batch-jobs/{job_name}/output/"
            results = download_and_parse_results(output_uri, None)
            print(f"Retrieved {len(results)} results")
            return results
        else:
            print("Job failed or timed out")
            return None

# Use the pipeline
pipeline = BatchInferencePipeline(
    project_id="your-project-id",
    bucket_name="your-batch-bucket"
)

prompts = [f"Summarize: {doc}" for doc in documents]
results = pipeline.run(prompts, job_name="doc-summary-2026-02")
```

## Cost Optimization Tips

Batch inference is already cheaper than real-time, but you can optimize further:

- Use the smallest model that meets your quality requirements. Gemini Flash is typically sufficient for classification and extraction tasks.
- Set appropriate max_output_tokens. If you only need a one-word classification, do not allow 1024 output tokens.
- Batch your batches. Submitting one job with 10,000 requests is more efficient than ten jobs with 1,000 requests each.
- Clean up intermediate files in Cloud Storage to avoid storage costs.

## Error Handling and Retries

Some requests in a batch might fail while others succeed. Always check individual results and retry failures.

```python
def process_with_retries(pipeline, prompts, job_name, max_retries=2):
    """Process prompts with automatic retry for failures."""
    remaining = list(enumerate(prompts))
    all_results = [None] * len(prompts)

    for attempt in range(max_retries + 1):
        if not remaining:
            break

        current_prompts = [p for _, p in remaining]
        results = pipeline.run(current_prompts, f"{job_name}-attempt-{attempt}")

        if results is None:
            print(f"Attempt {attempt} failed entirely. Retrying...")
            continue

        # Match results back to original indices
        failures = []
        for (original_idx, prompt), result in zip(remaining, results):
            if result and result.get("response", {}).get("candidates"):
                all_results[original_idx] = result
            else:
                failures.append((original_idx, prompt))

        remaining = failures
        print(f"Attempt {attempt}: {len(results) - len(failures)} succeeded, "
              f"{len(failures)} failed")

    return all_results
```

## Wrapping Up

Batch inference with Gemini on Vertex AI is the way to go for large-scale processing. The pattern is straightforward: prepare JSONL input, upload to Cloud Storage, submit the job, wait for completion, and parse the results. Build a pipeline class that handles the lifecycle, add retry logic for failures, and monitor your jobs. Use OneUptime to track job completion rates and processing times so you can spot issues early and optimize your batch workloads.
