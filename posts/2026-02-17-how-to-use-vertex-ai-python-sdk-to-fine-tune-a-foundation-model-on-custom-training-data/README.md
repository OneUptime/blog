# How to Use the Vertex AI Python SDK to Fine-Tune a Foundation Model on Custom Training Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Machine Learning, Python, Fine-Tuning

Description: Learn how to fine-tune a foundation model on your own custom training data using the Vertex AI Python SDK for improved task-specific performance.

---

Foundation models are impressive out of the box, but they really shine when you fine-tune them on your specific data. A customer support model trained on your company's ticket history will outperform a generic model every time. Vertex AI makes fine-tuning accessible through its Python SDK - you prepare your data, configure the tuning job, and let Google's infrastructure handle the training. In this post, I will walk through the entire process.

## When Fine-Tuning Makes Sense

Fine-tuning is worth the effort when you need a model that understands your domain-specific terminology, follows a particular output format consistently, or performs a specialized task that the base model handles adequately but not well enough. Common use cases include customer support classification, document summarization in a specific style, and entity extraction from domain-specific text.

## Setup

Install the Vertex AI SDK and authenticate.

```bash
# Install the Vertex AI Python SDK
pip install google-cloud-aiplatform

# Authenticate for local development
gcloud auth application-default login

# Enable the Vertex AI API
gcloud services enable aiplatform.googleapis.com
```

## Preparing Training Data

The training data format depends on the model you are fine-tuning. For text models, you typically need JSONL (JSON Lines) files with input-output pairs.

```python
# prepare_data.py - Format training data for Vertex AI fine-tuning
import json

# Your training examples as input-output pairs
training_examples = [
    {
        "input_text": "Customer says: My order hasn't arrived after 2 weeks.",
        "output_text": "category: shipping_delay\npriority: high\nsentiment: frustrated"
    },
    {
        "input_text": "Customer says: How do I change my password?",
        "output_text": "category: account_management\npriority: low\nsentiment: neutral"
    },
    {
        "input_text": "Customer says: I was charged twice for the same item!",
        "output_text": "category: billing_error\npriority: high\nsentiment: angry"
    },
    # Add hundreds more examples for good results
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

For chat models, the format includes conversation turns.

```python
import json

