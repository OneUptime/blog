# How to Fine-Tune a GPT Model in Azure OpenAI Service with Custom Training Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, OpenAI, Fine-Tuning, GPT, Machine Learning, Custom Models, Training

Description: A complete walkthrough for fine-tuning a GPT model in Azure OpenAI using your own training data, from data preparation to deployment.

---

Fine-tuning lets you customize a GPT model with your own training data so it learns the style, format, and domain knowledge specific to your use case. Instead of cramming everything into a prompt, you teach the model through examples. The result is a custom model that produces better outputs with shorter prompts, which can also reduce your token costs. In this post, I will walk through the complete process of fine-tuning a GPT model in Azure OpenAI Service.

## When to Fine-Tune vs. When to Use Prompt Engineering

Before investing in fine-tuning, consider whether prompt engineering or RAG (Retrieval-Augmented Generation) could solve your problem. Fine-tuning is the right choice when:

- You need the model to consistently follow a specific output format or writing style.
- You want to reduce prompt length by teaching the model behaviors through training data rather than instructions.
- You have a specialized domain where the model needs to learn specific terminology or conventions.
- You need the model to perform a narrow task very well (like extracting structured data from a specific document type).

Fine-tuning is usually not the right choice when:

- You need the model to know about specific facts or documents (use RAG instead).
- You only need to change the model's behavior for a few edge cases (use prompt engineering).
- You do not have enough high-quality training examples (at least 50-100 examples, ideally more).

## Step 1: Prepare Your Training Data

Azure OpenAI fine-tuning uses a JSONL (JSON Lines) format where each line is a training example. For chat models, each example is a conversation with system, user, and assistant messages. The training and validation files must be UTF-8 encoded with a byte-order mark (BOM), and each file must be less than 512 MB.

```jsonl
{"messages": [{"role": "system", "content": "You are a customer support agent for Acme Cloud. Always be concise and reference specific product features."}, {"role": "user", "content": "How do I increase my storage limit?"}, {"role": "assistant", "content": "Navigate to Settings > Storage in your Acme Cloud dashboard. Click 'Upgrade Plan' to select a tier with more storage. Your current usage is shown at the top of the page."}]}
{"messages": [{"role": "system", "content": "You are a customer support agent for Acme Cloud. Always be concise and reference specific product features."}, {"role": "user", "content": "My file upload keeps failing"}, {"role": "assistant", "content": "Check that your file is under the 500MB single-file limit. Go to Settings > Upload Preferences and confirm that the file type is in your allowed list. If the issue persists, check the upload log at Activity > Upload History for the specific error code."}]}
```

### Data Quality Guidelines

The quality of your training data directly determines the quality of your fine-tuned model. Follow these guidelines:

- **Quantity**: Start with at least 50 examples. For production quality, aim for 200-500 or more.
- **Diversity**: Cover the full range of scenarios your model will encounter. Do not just include happy-path examples.
- **Consistency**: The assistant responses should all follow the same style, format, and quality standards. Inconsistent training data produces inconsistent model behavior.
- **Accuracy**: Every assistant response must be correct. The model will learn from mistakes in your training data.

Here is a Python script that validates your training file before uploading:

```python
import json

def validate_training_file(filepath):
    """
    Validate a JSONL training file for Azure OpenAI fine-tuning.
    Checks format, required fields, and prints statistics.
    """
    errors = []
    examples = []

    with open(filepath, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"Line {line_num}: Invalid JSON")
                continue

            # Check required 'messages' field
            if 'messages' not in data:
                errors.append(f"Line {line_num}: Missing 'messages' field")
                continue

            messages = data['messages']

            # Check that messages is a list with at least 2 entries
            if not isinstance(messages, list) or len(messages) < 2:
                errors.append(f"Line {line_num}: 'messages' must be a list with at least 2 entries")
                continue

            # Check roles
            roles = [m.get('role') for m in messages]
            if 'assistant' not in roles:
                errors.append(f"Line {line_num}: Must include at least one assistant message")

            examples.append(data)

    if errors:
        print(f"Found {len(errors)} errors:")
        for e in errors[:10]:  # Show first 10 errors
            print(f"  {e}")
    else:
        print(f"Validation passed. {len(examples)} examples found.")

    return len(errors) == 0

# Run validation

validate_training_file("training_data.jsonl")
```

## Step 2: Upload Training Data to Azure OpenAI

Upload your training file through either the Azure OpenAI Studio or the API.

### Using the API

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    base_url="https://your-resource.openai.azure.com/openai/v1/"
)

# Upload the training file
with open("training_data.jsonl", "rb") as f:
    training_file = client.files.create(
        file=f,
        purpose="fine-tune"  # Must be "fine-tune" for training data
    )

print(f"File uploaded. ID: {training_file.id}")
print(f"Status: {training_file.status}")
```

You can also upload a separate validation file to monitor for overfitting during training. The validation file uses the same format as the training file.

```python
# Optionally upload a validation file
with open("validation_data.jsonl", "rb") as f:
    validation_file = client.files.create(
        file=f,
        purpose="fine-tune"
    )
