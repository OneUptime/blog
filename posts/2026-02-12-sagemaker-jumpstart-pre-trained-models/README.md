# How to Use SageMaker JumpStart for Pre-Trained Models

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, Pre-Trained Models, Transfer Learning, Machine Learning

Description: Get started quickly with Amazon SageMaker JumpStart to deploy pre-trained models, fine-tune foundation models, and use ready-made ML solutions.

---

Building a model from scratch is sometimes necessary, but it's rarely the fastest path to a working solution. SageMaker JumpStart gives you access to hundreds of pre-trained models that you can deploy with a few lines of code or fine-tune on your own data. It's like an app store for ML models - browse, pick one, and get it running in minutes.

This guide shows you how to find, deploy, and fine-tune models from JumpStart.

## What's in JumpStart?

JumpStart offers three types of resources:

1. **Foundation models** - Large language models, image generators, and embedding models (like Llama, Falcon, Stable Diffusion)
2. **Task-specific models** - Pre-trained models for common tasks (text classification, object detection, summarization)
3. **Solution templates** - End-to-end ML solutions for specific use cases (fraud detection, demand forecasting)

The model catalog is extensive. Let's see what's available.

```python
import sagemaker
from sagemaker.jumpstart.notebook_utils import list_jumpstart_models

session = sagemaker.Session()
region = session.boto_region_name

# List available model families
model_ids = list_jumpstart_models()
print(f"Total available models: {len(model_ids)}")

# Filter for specific tasks
text_models = [m for m in model_ids if 'text' in m.lower()]
vision_models = [m for m in model_ids if 'image' in m.lower() or 'vision' in m.lower()]
llm_models = [m for m in model_ids if 'llama' in m.lower() or 'falcon' in m.lower()]

print(f"Text models: {len(text_models)}")
print(f"Vision models: {len(vision_models)}")
print(f"LLM models: {len(llm_models)}")
```

## Deploying a Pre-Trained Model

Let's deploy a text embedding model. This is useful for building search systems, recommendations, or clustering text data.

```python
from sagemaker.jumpstart.model import JumpStartModel

# Deploy a text embedding model
model_id = 'huggingface-sentencesimilarity-all-MiniLM-L6-v2'

model = JumpStartModel(
    model_id=model_id,
    role=sagemaker.get_execution_role(),
    sagemaker_session=session
)

# Deploy the model
predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge',
    endpoint_name='text-embeddings'
)

# Test it
import json

payload = {
    'text_inputs': [
        'How do I reset my password?',
        'I forgot my login credentials',
        'What are the pricing plans?'
    ]
}

response = predictor.predict(payload)
embeddings = response['embedding']

print(f"Generated {len(embeddings)} embeddings, each with {len(embeddings[0])} dimensions")
```

## Deploying a Foundation Model

JumpStart makes it easy to deploy large language models. Let's deploy a Llama model.

```python
from sagemaker.jumpstart.model import JumpStartModel

# Deploy Meta's Llama model
model_id = 'meta-textgeneration-llama-2-7b-f'

llm_model = JumpStartModel(
    model_id=model_id,
    role=sagemaker.get_execution_role(),
    sagemaker_session=session
)

# LLMs need GPU instances
predictor = llm_model.deploy(
    initial_instance_count=1,
    instance_type='ml.g5.2xlarge',
    endpoint_name='llama-2-7b'
)

# Generate text
payload = {
    'inputs': 'Explain the concept of transfer learning in machine learning in simple terms:',
    'parameters': {
        'max_new_tokens': 256,
        'temperature': 0.7,
        'top_p': 0.9
    }
}

response = predictor.predict(payload)
print(response[0]['generated_text'])
```

## Deploying an Image Classification Model

JumpStart has pre-trained vision models for image tasks.

```python
from sagemaker.jumpstart.model import JumpStartModel

# Deploy an image classification model (ResNet)
model_id = 'pytorch-ic-resnet50'

vision_model = JumpStartModel(
    model_id=model_id,
    role=sagemaker.get_execution_role(),
    sagemaker_session=session
)

predictor = vision_model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge',
    endpoint_name='image-classifier'
)

# Classify an image
import boto3

# Read an image file
with open('test_image.jpg', 'rb') as f:
    image_bytes = f.read()

# Send to the endpoint
runtime = boto3.client('sagemaker-runtime')
response = runtime.invoke_endpoint(
    EndpointName='image-classifier',
    ContentType='application/x-image',
    Body=image_bytes
)

predictions = json.loads(response['Body'].read().decode())
print("Top 5 predictions:")
for label, score in sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:5]:
    print(f"  {label}: {score:.4f}")
```

## Fine-Tuning a JumpStart Model

Pre-trained models are good out of the box, but fine-tuning them on your specific data makes them much better. JumpStart makes fine-tuning straightforward.

