# How to Fine-Tune Models with Amazon Bedrock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Bedrock, Fine-Tuning, Machine Learning

Description: Step-by-step guide to fine-tuning foundation models on Amazon Bedrock using custom datasets for domain-specific performance improvements.

---

Foundation models are impressive out of the box, but they're generalists. When you need a model that really nails your specific domain - whether that's medical terminology, legal language, or your company's particular way of handling customer inquiries - fine-tuning is the way to go. Amazon Bedrock makes this process surprisingly straightforward compared to managing your own training infrastructure.

Fine-tuning adjusts a pre-trained model's weights using your own data so it performs better on your specific tasks. Think of it as specializing a general-purpose tool. The base model already knows language; you're teaching it the nuances of your domain.

## When Should You Fine-Tune?

Before jumping into fine-tuning, make sure it's the right approach. If prompt engineering or retrieval-augmented generation (RAG) gives you good enough results, stick with those - they're faster and cheaper. Fine-tuning makes sense when:

- You need consistent output formatting that prompt engineering can't reliably achieve
- Your domain has specialized vocabulary or conventions the base model doesn't handle well
- You want to reduce input token usage by baking context into the model itself
- Response quality needs to be higher than what few-shot prompting delivers

## Preparing Your Training Data

The quality of your training data determines the quality of your fine-tuned model. Bedrock expects training data in JSONL format, where each line is a JSON object with a prompt-completion pair.

Here's the format for supervised fine-tuning.

```json
{"prompt": "Summarize this patient note: 52yo male presenting with chest pain radiating to left arm, onset 2 hours ago. BP 150/95, HR 88. ECG shows ST elevation in leads II, III, aVF.", "completion": "52-year-old male with acute onset chest pain and ST-elevation in inferior leads, consistent with inferior STEMI. Hypertensive on presentation. Requires emergent cardiac catheterization."}
{"prompt": "Summarize this patient note: 28yo female with 3-day history of productive cough, fever 101.2F, and right-sided pleuritic chest pain. CXR shows right lower lobe consolidation.", "completion": "28-year-old female presenting with community-acquired pneumonia affecting the right lower lobe. Symptoms include productive cough, fever, and pleuritic chest pain over 3 days."}
```

A few rules for good training data:

- Aim for at least 1,000 examples, though more is better
- Make sure examples are diverse and cover edge cases
- Keep formatting consistent across all examples
- Clean your data thoroughly - garbage in, garbage out applies doubly here

Here's a script to validate and prepare your training data.

```python
import json

def validate_training_data(file_path):
    """Validate JSONL training data for Bedrock fine-tuning."""
    errors = []
    valid_count = 0

    with open(file_path, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"Line {line_num}: Invalid JSON")
                continue

            # Check required fields
            if 'prompt' not in data:
                errors.append(f"Line {line_num}: Missing 'prompt' field")
            elif len(data['prompt'].strip()) == 0:
                errors.append(f"Line {line_num}: Empty prompt")

            if 'completion' not in data:
                errors.append(f"Line {line_num}: Missing 'completion' field")
            elif len(data['completion'].strip()) == 0:
                errors.append(f"Line {line_num}: Empty completion")
            else:
                valid_count += 1

    print(f"Valid examples: {valid_count}")
    if errors:
        print(f"Errors found: {len(errors)}")
        for error in errors[:10]:  # Show first 10 errors
            print(f"  - {error}")
    else:
        print("All examples are valid!")

    return len(errors) == 0

validate_training_data('training_data.jsonl')
```

## Uploading Training Data to S3

Your training data needs to live in S3. Make sure the bucket is in the same region as your Bedrock fine-tuning job.

```python
import boto3

s3 = boto3.client('s3', region_name='us-east-1')

# Upload training and validation data
s3.upload_file(
    'training_data.jsonl',
    'my-bedrock-training-bucket',
    'fine-tuning/medical-summarization/train.jsonl'
)

s3.upload_file(
    'validation_data.jsonl',
    'my-bedrock-training-bucket',
    'fine-tuning/medical-summarization/validation.jsonl'
)

print("Training data uploaded successfully")
```

## Creating the Fine-Tuning Job

Now for the main event. You'll use the `create_model_customization_job` API to kick off fine-tuning. You need to specify the base model, your training data location, hyperparameters, and where to store the output.