print(f"Validation file uploaded. ID: {validation_file.id}")
```

## Step 3: Create a Fine-Tuning Job

Once your file is uploaded and processed, create the fine-tuning job.

```python
# Create the fine-tuning job
job = client.fine_tuning.jobs.create(
    training_file=training_file.id,
    validation_file=validation_file.id,  # Include this only if you uploaded a validation file
    model="gpt-4.1-2025-04-14",          # Base model to fine-tune
    suffix="acme-support",
    method={
        "type": "supervised",
        "supervised": {
            "hyperparameters": {
                "n_epochs": 3,                   # Number of training passes
                "batch_size": 4,                 # Examples processed together
                "learning_rate_multiplier": 0.1  # Scale for the learning rate
            }
        }
    },
    extra_body={"trainingType": "GlobalStandard"}
)

print(f"Fine-tuning job created. ID: {job.id}")
print(f"Status: {job.status}")
```

### Hyperparameter Tuning

- **n_epochs**: How many times the model sees each training example. Start with 3. More epochs can improve quality but risk overfitting.
- **batch_size**: Number of examples in each training batch. Larger batches are more stable but use more memory.
- **learning_rate_multiplier**: Scales the default learning rate. Lower values make training more conservative. Azure documentation recommends experimenting with values in the range of `0.02` to `0.2`.

## Step 4: Monitor Training Progress

Fine-tuning takes time, typically 30 minutes to a few hours depending on the size of your dataset.

```python
import time

def monitor_fine_tuning(job_id):
    """
    Poll the fine-tuning job status until completion.
    Prints training metrics as they become available.
    """
    while True:
        job = client.fine_tuning.jobs.retrieve(job_id)
        print(f"Status: {job.status}")

        if job.status == "succeeded":
            print(f"Fine-tuning complete!")
            print(f"Fine-tuned model: {job.fine_tuned_model}")
            return job

        elif job.status == "failed":
            print(f"Fine-tuning failed: {job.error}")
            return job

        elif job.status == "cancelled":
            print("Fine-tuning was cancelled.")
            return job

        # Wait before checking again
        time.sleep(60)

result = monitor_fine_tuning(job.id)
```

You can also check the training events for more detailed progress:

```python
# List events for the fine-tuning job
events = client.fine_tuning.jobs.list_events(fine_tuning_job_id=job.id, limit=10)
for event in events.data:
    print(f"{event.created_at}: {event.message}")
```

## Step 5: Deploy the Fine-Tuned Model

Once training succeeds, you need to deploy the fine-tuned model before you can use it. In the Foundry portal, go to Deployments and create a new deployment using your fine-tuned model.

The model name will look something like `gpt-4.1-2025-04-14.ft-abc123def456`. Select this as the model and give the deployment a name.

## Step 6: Test Your Fine-Tuned Model

Use the deployed model just like any other Azure OpenAI deployment. The key difference is that your fine-tuned model has learned from your training data, so it should produce outputs that match your desired style and format without needing lengthy instructions in the prompt.

```python
# Test the fine-tuned model with a shorter prompt
response = client.chat.completions.create(
    model="my-finetuned-deployment",  # Your deployment name
    messages=[
        {"role": "system", "content": "You are a customer support agent for Acme Cloud."},
        {"role": "user", "content": "How do I share a folder with my team?"}
    ],
    max_tokens=200,
    temperature=0.3
)

print(response.choices[0].message.content)
```

Notice that the system prompt is shorter than what you would need with the base model. The fine-tuned model already knows the style and behavior you expect.

## Evaluating Fine-Tuning Results

Compare your fine-tuned model against the base model on a held-out test set. Measure:

- **Task accuracy**: Does the model produce correct answers more often?
- **Format compliance**: Does it follow your desired output format consistently?
- **Token efficiency**: Are the responses appropriately concise?
- **Tone consistency**: Does the writing style match your training data?

If the fine-tuned model underperforms, consider adding more training examples, cleaning up inconsistencies in your training data, or adjusting hyperparameters.

## Cost Considerations

Fine-tuning has three cost components:

1. **Training cost**: For supervised fine-tuning, billed from the number of tokens in your training file, multiplied by the number of epochs and the model's training price. Always check the Azure OpenAI pricing page for the current model-specific rate.
2. **Hosting cost**: Standard and Global Standard fine-tuned model deployments have an hourly hosting fee, even when not processing requests. Developer tier deployments do not have an hourly hosting fee, but they are intended for evaluation rather than production.
3. **Inference cost**: Standard and Global Standard fine-tuned deployments are billed per token at the same token rate as the corresponding base model deployment type. Provisioned Throughput deployments use PTU-hour billing instead.

Despite the added training and hosting costs, fine-tuned models can reduce overall costs when they need shorter prompts to produce the same quality output.

## Wrapping Up

Fine-tuning is a powerful tool for customizing GPT models to your specific needs. The key to success is high-quality, consistent training data. Start small with 50-100 examples, evaluate the results, and iterate. If the model is not learning what you expect, look at your training data first - the answer is almost always there. Fine-tuning works best when you need consistent style and format rather than new knowledge, so combine it with RAG if you also need the model to reference specific documents or data.