# Chat-format training data with conversation context
chat_examples = [
    {
        "messages": [
            {
                "role": "system",
                "content": "You are a technical support agent for a cloud hosting company. Be concise and helpful."
            },
            {
                "role": "user",
                "content": "My website is showing a 502 error"
            },
            {
                "role": "model",
                "content": "A 502 error usually means your application server is not responding. Let me help you troubleshoot:\n\n1. Check if your application process is running\n2. Look at your application logs for crash errors\n3. Verify your server has enough memory\n\nCan you check your application logs and share any error messages you see?"
            }
        ]
    },
    {
        "messages": [
            {
                "role": "system",
                "content": "You are a technical support agent for a cloud hosting company. Be concise and helpful."
            },
            {
                "role": "user",
                "content": "How do I set up SSL for my domain?"
            },
            {
                "role": "model",
                "content": "Setting up SSL is straightforward. Go to your dashboard, click on your domain, and select 'SSL/TLS' from the sidebar. Click 'Enable Auto SSL' and we will provision a certificate from Let's Encrypt within a few minutes. No additional configuration needed - it handles renewal automatically."
            }
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
from google.cloud import aiplatform

# Initialize the SDK
aiplatform.init(project="my-gcp-project", location="us-central1")

# Start the supervised tuning job for a text model
tuning_job = aiplatform.TextGenerationModel.from_pretrained(
    "text-bison@002"
).tune_model(
    training_data="gs://my-ml-bucket/fine-tuning/support-classifier/training_data.jsonl",
    validation_data="gs://my-ml-bucket/fine-tuning/support-classifier/eval_data.jsonl",
    train_steps=300,            # Number of training steps
    learning_rate_multiplier=1, # Adjust if model is underfitting or overfitting
    tuning_job_location="us-central1",
    tuned_model_location="us-central1",
)

print(f"Tuning job started: {tuning_job.resource_name}")
print(f"Job state: {tuning_job.state}")
```

## Fine-Tuning a Chat Model

For fine-tuning chat models, the process is similar but uses the chat model class.

```python
from google.cloud import aiplatform

aiplatform.init(project="my-gcp-project", location="us-central1")

# Fine-tune a chat model
chat_model = aiplatform.ChatModel.from_pretrained("chat-bison@002")

tuning_job = chat_model.tune_model(
    training_data="gs://my-ml-bucket/fine-tuning/support-chat/chat_training_data.jsonl",
    train_steps=200,
    learning_rate_multiplier=1,
    tuning_job_location="us-central1",
    tuned_model_location="us-central1",
)

# Wait for the tuning job to complete (this can take hours)
print("Waiting for tuning job to complete...")
tuning_job.wait()
print(f"Tuning complete. Model: {tuning_job.tuned_model_name}")
```

## Monitoring the Tuning Job

Tuning jobs can take a while. Here is how to check progress.

```python
from google.cloud import aiplatform

aiplatform.init(project="my-gcp-project", location="us-central1")

# List all tuning jobs
tuning_jobs = aiplatform.PipelineJob.list(
    filter='display_name="tune-text-bison"',
    order_by="create_time desc",
)

for job in tuning_jobs:
    print(f"Job: {job.display_name}")
    print(f"State: {job.state}")
    print(f"Created: {job.create_time}")
    print("---")

# Check a specific tuning job
job = aiplatform.PipelineJob.get(
    resource_name="projects/123/locations/us-central1/pipelineJobs/tune-job-id"
)
print(f"State: {job.state}")
print(f"Error: {job.error}")
```

## Using the Fine-Tuned Model

Once tuning is complete, you can use the fine-tuned model for predictions.

```python
from google.cloud import aiplatform

aiplatform.init(project="my-gcp-project", location="us-central1")

# Load the fine-tuned model using the endpoint from the tuning job
tuned_model = aiplatform.TextGenerationModel.get_tuned_model(
    "projects/my-gcp-project/locations/us-central1/models/tuned-model-id"
)

# Make predictions with the fine-tuned model
response = tuned_model.predict(
    "Customer says: I keep getting logged out every 5 minutes, this is really annoying!",
    temperature=0.1,  # Low temperature for consistent classification
    max_output_tokens=100,
)

print(f"Prediction: {response.text}")
# Expected output: category: session_management\npriority: medium\nsentiment: frustrated
```

## Deploying the Fine-Tuned Model to an Endpoint

For production use, deploy the model to a Vertex AI endpoint for low-latency serving.

```python
from google.cloud import aiplatform

aiplatform.init(project="my-gcp-project", location="us-central1")

# Create an endpoint for serving predictions
endpoint = aiplatform.Endpoint.create(
    display_name="support-classifier-endpoint",
    project="my-gcp-project",
    location="us-central1",
)

# Deploy the tuned model to the endpoint
model = aiplatform.Model(model_name="projects/my-project/locations/us-central1/models/tuned-model-id")

model.deploy(
    endpoint=endpoint,
    deployed_model_display_name="support-classifier-v1",
    machine_type="n1-standard-4",
    min_replica_count=1,
    max_replica_count=3,
    traffic_percentage=100,
)

print(f"Model deployed to endpoint: {endpoint.resource_name}")

# Use the endpoint for predictions
prediction = endpoint.predict(
    instances=["Customer says: How do I upgrade my plan?"]
)
print(f"Result: {prediction.predictions}")
```

## Evaluating Fine-Tuning Results

Compare the fine-tuned model against the base model to measure improvement.

```python
from google.cloud import aiplatform
import json

aiplatform.init(project="my-gcp-project", location="us-central1")

# Load both models
base_model = aiplatform.TextGenerationModel.from_pretrained("text-bison@002")
tuned_model = aiplatform.TextGenerationModel.get_tuned_model("tuned-model-id")

# Test cases for comparison
test_cases = [
    "Customer says: Your app crashed and I lost my work",
    "Customer says: Can I get a refund for last month?",
    "Customer says: The new feature is great, thanks!",
]

print("=== Base Model vs Fine-Tuned Model ===\n")
for test_input in test_cases:
    base_response = base_model.predict(test_input, temperature=0.1)
    tuned_response = tuned_model.predict(test_input, temperature=0.1)

    print(f"Input: {test_input}")
    print(f"Base model:  {base_response.text[:100]}")
    print(f"Tuned model: {tuned_response.text[:100]}")
    print("---")
```

## Monitoring Your Fine-Tuned Models

Fine-tuned models need ongoing monitoring. Model performance can degrade over time as the data distribution shifts. OneUptime (https://oneuptime.com) can monitor your Vertex AI endpoints, track prediction latency and availability, and alert you when your model serving infrastructure has issues.

## Summary

Fine-tuning foundation models through Vertex AI is a practical way to get better performance on domain-specific tasks. The process comes down to three phases: prepare high-quality training data in the right format, run the tuning job through the SDK, and deploy the resulting model for serving. Start with at least a few hundred examples, evaluate the fine-tuned model against the base model, and iterate on your training data if the results are not good enough. The Vertex AI SDK handles the infrastructure complexity so you can focus on the data and evaluation.
