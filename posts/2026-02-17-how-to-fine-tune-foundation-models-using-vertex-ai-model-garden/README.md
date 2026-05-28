# How to Fine-Tune Foundation Models Using Vertex AI Model Garden

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Model Garden, Fine-Tuning, Foundation Models

Description: Learn how to fine-tune foundation models from Vertex AI Model Garden for your specific use case using supervised tuning and adapter-based approaches.

---

Foundation models like Gemini, Gemma, and other open models on Vertex AI Model Garden are trained on massive datasets and work well for general tasks. But for your specific domain - legal document analysis, medical coding, customer support for your product - they need fine-tuning. A generic model might know what a "pod" is in biology, but your DevOps chatbot needs to know it means a Kubernetes pod.

Vertex AI Model Garden provides a catalog of foundation models that you can fine-tune with your own data. The tuning process adjusts the model's weights to perform better on your specific task while retaining the general knowledge from pre-training.

## Browsing the Model Garden

Model Garden offers a variety of models including Google's first-party models and popular open-source models. You can explore what is available programmatically.

This code lists available models in the Model Garden:

```python
import vertexai
from vertexai import model_garden

vertexai.init(project="your-project-id", location="us-central1")

# List self-deployable Model Garden models. Use the Cloud console to
# confirm whether a specific model card supports tuning.
models = model_garden.list_deployable_models(
    list_hf_models=False,
    model_filter="gemma"
)

for model in models[:20]:
    print(model)
```

## Preparing Training Data for Supervised Fine-Tuning

For supervised fine-tuning, you need labeled examples in JSONL format. The exact format depends on the model type.

For text generation/instruction following:

```python
# prepare_data.py - Prepare training data for fine-tuning

import json

def prepare_instruction_tuning_data(examples, output_path):
    """Prepare data for instruction fine-tuning.

    Each example should have an input (prompt) and output (response).
    """
    with open(output_path, "w") as f:
        for example in examples:
            record = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": example["prompt"]}]
                    },
                    {
                        "role": "model",
                        "parts": [{"text": example["response"]}]
                    }
                ]
            }
            f.write(json.dumps(record) + "\n")

    print(f"Wrote {len(examples)} examples to {output_path}")

# Example training data for a customer support bot
training_examples = [
    {
        "prompt": "How do I reset my password?",
        "response": "To reset your password, go to Settings > Account > Security, then click 'Reset Password'. You will receive an email with a reset link that expires in 24 hours."
    },
    {
        "prompt": "Why is my dashboard showing no data?",
        "response": "If your dashboard shows no data, check the following: 1) Verify your monitoring agent is running with 'oneuptime-agent status'. 2) Check that the agent can reach our API at status.oneuptime.com. 3) Ensure your project has active monitors configured in the Monitors section."
    },
    {
        "prompt": "How do I set up an alert for high CPU usage?",
        "response": "Navigate to Monitors > Create New Monitor. Select 'Server Monitor' as the type. Under Alert Conditions, add a rule for CPU usage with threshold set to your desired percentage. Choose notification channels (email, Slack, PagerDuty) in the Notification section. Click Create to activate the monitor."
    },
    # ... hundreds more examples
]

prepare_instruction_tuning_data(training_examples, "training_data.jsonl")
```

For classification tasks:

```python
def prepare_classification_data(examples, output_path):
    """Prepare data for text classification fine-tuning."""
    with open(output_path, "w") as f:
        for example in examples:
            record = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"Classify this support ticket: {example['text']}"}]
                    },
                    {
                        "role": "model",
                        "parts": [{"text": example["label"]}]  # Just the class label
                    }
                ]
            }
            f.write(json.dumps(record) + "\n")

# Example: Support ticket classification
classification_data = [
    {"text": "I cannot log into my account", "label": "authentication"},
    {"text": "The monitoring alerts are not working", "label": "alerting"},
    {"text": "How much does the enterprise plan cost", "label": "billing"},
    {"text": "My status page is showing wrong status", "label": "status_page"}
]

prepare_classification_data(classification_data, "classification_train.jsonl")
```

## Fine-Tuning a Gemini Model

Vertex AI provides a managed fine-tuning pipeline for Gemini models. You specify the training data and tuning parameters, and the service handles the rest.

This code fine-tunes a Gemini model:

```python
import time
import vertexai
from vertexai.tuning import sft

vertexai.init(project="your-project-id", location="us-central1")

# Upload training data to GCS first
# gsutil cp training_data.jsonl gs://your-bucket/tuning-data/

# Start supervised fine-tuning
tuning_job = sft.train(
    source_model="gemini-2.5-flash",
    train_dataset="gs://your-bucket/tuning-data/training_data.jsonl",
    validation_dataset="gs://your-bucket/tuning-data/validation_data.jsonl",
    epochs=3,
    adapter_size=4,  # Supported values depend on the source model
    learning_rate_multiplier=1.0,
    tuned_model_display_name="customer-support-gemini"
)

# Monitor the tuning job
print(f"Tuning job: {tuning_job.resource_name}")

# Wait for completion (can take 1-4 hours depending on data size)
while not tuning_job.has_ended:
    time.sleep(60)
    tuning_job.refresh()

# Get the tuned model endpoint
print(f"Tuned model: {tuning_job.tuned_model_name}")
print(f"Endpoint: {tuning_job.tuned_model_endpoint_name}")
```