```python
bedrock = boto3.client('bedrock', region_name='us-east-1')

# Create the fine-tuning job
response = bedrock.create_model_customization_job(
    jobName='medical-summarization-ft-v1',
    customModelName='medical-summarization-model',

    # The base model to fine-tune
    baseModelIdentifier='amazon.titan-text-express-v1',

    # IAM role with S3 and Bedrock permissions
    roleArn='arn:aws:iam::123456789012:role/BedrockFineTuningRole',

    # Training data location
    trainingDataConfig={
        's3Uri': 's3://my-bedrock-training-bucket/fine-tuning/medical-summarization/train.jsonl'
    },

    # Optional validation data
    validationDataConfig={
        'validators': [
            {
                's3Uri': 's3://my-bedrock-training-bucket/fine-tuning/medical-summarization/validation.jsonl'
            }
        ]
    },

    # Output location for the fine-tuned model artifacts
    outputDataConfig={
        's3Uri': 's3://my-bedrock-training-bucket/fine-tuning/medical-summarization/output/'
    },

    # Hyperparameters for fine-tuning
    hyperParameters={
        'epochCount': '3',
        'batchSize': '8',
        'learningRate': '0.00001',
        'learningRateWarmupSteps': '10'
    },

    customizationType='FINE_TUNING'
)

job_arn = response['jobArn']
print(f"Fine-tuning job started: {job_arn}")
```

## Monitoring the Fine-Tuning Job

Fine-tuning takes time - anywhere from a few hours to a day depending on your dataset size and the base model. Monitor progress through the API.

```python
import time

def monitor_fine_tuning_job(job_name):
    """Poll the fine-tuning job status until completion."""
    while True:
        response = bedrock.get_model_customization_job(jobIdentifier=job_name)
        status = response['status']

        print(f"Status: {status}")

        if status == 'Completed':
            print("Fine-tuning complete!")
            print(f"Custom model ARN: {response.get('outputModelArn', 'N/A')}")
            return response
        elif status == 'Failed':
            print(f"Fine-tuning failed: {response.get('failureMessage', 'Unknown error')}")
            return response
        elif status in ['Stopping', 'Stopped']:
            print("Job was stopped")
            return response

        # Check training metrics if available
        if 'trainingMetrics' in response:
            metrics = response['trainingMetrics']
            print(f"  Training loss: {metrics.get('trainingLoss', 'N/A')}")

        time.sleep(300)  # Check every 5 minutes

monitor_fine_tuning_job('medical-summarization-ft-v1')
```

## Creating a Provisioned Throughput for Your Model

Fine-tuned models need provisioned throughput to be invoked. This is different from on-demand pricing - you're reserving dedicated capacity.

```python
# Create provisioned throughput for the fine-tuned model
response = bedrock.create_provisioned_model_throughput(
    modelUnits=1,
    provisionedModelName='medical-summarization-prod',
    modelId='arn:aws:bedrock:us-east-1:123456789012:custom-model/medical-summarization-model'
)

provisioned_arn = response['provisionedModelArn']
print(f"Provisioned throughput created: {provisioned_arn}")
```

## Invoking Your Fine-Tuned Model

Once provisioned throughput is active, invoke your model just like you would any other Bedrock model.

```python
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

response = bedrock_runtime.invoke_model(
    modelId=provisioned_arn,
    body=json.dumps({
        'inputText': 'Summarize this patient note: 65yo female with acute onset aphasia and right-sided weakness, NIHSS score 14, last known well 1 hour ago.',
        'textGenerationConfig': {
            'maxTokenCount': 256,
            'temperature': 0.2,
            'topP': 0.9
        }
    })
)

result = json.loads(response['body'].read())
print(result['results'][0]['outputText'])
```

## Hyperparameter Tuning Tips

Getting the hyperparameters right can make or break your fine-tuning results. Here's what I've found works well:

- **Learning rate**: Start low (1e-5 to 5e-5). Too high and you'll overfit or destabilize the model.
- **Epochs**: 2-4 is usually the sweet spot. More epochs risks overfitting on small datasets.
- **Batch size**: Larger batches train faster but may miss nuances. Start with 8 and adjust.
- **Warmup steps**: A short warmup (5-10% of total steps) helps stabilize early training.

Run multiple jobs with different hyperparameters and compare validation loss to find the best configuration.

## Cost Considerations

Fine-tuning costs depend on the base model, dataset size, and number of epochs. Provisioned throughput has an hourly cost that runs whether you're using it or not. For pricing comparisons across different Bedrock models, check out our post on [comparing Amazon Bedrock model pricing](https://oneuptime.com/blog/post/2026-02-12-compare-amazon-bedrock-model-pricing/view).

Plan your provisioned throughput carefully. If you only need the model during business hours, consider automating the creation and deletion of provisioned throughput to save costs.

Fine-tuning on Bedrock removes most of the infrastructure headaches that come with traditional model training. You don't have to manage GPUs, deal with distributed training, or handle model serving. Focus on your data quality and hyperparameter choices, and let AWS handle the rest.
