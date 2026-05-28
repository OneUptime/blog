# How to Fine-Tune a Gemini Model Using Supervised Tuning in Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Fine-Tuning, Generative AI

Description: Learn how to fine-tune a Gemini model using supervised tuning in Vertex AI to customize it for your specific use case and domain.

---

Prompt engineering goes a long way, but sometimes you need the model to behave in a specific way that is hard to express through prompts alone. Maybe you need it to always respond in a particular format, match your company's writing style, or handle domain-specific terminology. Supervised fine-tuning lets you train the model on your own examples, teaching it exactly how you want it to respond. The result is a customized model that consistently produces outputs aligned with your requirements.

## When Fine-Tuning Makes Sense

Fine-tuning is worth the effort when:

- You need consistent output formatting that prompts alone cannot achieve
- Your domain has specialized terminology the base model does not handle well
- You want shorter, more focused responses for a specific task
- You have hundreds or thousands of good input-output examples
- Prompt engineering has hit its limits for your use case

Fine-tuning is probably not needed when:

- Your task is general-purpose and the base model handles it well with good prompts
- You have fewer than 100 examples
- Your requirements change frequently (fine-tuning takes time to iterate)

## Preparing Your Training Data

The training data for supervised tuning consists of input-output pairs in JSONL format. Each line is a JSON object with the user's input and the expected model response.

Here is the format Vertex AI expects:

```python
# prepare_data.py

# Prepare training data for Gemini fine-tuning

import json

# Training examples - each has an input and expected output
training_examples = [
    {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": "Summarize this alert: Cloud SQL instance 'prod-db-01' CPU utilization exceeded 90% for 15 minutes in us-central1."
                    }
                ]
            },
            {
                "role": "model",
                "parts": [
                    {
                        "text": "ALERT SUMMARY\nService: Cloud SQL\nInstance: prod-db-01\nRegion: us-central1\nIssue: CPU > 90% for 15 min\nSeverity: High\nAction: Investigate query load; consider scaling up machine type or optimizing slow queries."
                    }
                ]
            }
        ]
    },
    {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": "Summarize this alert: GKE cluster 'production' node pool 'default-pool' has 3 nodes in NotReady state in us-east1-b."
                    }
                ]
            },
            {
                "role": "model",
                "parts": [
                    {
                        "text": "ALERT SUMMARY\nService: GKE\nCluster: production\nRegion: us-east1-b\nIssue: 3 nodes in NotReady state\nSeverity: Critical\nAction: Check node health; verify kubelet status; review recent node events and system logs."
                    }
                ]
            }
        ]
    },
    {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": "Summarize this alert: Cloud Storage bucket 'user-uploads' egress exceeded 500 GB in the last hour from us-west1."
                    }
                ]
            },
            {
                "role": "model",
                "parts": [
                    {
                        "text": "ALERT SUMMARY\nService: Cloud Storage\nBucket: user-uploads\nRegion: us-west1\nIssue: Egress > 500 GB/hour\nSeverity: Medium\nAction: Review access logs for unusual download patterns; check if data exfiltration or legitimate traffic spike."
                    }
                ]
            }
        ]
    },
    # ... more examples (aim for 100+ for good results)
]

# Write to JSONL file
with open('training_data.jsonl', 'w') as f:
    for example in training_examples:
        f.write(json.dumps(example) + '\n')

print(f"Wrote {len(training_examples)} training examples")
```

## Adding System Instructions to Training Data

You can include system instructions in your training examples:

```python
# system_instruction_examples.py
# Training data with system instructions

training_with_system = {
    "systemInstruction": {
        "role": "system",
        "parts": [
            {
                "text": "You are an infrastructure alert summarizer. Always respond in the exact format: ALERT SUMMARY followed by structured fields."
            }
        ]
    },
    "contents": [
        {
            "role": "user",
            "parts": [
                {
                    "text": "Summarize this alert: Load balancer 'frontend-lb' backend service health check failures for 5 minutes."
                }
            ]
        },
        {
            "role": "model",
            "parts": [
                {
                    "text": "ALERT SUMMARY\nService: Load Balancer\nResource: frontend-lb\nIssue: Backend health check failures for 5 min\nSeverity: High\nAction: Check backend instance health; verify health check endpoint; review recent deployments."
                }
            ]
        }
    ]
}
```

## Uploading Training Data

Upload your training data to Cloud Storage:

```bash
# Upload training data to GCS
gcloud storage cp training_data.jsonl gs://your-bucket/fine-tuning/training_data.jsonl

# Optionally upload validation data too
gcloud storage cp validation_data.jsonl gs://your-bucket/fine-tuning/validation_data.jsonl
```

## Creating the Tuning Job

Here is how to create a supervised tuning job:

```python
# create_tuning_job.py
# Create a supervised tuning job for Gemini

import vertexai
from vertexai.tuning import sft

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Create the tuning job
tuning_job = sft.train(
    source_model='gemini-2.0-flash-001',
    train_dataset='gs://your-bucket/fine-tuning/training_data.jsonl',
    # Optional: validation data for monitoring overfitting
    validation_dataset='gs://your-bucket/fine-tuning/validation_data.jsonl',
    # Number of training epochs
    epochs=3,
    # Learning rate multiplier (adjusts the base learning rate)
    learning_rate_multiplier=1.0,
    # Name for your tuned model
    tuned_model_display_name='alert-summarizer-v1',
)

print(f"Tuning job created: {tuning_job.resource_name}")
```

