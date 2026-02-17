# How to Deploy a Custom-Trained Model to a Vertex AI Endpoint for Online Predictions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Model Deployment, Online Predictions, Machine Learning

Description: Learn how to deploy a custom-trained machine learning model to a Vertex AI endpoint and serve real-time predictions with code examples.

---

You have trained a model, tuned it, and it performs well on your test set. Now what? You need to get it into production where it can serve predictions to your application. Vertex AI endpoints let you do exactly that - deploy your model behind a managed REST API that handles scaling, monitoring, and traffic management for you.

In this guide, I will walk through the full workflow: uploading your model, creating an endpoint, deploying the model to it, and making predictions.

## The Deployment Workflow

The deployment process in Vertex AI has three distinct steps:

1. Upload your trained model to the Vertex AI Model Registry
2. Create an endpoint (which is essentially a managed serving infrastructure)
3. Deploy the model to the endpoint

This separation is intentional. You can deploy multiple model versions to the same endpoint and split traffic between them, which is great for A/B testing and canary deployments.

## Step 1: Upload Your Model

Your trained model needs to be in a GCS bucket. The format depends on the framework - for TensorFlow, it is a SavedModel directory; for scikit-learn, it is a joblib or pickle file.

Here is how to upload a TensorFlow model to the Model Registry:

```python
# upload_model.py
# Uploads a trained model to Vertex AI Model Registry

from google.cloud import aiplatform

# Initialize the SDK with your project details
aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Upload the model from GCS to Model Registry
model = aiplatform.Model.upload(
    display_name='my-classification-model',
    # Path to your saved model in GCS
    artifact_uri='gs://your-bucket/models/classification-model/',
    # Pre-built serving container for TensorFlow
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-14:latest',
    # Optional: define the prediction route and health check
    serving_container_predict_route='/v1/models/default:predict',
    serving_container_health_route='/v1/models/default',
    description='Image classification model trained on custom dataset',
)

print(f"Model uploaded: {model.resource_name}")
print(f"Model ID: {model.name}")
```

## Step 2: Create an Endpoint

An endpoint is a managed resource that serves predictions. You create it once and then deploy models to it.

```python
# create_endpoint.py
# Creates a Vertex AI endpoint for serving predictions

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create the endpoint
endpoint = aiplatform.Endpoint.create(
    display_name='classification-endpoint',
    description='Endpoint for the image classification model',
    # Optional: enable request logging
    enable_request_response_logging=True,
)

print(f"Endpoint created: {endpoint.resource_name}")
print(f"Endpoint ID: {endpoint.name}")
```

## Step 3: Deploy the Model to the Endpoint

Now connect the model to the endpoint. This is where you specify the machine type, GPU, and scaling configuration.

```python
# deploy_model.py
# Deploys a model to a Vertex AI endpoint

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get references to the model and endpoint
model = aiplatform.Model('projects/your-project-id/locations/us-central1/models/MODEL_ID')
endpoint = aiplatform.Endpoint('projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID')

# Deploy the model to the endpoint
model.deploy(
    endpoint=endpoint,
    # Machine configuration
    machine_type='n1-standard-4',
    # Add a GPU for faster inference
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    # Minimum number of replicas (set to 1 to always have a warm instance)
    min_replica_count=1,
    # Maximum replicas for autoscaling
    max_replica_count=5,
    # Traffic percentage (100% to this model version)
    traffic_percentage=100,
    # How long to wait for the deployment
    deploy_request_timeout=1200,
)

print("Model deployed successfully")
```

## The All-in-One Approach

If you want to do everything in a single script, you can chain the steps together:

```python
# full_deployment.py
# Complete workflow: upload model, create endpoint, and deploy

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Upload the model
model = aiplatform.Model.upload(
    display_name='my-classification-model',
    artifact_uri='gs://your-bucket/models/classification-model/',
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-14:latest',
)

# Create an endpoint
endpoint = aiplatform.Endpoint.create(
    display_name='classification-endpoint',
)

# Deploy the model to the endpoint
model.deploy(
    endpoint=endpoint,
    machine_type='n1-standard-4',
    min_replica_count=1,
    max_replica_count=3,
    traffic_percentage=100,
)

print(f"Endpoint resource name: {endpoint.resource_name}")
```

