# How to Use the Vertex AI Python SDK to Fine-Tune a Foundation Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Machine Learning, Python, Fine-Tuning

Description: Learn how to fine-tune a foundation model on your own custom training data using the Vertex AI Python SDK for improved task-specific performance.

---

Foundation models are impressive out of the box, but they really shine when you fine-tune them on your specific data. A customer support model trained on your company's ticket history can outperform a generic model for that specific workflow. Vertex AI makes fine-tuning accessible through its Python SDK - you prepare your data, configure the tuning job, and let Google's infrastructure handle the training. In this post, I will walk through the entire process.

## When Fine-Tuning Makes Sense

Fine-tuning is worth the effort when you need a model that understands your domain-specific terminology, follows a particular output format consistently, or performs a specialized task that the base model handles adequately but not well enough. Common use cases include customer support classification, document summarization in a specific style, and entity extraction from domain-specific text.

## Setup

Install the Vertex AI SDK and authenticate.

```bash
# Install the Vertex AI Python SDK

pip install google-cloud-aiplatform google-cloud-storage

# Authenticate for local development
gcloud auth application-default login

# Enable the Vertex AI API
gcloud services enable aiplatform.googleapis.com
```

## Preparing Training Data

The training data format depends on the model you are fine-tuning. For Gemini supervised fine-tuning, use JSONL (JSON Lines) files where each line contains a `contents` array with the user input and the expected model output.

```python
# prepare_data.py - Format training data for Vertex AI fine-tuning
import json

# Your training examples as input-output pairs
training_examples = [
    {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "Customer says: My order hasn't arrived after 2 weeks."}],
            },
            {
                "role": "model",
                "parts": [{"text": "category: shipping_delay\npriority: high\nsentiment: frustrated"}],
            },
        ]
    },
    {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "Customer says: How do I change my password?"}],
            },
            {
                "role": "model",
                "parts": [{"text": "category: account_management\npriority: low\nsentiment: neutral"}],
            },
        ]
    },
    {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "Customer says: I was charged twice for the same item!"}],
            },
            {
                "role": "model",
                "parts": [{"text": "category: billing_error\npriority: high\nsentiment: angry"}],
            },
        ]
    },
    # Start with at least 100 examples; 100-500 is a good initial range
]

# Write training data as JSONL
with open("training_data.jsonl", "w") as f:
    for example in training_examples:
        f.write(json.dumps(example) + "\n")

# Write evaluation data (typically 10-20% of your total data)
eval_examples = training_examples[:50]  # Use a proper split in practice
with open("eval_data.jsonl", "w") as f:
    for example in eval_examples:
        f.write(json.dumps(example) + "\n")

print(f"Training examples: {len(training_examples)}")
print(f"Evaluation examples: {len(eval_examples)}")
```

## Preparing Chat-Format Training Data

For chat-style tasks, use the same Gemini `contents` format with multiple conversation turns. Put the assistant behavior instructions in `systemInstruction` when you need them.

```python
import json

# Chat-format training data with conversation context
chat_examples = [
    {
        "systemInstruction": {
            "parts": [
                {"text": "You are a technical support agent for a cloud hosting company. Be concise and helpful."}
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "My website is showing a 502 error"}],
            },
            {
                "role": "model",
                "parts": [{"text": "A 502 error usually means your application server is not responding. Let me help you troubleshoot:\n\n1. Check if your application process is running\n2. Look at your application logs for crash errors\n3. Verify your server has enough memory\n\nCan you check your application logs and share any error messages you see?"}],
            },
        ]
    },
    {
        "systemInstruction": {
            "parts": [
                {"text": "You are a technical support agent for a cloud hosting company. Be concise and helpful."}
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "How do I set up SSL for my domain?"}],
            },
            {
                "role": "model",
                "parts": [{"text": "Setting up SSL is straightforward. Go to your dashboard, click on your domain, and select 'SSL/TLS' from the sidebar. Click 'Enable Auto SSL' and we will provision a certificate from Let's Encrypt within a few minutes. No additional configuration needed - it handles renewal automatically."}],
            },
        ]
    },
]

# Write the chat training data
with open("chat_training_data.jsonl", "w") as f:
    for example in chat_examples:
        f.write(json.dumps(example) + "\n")
```