## Fine-Tuning Open-Source Models

Model Garden also hosts open models like Llama, Qwen, and Gemma. Fine-tuning these uses managed tuning jobs for the supported open models.

This code fine-tunes a Gemma model using Vertex AI:

```python
import vertexai
from vertexai.tuning import sft, SourceModel

vertexai.init(project="your-project-id", location="us-central1")

# Fine-tune a supported open model with managed tuning.
tuning_job = sft.train(
    source_model=SourceModel(
        base_model="google/gemma3@gemma-3-27b-it"
    ),
    tuning_mode="PEFT_ADAPTER",
    epochs=3,
    train_dataset="gs://your-bucket/tuning-data/training_data.jsonl",
    validation_dataset="gs://your-bucket/tuning-data/validation_data.jsonl",
    output_uri="gs://your-bucket/tuned-models/gemma-support/"
)

print(f"Tuning job: {tuning_job.resource_name}")
print("Final artifacts will be under:")
print("gs://your-bucket/tuned-models/gemma-support/postprocess/node-0/checkpoints/final")
```

## Evaluating the Fine-Tuned Model

Before deploying, evaluate the fine-tuned model against your test set.

This code evaluates the tuned model:

```python
from vertexai.generative_models import GenerativeModel

# Load the fine-tuned model
tuned_model = GenerativeModel(
    "projects/your-project-id/locations/us-central1/endpoints/TUNED_ENDPOINT_ID"
)

# Test with evaluation examples
test_cases = [
    {
        "prompt": "How do I add a team member to my project?",
        "expected": "Go to Project Settings > Team Members > Invite. Enter their email and select a role."
    },
    {
        "prompt": "What integrations do you support?",
        "expected": "We support Slack, PagerDuty, Microsoft Teams, email, webhooks, and Jira integrations."
    }
]

results = []
for test in test_cases:
    response = tuned_model.generate_content(test["prompt"])
    generated = response.text

    # Simple evaluation - in production use more sophisticated metrics
    results.append({
        "prompt": test["prompt"],
        "expected": test["expected"],
        "generated": generated,
        "exact_match": generated.strip() == test["expected"].strip()
    })

    print(f"Prompt: {test['prompt']}")
    print(f"Expected: {test['expected']}")
    print(f"Generated: {generated}")
    print()

# Calculate metrics
exact_matches = sum(1 for r in results if r["exact_match"])
print(f"Exact match rate: {exact_matches}/{len(results)}")
```

## Using Preference Tuning for Further Refinement

After supervised fine-tuning, you can further improve supported Gemini models using preference tuning if you have human feedback data.

```python
import json

# Prepare preference data
# Each example has a prompt, a preferred response, and a rejected response
preference_data = [
    {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "How do I set up monitoring?"}]
            }
        ],
        "completions": [
            {
                "score": 1,
                "completion": {
                    "role": "model",
                    "parts": [{"text": "Here is a step-by-step guide to setting up monitoring in OneUptime: 1) Navigate to the Monitors page. 2) Click 'Create Monitor'. 3) Select your monitor type (HTTP, Ping, Port, etc). 4) Enter the URL or hostname to monitor. 5) Set the check interval. 6) Configure alert conditions and notification channels. 7) Click Save."}]
                }
            },
            {
                "score": 0,
                "completion": {
                    "role": "model",
                    "parts": [{"text": "You can set up monitoring by going to the monitoring page and creating a new monitor. It is pretty straightforward."}]
                }
            }
        ]
    }
]

# Save preference data
with open("preference_data.jsonl", "w") as f:
    for example in preference_data:
        f.write(json.dumps(example) + "\n")
```

## Deploying the Fine-Tuned Model

After tuning, deploy the model to an endpoint for serving.

```python
import vertexai
from vertexai.preview import model_garden

vertexai.init(project="your-project-id", location="us-central1")

# For Gemini fine-tuned models, the endpoint is created automatically
# For open-model fine-tuned models, deploy the final checkpoint manually

model = model_garden.CustomModel(
    gcs_uri="gs://your-bucket/tuned-models/gemma-support/postprocess/node-0/checkpoints/final"
)

endpoint = model.deploy(
    machine_type="g2-standard-12",  # Machine with L4 GPU
    accelerator_type="NVIDIA_L4",
    accelerator_count=1
)

print(f"Deployed to: {endpoint.resource_name}")
```

## Best Practices for Fine-Tuning

Data quality matters more than data quantity. A hundred high-quality, diverse examples often produce better results than thousands of noisy, repetitive ones. Focus on examples that represent the range of inputs your model will see in production.

Start with the smallest effective model. Fine-tuning a Flash or Flash-Lite model is faster and cheaper than fine-tuning a Pro model, and for many tasks the smaller model performs just as well after tuning. Only move to larger models if the smaller one cannot achieve your quality bar.

Use a validation set to avoid overfitting. Reserve 10-20% of your data for validation. If validation metrics start degrading while training metrics improve, you are overfitting and should reduce epochs or increase regularization.

Test the model on adversarial inputs before deploying. Ask it questions outside its training domain to see how it handles unknown topics. A well-tuned model should gracefully decline to answer rather than hallucinating.

Fine-tuning foundation models through Vertex AI Model Garden gives you the performance of a custom model with a fraction of the training data and compute that training from scratch would require.