## Monitoring the Tuning Job

Track the progress of your tuning job:

```python
# monitor_tuning.py
# Check the status of a tuning job

import time

import vertexai
from vertexai.tuning import sft

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Use the full resource name, such as:
# projects/your-project-id/locations/us-central1/tuningJobs/TUNING_JOB_ID
tuning_job = sft.SupervisedTuningJob('TUNING_JOB_RESOURCE_NAME')

while not tuning_job.has_ended:
    time.sleep(60)
    tuning_job.refresh()

print(f"Tuned model: {tuning_job.tuned_model_name}")
print(f"Tuned endpoint: {tuning_job.tuned_model_endpoint_name}")
```

Using the REST API:

```bash
# Check tuning job status
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/your-project-id/locations/us-central1/tuningJobs/TUNING_JOB_ID"

# List all tuning jobs
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/your-project-id/locations/us-central1/tuningJobs"
```

## Using Your Fine-Tuned Model

Once tuning is complete, use the model just like the base model:

```python
# use_tuned_model.py
# Use the fine-tuned model for predictions

import vertexai
from vertexai.generative_models import GenerativeModel
from vertexai.tuning import sft

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Load the tuning job and use its tuned endpoint name
sft_tuning_job = sft.SupervisedTuningJob(
    'projects/your-project-id/locations/us-central1/tuningJobs/TUNING_JOB_ID'
)
tuned_model = GenerativeModel(sft_tuning_job.tuned_model_endpoint_name)

# Test with a new alert
response = tuned_model.generate_content(
    'Summarize this alert: Pub/Sub subscription "order-processing" has 50,000 unacked messages, backlog growing for 30 minutes in us-central1.'
)

print(response.text)
```

## Evaluating Your Tuned Model

Compare the tuned model against the base model to make sure tuning improved things:

```python
# evaluate_model.py
# Compare base model vs tuned model

import vertexai
from vertexai.generative_models import GenerativeModel
from vertexai.tuning import sft

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

base_model = GenerativeModel('gemini-2.0-flash-001')
sft_tuning_job = sft.SupervisedTuningJob(
    'projects/your-project-id/locations/us-central1/tuningJobs/TUNING_JOB_ID'
)
tuned_model = GenerativeModel(sft_tuning_job.tuned_model_endpoint_name)

# Test cases
test_cases = [
    'Summarize this alert: Memorystore Redis instance "cache-01" memory usage at 95% in us-central1.',
    'Summarize this alert: Cloud Function "process-payment" error rate spiked to 25% in the last 10 minutes.',
    'Summarize this alert: VPN tunnel "site-to-cloud" has been down for 5 minutes.',
]

for test in test_cases:
    print(f"\nInput: {test}")
    print(f"\nBase model:")
    base_response = base_model.generate_content(test)
    print(base_response.text)

    print(f"\nTuned model:")
    tuned_response = tuned_model.generate_content(test)
    print(tuned_response.text)

    print("-" * 80)
```

## Tips for Better Training Data

Quality matters more than quantity. 200 excellent examples will outperform 2,000 mediocre ones.

Cover edge cases. Include examples with unusual inputs, error conditions, and boundary cases. The model learns from the distribution of your examples.

Be consistent in your outputs. If your format has specific fields, make sure every example includes all of them. Inconsistency in training data leads to inconsistent outputs.

Include negative examples. If there are things the model should not do, include examples where the input might tempt a bad response and show the correct behavior.

Balance your examples. If you are fine-tuning for classification, make sure each class is reasonably represented in the training data.

## Choosing Hyperparameters

The main hyperparameters for Gemini fine-tuning are:

- **epochs** - Number of passes through the training data. Start with 3-5. More epochs risk overfitting, fewer may undertrain.
- **learning_rate_multiplier** - Adjusts the learning rate. Start with 1.0. If the model overfits, reduce to 0.5. If it undertrains, increase to 2.0.

```python
# Conservative tuning (less risk of overfitting)
tuning_job = sft.train(
    source_model='gemini-2.0-flash-001',
    train_dataset='gs://your-bucket/fine-tuning/training_data.jsonl',
    epochs=2,
    learning_rate_multiplier=0.5,
    tuned_model_display_name='alert-summarizer-conservative',
)

# Aggressive tuning (more specialization, higher overfitting risk)
tuning_job = sft.train(
    source_model='gemini-2.0-flash-001',
    train_dataset='gs://your-bucket/fine-tuning/training_data.jsonl',
    epochs=5,
    learning_rate_multiplier=2.0,
    tuned_model_display_name='alert-summarizer-aggressive',
)
```

## Cost Considerations

Fine-tuning costs are based on the number of training tokens and the number of epochs. More examples and more epochs mean higher costs. Start with a small dataset, verify the approach works, and then scale up.

After tuning, inference requests to the tuned model are still charged. Inference pricing is the same for each stable version of Gemini.

## Wrapping Up

Supervised fine-tuning in Vertex AI lets you customize Gemini models to match your specific needs. The process is straightforward: prepare high-quality training examples, upload them, create a tuning job, and then use the resulting model. The key to success is the quality and consistency of your training data. Start with a clear definition of what you want the model to do differently, create examples that demonstrate that behavior, and iterate based on evaluation results.