## Making Online Predictions

Once deployed, you can send prediction requests to the endpoint:

```python
# predict.py
# Sends a prediction request to the deployed model

from google.cloud import aiplatform
import numpy as np

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the endpoint
endpoint = aiplatform.Endpoint('projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID')

# Prepare your input data - this depends on your model's expected input format
# For a TensorFlow model expecting image data as a list of floats
test_instance = np.random.rand(28, 28, 1).tolist()

# Send prediction request
response = endpoint.predict(instances=[test_instance])

# Parse the predictions
predictions = response.predictions
print(f"Predictions: {predictions}")
print(f"Deployed model ID: {response.deployed_model_id}")
```

You can also use the REST API directly with curl:

```bash
# Send a prediction request using curl
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID:predict" \
  -d '{
    "instances": [[0.1, 0.2, 0.3, 0.4, 0.5]]
  }'
```

## Traffic Splitting Between Model Versions

One of the powerful features of Vertex AI endpoints is traffic splitting. You can deploy multiple models to the same endpoint and control how traffic is distributed:

```python
# traffic_split.py
# Deploy a new model version alongside the existing one

from google.cloud import aiplatform

aiplatform.init(project='your-project-id', location='us-central1')

endpoint = aiplatform.Endpoint('projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID')

# Upload the new model version
new_model = aiplatform.Model.upload(
    display_name='my-classification-model-v2',
    artifact_uri='gs://your-bucket/models/classification-model-v2/',
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-14:latest',
)

# Deploy the new model with 20% of traffic (canary deployment)
new_model.deploy(
    endpoint=endpoint,
    machine_type='n1-standard-4',
    min_replica_count=1,
    max_replica_count=3,
    # Only send 20% of traffic to the new version
    traffic_percentage=20,
)

print("Canary deployment complete - new model receiving 20% of traffic")
```

## Choosing the Right Machine Type

The machine type you choose affects both cost and latency. Here are some guidelines:

For CPU-only inference (simpler models, lower throughput requirements), `n1-standard-2` or `n1-standard-4` work well. They are cheaper and sufficient for many use cases.

For GPU-accelerated inference (deep learning models, high throughput), add an NVIDIA T4 or L4 GPU. The T4 gives a good balance between cost and performance.

For very large models or high-throughput scenarios, consider `n1-highmem-8` with multiple GPUs.

Start with a smaller machine and scale up based on your latency and throughput requirements.

## Monitoring Your Deployed Model

Vertex AI provides built-in monitoring. You can check prediction latency, error rates, and traffic volume in the Cloud Console. You can also set up model monitoring to detect data drift and prediction skew:

```python
# Set up model monitoring
from google.cloud import aiplatform

# Create a monitoring job for your endpoint
monitoring_job = aiplatform.ModelDeploymentMonitoringJob.create(
    display_name='classification-model-monitoring',
    endpoint=endpoint,
    logging_sampling_strategy={'random_sample_config': {'sample_rate': 0.1}},
    schedule_config={'monitor_interval': {'seconds': 3600}},
)
```

## Cleaning Up

Do not forget to clean up resources when you no longer need them. Endpoints with deployed models incur charges even when not receiving traffic:

```python
# Undeploy and delete resources
endpoint.undeploy_all()
endpoint.delete()
model.delete()
```

## Wrapping Up

Deploying models to Vertex AI endpoints gives you a production-ready serving infrastructure without managing servers. The three-step process of uploading, creating an endpoint, and deploying keeps things modular, and features like traffic splitting make it easy to roll out new model versions safely. Start with a simple deployment, add monitoring, and then experiment with traffic splitting as you iterate on your models.