```python
from sagemaker.jumpstart.estimator import JumpStartEstimator

# Fine-tune a text classification model on your data
model_id = 'huggingface-tc-bert-base-cased'

estimator = JumpStartEstimator(
    model_id=model_id,
    role=sagemaker.get_execution_role(),
    instance_type='ml.p3.2xlarge',    # GPU for fine-tuning
    instance_count=1,
    sagemaker_session=session,
    hyperparameters={
        'epochs': 5,
        'learning_rate': 2e-5,
        'batch_size': 16
    }
)

# Fine-tune on your labeled data
estimator.fit({
    'training': f's3://{session.default_bucket()}/fine-tuning/train.csv'
})

# Deploy the fine-tuned model
fine_tuned_predictor = estimator.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge',
    endpoint_name='fine-tuned-classifier'
)
```

## Fine-Tuning an LLM

Fine-tuning large language models is a common JumpStart use case. Here's how to fine-tune Llama on custom instruction data.

```python
from sagemaker.jumpstart.estimator import JumpStartEstimator

model_id = 'meta-textgeneration-llama-2-7b'

# Prepare training data in the expected format
# Each example should have 'instruction' and 'output' fields
training_data = [
    {
        'instruction': 'Summarize this customer support ticket',
        'input': 'Customer reports that their order #12345 has not arrived...',
        'output': 'Customer #12345 has a missing order that was expected 5 days ago...'
    }
]

# Fine-tune the model
llm_estimator = JumpStartEstimator(
    model_id=model_id,
    role=sagemaker.get_execution_role(),
    instance_type='ml.g5.12xlarge',
    instance_count=1,
    sagemaker_session=session,
    hyperparameters={
        'epochs': 3,
        'learning_rate': 1e-5,
        'instruction_tuned': 'True',
        'max_input_length': 512
    }
)

llm_estimator.fit({
    'training': f's3://{session.default_bucket()}/llm-fine-tuning/train.jsonl'
})
```

## Browsing the Model Catalog

You can explore JumpStart models programmatically to find the right one for your use case.

```python
from sagemaker.jumpstart.notebook_utils import list_jumpstart_models
from sagemaker.jumpstart.model import JumpStartModel

# Search for object detection models
all_models = list_jumpstart_models()
detection_models = [m for m in all_models if 'object-detection' in m or 'od-' in m]

print("Object Detection Models:")
for model_id in detection_models[:10]:
    print(f"  {model_id}")

# Get details about a specific model
model_id = 'pytorch-od-nvidia-ssd'

# Check supported instance types
model = JumpStartModel(model_id=model_id)
print(f"\nModel: {model_id}")
print(f"Default instance type: {model.instance_type}")
```

## Using JumpStart Solutions

JumpStart also provides complete solutions - end-to-end pipelines for common business problems.

```python
# List available solution templates
from sagemaker.jumpstart.notebook_utils import list_jumpstart_models

# Solution examples include:
# - Fraud detection
# - Predictive maintenance
# - Demand forecasting
# - Personalized recommendations
# - Document understanding

# Solutions deploy multiple resources (endpoints, pipelines, etc.)
# and provide sample notebooks for customization
```

## Cost-Effective Deployment

JumpStart models can be expensive to run, especially foundation models. Here are some ways to manage costs:

```python
# Use serverless inference for low-traffic models
from sagemaker.serverless import ServerlessInferenceConfig

serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=4096,
    max_concurrency=5
)

# Only works for smaller models (< 6 GB)
small_model = JumpStartModel(
    model_id='huggingface-sentencesimilarity-all-MiniLM-L6-v2',
    role=sagemaker.get_execution_role()
)

predictor = small_model.deploy(
    serverless_inference_config=serverless_config,
    endpoint_name='embeddings-serverless'
)
```

For larger models, consider the inference options we covered in our [SageMaker inference comparison](https://oneuptime.com/blog/post/sagemaker-real-time-vs-batch-vs-async-inference/view).

## Cleaning Up

Don't forget to delete endpoints you're not using.

```python
# Delete all JumpStart endpoints
predictor.delete_endpoint()
fine_tuned_predictor.delete_endpoint()

# List and clean up any remaining endpoints
client = boto3.client('sagemaker')
response = client.list_endpoints(
    StatusEquals='InService',
    NameContains='jumpstart'
)

for endpoint in response['Endpoints']:
    print(f"Active endpoint: {endpoint['EndpointName']}")
```

## Wrapping Up

JumpStart is the fastest way to get a working ML model on SageMaker. Whether you need a foundation model for text generation, a pre-trained vision model for image classification, or a complete solution template for a business problem, JumpStart has you covered. Start with a pre-trained model, test it against your requirements, and fine-tune if you need better performance. It's a much faster iteration cycle than building from scratch. For production deployments, combine JumpStart models with [Model Registry](https://oneuptime.com/blog/post/sagemaker-model-registry/view) for versioning and [Model Monitor](https://oneuptime.com/blog/post/sagemaker-model-monitor-drift-detection/view) for ongoing quality checks.