## Uploading Data to Cloud Storage

Vertex AI reads training data from Cloud Storage, so upload your JSONL files.

```python
from google.cloud import storage

def upload_training_data(local_path, bucket_name, blob_name):
    """Upload training data to Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path)
    print(f"Uploaded {local_path} to gs://{bucket_name}/{blob_name}")
    return f"gs://{bucket_name}/{blob_name}"

# Upload the training and evaluation files
training_uri = upload_training_data(
    "training_data.jsonl",
    "my-ml-bucket",
    "fine-tuning/support-classifier/training_data.jsonl"
)

eval_uri = upload_training_data(
    "eval_data.jsonl",
    "my-ml-bucket",
    "fine-tuning/support-classifier/eval_data.jsonl"
)
```

## Starting a Fine-Tuning Job

Now comes the main event - launching the fine-tuning job through the Vertex AI SDK.

```python
import time

import vertexai
from vertexai.tuning import sft

# Initialize the SDK
vertexai.init(project="my-gcp-project", location="us-central1")

# Start the supervised tuning job for a Gemini model
tuning_job = sft.train(
    source_model="gemini-2.0-flash-001",
    train_dataset="gs://my-ml-bucket/fine-tuning/support-classifier/training_data.jsonl",
    validation_dataset="gs://my-ml-bucket/fine-tuning/support-classifier/eval_data.jsonl",
    tuned_model_display_name="support-classifier",
    # Advanced: leave unset to use Vertex AI's recommended values
    # epochs=4,
    # learning_rate_multiplier=1.0,
)

print(f"Tuning job started: {tuning_job.resource_name}")

# Poll until the job finishes
while not tuning_job.has_ended:
    time.sleep(60)
    tuning_job.refresh()

print(f"Tuned model: {tuning_job.tuned_model_name}")
print(f"Tuned endpoint: {tuning_job.tuned_model_endpoint_name}")
```

## Fine-Tuning a Chat Model

For fine-tuning chat-style tasks, the process is similar and uses the same supervised tuning API.

```python
import time

import vertexai
from vertexai.tuning import sft

vertexai.init(project="my-gcp-project", location="us-central1")

tuning_job = sft.train(
    source_model="gemini-2.0-flash-001",
    train_dataset="gs://my-ml-bucket/fine-tuning/support-chat/chat_training_data.jsonl",
    tuned_model_display_name="support-chat",
)

# Wait for the tuning job to complete (this can take hours)
print("Waiting for tuning job to complete...")
while not tuning_job.has_ended:
    time.sleep(60)
    tuning_job.refresh()

print(f"Tuning complete. Model: {tuning_job.tuned_model_name}")
print(f"Endpoint: {tuning_job.tuned_model_endpoint_name}")
```

## Monitoring the Tuning Job

Tuning jobs can take a while. Here is how to check progress.

```python
import vertexai
from vertexai.tuning import sft

vertexai.init(project="my-gcp-project", location="us-central1")

# List all tuning jobs
tuning_jobs = sft.SupervisedTuningJob.list()

for job in tuning_jobs:
    print(job)
    print("---")

# Check a specific tuning job
job = sft.SupervisedTuningJob(
    "projects/my-gcp-project/locations/us-central1/tuningJobs/tuning-job-id"
)
print(job)
```

## Using the Fine-Tuned Model

Once tuning is complete, you can use the fine-tuned model for predictions.

```python
import vertexai
from vertexai.generative_models import GenerationConfig, GenerativeModel
from vertexai.tuning import sft

vertexai.init(project="my-gcp-project", location="us-central1")

# Load the tuning job and use its tuned endpoint
tuning_job = sft.SupervisedTuningJob(
    "projects/my-gcp-project/locations/us-central1/tuningJobs/tuning-job-id"
)
tuned_model = GenerativeModel(tuning_job.tuned_model_endpoint_name)

# Make predictions with the fine-tuned model
response = tuned_model.generate_content(
    "Customer says: I keep getting logged out every 5 minutes, this is really annoying!",
    generation_config=GenerationConfig(
        temperature=0.1,  # Low temperature for consistent classification
        max_output_tokens=100,
    ),
)

print(f"Prediction: {response.text}")
# Expected output: category: session_management\npriority: medium\nsentiment: frustrated
```

## Using the Fine-Tuned Model Endpoint

For Gemini supervised fine-tuning, Vertex AI automatically uploads the tuned model to Model Registry and deploys it to a shared public endpoint. Use the tuned endpoint name from the tuning job for production predictions.

```python
import vertexai
from vertexai.generative_models import GenerationConfig, GenerativeModel
from vertexai.tuning import sft

vertexai.init(project="my-gcp-project", location="us-central1")

tuning_job = sft.SupervisedTuningJob(
    "projects/my-gcp-project/locations/us-central1/tuningJobs/tuning-job-id"
)

print(f"Tuned model endpoint: {tuning_job.tuned_model_endpoint_name}")

# Use the endpoint for predictions
tuned_model = GenerativeModel(tuning_job.tuned_model_endpoint_name)
response = tuned_model.generate_content(
    "Customer says: How do I upgrade my plan?",
    generation_config=GenerationConfig(temperature=0.1, max_output_tokens=100),
)
print(f"Result: {response.text}")
```

## Evaluating Fine-Tuning Results

Compare the fine-tuned model against the base model to measure improvement.

```python
import vertexai
from vertexai.generative_models import GenerationConfig, GenerativeModel
from vertexai.tuning import sft

vertexai.init(project="my-gcp-project", location="us-central1")

# Load both models
base_model = GenerativeModel("gemini-2.0-flash-001")
tuning_job = sft.SupervisedTuningJob(
    "projects/my-gcp-project/locations/us-central1/tuningJobs/tuning-job-id"
)
tuned_model = GenerativeModel(tuning_job.tuned_model_endpoint_name)
generation_config = GenerationConfig(temperature=0.1, max_output_tokens=100)

# Test cases for comparison
test_cases = [
    "Customer says: Your app crashed and I lost my work",
    "Customer says: Can I get a refund for last month?",
    "Customer says: The new feature is great, thanks!",
]

print("=== Base Model vs Fine-Tuned Model ===\n")
for test_input in test_cases:
    base_response = base_model.generate_content(
        test_input,
        generation_config=generation_config,
    )
    tuned_response = tuned_model.generate_content(
        test_input,
        generation_config=generation_config,
    )

    print(f"Input: {test_input}")
    print(f"Base model:  {base_response.text[:100]}")
    print(f"Tuned model: {tuned_response.text[:100]}")
    print("---")
```

## Monitoring Your Fine-Tuned Models

Fine-tuned models need ongoing monitoring. Model performance can degrade over time as the data distribution shifts. OneUptime (https://oneuptime.com) can monitor your Vertex AI endpoints, track prediction latency and availability, and alert you when your model serving infrastructure has issues.

## Summary

Fine-tuning foundation models through Vertex AI is a practical way to get better performance on domain-specific tasks. The process comes down to three phases: prepare high-quality training data in the right format, run the tuning job through the SDK, and use the resulting tuned endpoint for serving. Start with at least 100 examples, evaluate the fine-tuned model against the base model, and iterate on your training data if the results are not good enough. The Vertex AI SDK handles the infrastructure complexity so you can focus on the data and evaluation.
