# How to Deploy Open-Source Models from Vertex AI Model Garden

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Model Garden, Machine Learning, Open Source

Description: Learn how to deploy open-source machine learning models from Vertex AI Model Garden to endpoints for real-time predictions in Google Cloud.

---

Vertex AI Model Garden is one of those GCP features that can save you weeks of work. Instead of wrangling with model downloads, container images, and infrastructure setup, you get a curated catalog of open models ready to deploy with minimal effort. Whether you need a large language model like Llama, a Stable Diffusion model for image generation, or a specialized NLP model, Model Garden has you covered.

In this guide, I will walk you through deploying open-source models from Model Garden to a Vertex AI endpoint so you can start serving predictions.

## What is Vertex AI Model Garden?

Model Garden is a centralized hub within Vertex AI that provides access to a wide range of models. These include Google's first-party models, third-party models from partners, and open models from the community. The open model section is particularly interesting because it gives you access to popular models like Meta's Llama, Gemma, Hugging Face models, and many more.

The key benefit is that Google handles much of the packaging for self-deployable models. Model Garden model cards show supported deployment options, including verified machine configurations and serving container images where available. You just pick a model, choose your compute, and deploy.

## Prerequisites

Before getting started, make sure you have the following in place:

- A GCP project with billing enabled
- The Vertex AI API enabled
- Sufficient quota for GPU instances (most open-source models need GPUs)
- The Google Cloud CLI installed locally
- Python with the google-cloud-aiplatform library

Here is how to install the required Python library:

```bash
# Install the Vertex AI Python SDK

pip install --upgrade google-cloud-aiplatform
```

## Browsing Models in Model Garden

You can browse Model Garden through the GCP Console or programmatically. In the console, navigate to Vertex AI and then Model Garden in the left sidebar. You can filter the catalog by model type and features, including open models and one-click deployment.

For open models specifically, use the open model and deployment filters. Each model card shows the model name, description, supported tasks, and deployment options.

## Deploying a Model Using the Console

The simplest way to deploy is through the console. Let me walk through deploying a Llama model as an example:

1. Navigate to Vertex AI > Model Garden in the GCP Console
2. Search for the model you want (for example, "Llama")
3. Click on the model card to see its details
4. Click "Deploy model" or "Deploy" to start the deployment workflow
5. Choose your machine type and accelerator (GPU)
6. Configure the endpoint name and traffic split
7. Click "Deploy" and wait for the model to come online

The deployment usually takes 10 to 20 minutes depending on the model size and the machine type you chose.

## Deploying Programmatically with Python

For production workflows, you will want to deploy programmatically. Here is a complete example that deploys an open model from Model Garden:

```python
import vertexai
from vertexai import model_garden

# Initialize the Vertex AI SDK with your project details
vertexai.init(
    project="your-project-id",
    location="us-central1"
)

# Create the Model Garden model object.
open_model = model_garden.OpenModel("google/gemma3@gemma-3-12b-it")

# Optional: inspect the verified deployment options before choosing hardware.
deploy_options = open_model.list_deploy_options()
print(deploy_options)

# Deploy the model to a Vertex AI endpoint with a supported GPU configuration.
endpoint = open_model.deploy(
    machine_type="g2-standard-48",
    accelerator_type="NVIDIA_L4",
    accelerator_count=4,
    accept_eula=True,
)

print(f"Model deployed to endpoint: {endpoint.resource_name}")
```

## Making Predictions

After deployment, you can send prediction requests to your endpoint:

```python
# Send a prediction request to the deployed model
instances = [
    {
        "prompt": "Explain the concept of containerization in simple terms.",
        "max_tokens": 256,
        "temperature": 0.7,
    }
]

# Get the prediction response
response = endpoint.predict(instances=instances)

# Print the generated text
for prediction in response.predictions:
    print(prediction)
```

## Choosing the Right Machine Type

Picking the right hardware is critical. Here is a rough guide for common model sizes:

- Models under 3B parameters: n1-standard-8 with 1x T4 GPU
- Models from 3B to 7B parameters: g2-standard-8 with 1x L4 GPU
- Models from 7B to 13B parameters: g2-standard-24 with 2x L4 GPUs or a2-highgpu-1g with 1x A100
- Models from 13B to 70B parameters: a2-highgpu-2g or larger with multiple A100 GPUs

Keep in mind that quantized versions of models need less memory. A 4-bit quantized 70B model might fit on hardware that a full-precision 13B model requires.

## Cost Optimization Tips

Running GPU instances is not cheap. Here are some practical ways to keep costs down:

First, use autoscaling. Set a minimum replica count that matches your availability needs and let Vertex AI scale up when traffic increases. Scale to zero is available for eligible single-model endpoint deployments through the v1beta1 prediction API, but requests sent while the model is scaled down receive a 429 response while Vertex AI starts replicas.

Second, consider using Spot VMs for batch or non-latency-sensitive workloads. Spot pricing can save you 60 to 90 percent on compute costs.

Third, right-size your instances. Do not use an A100 when an L4 will do. Start with smaller hardware and scale up only if you hit latency or throughput limits.

## Monitoring Your Deployment

Once deployed, use Vertex AI's built-in monitoring to track prediction latency, error rates, and resource utilization. You can also set up alerts using Cloud Monitoring:

```python
# Check endpoint traffic and model health
endpoint_info = endpoint.gca_resource

# Print deployment details including traffic split
for deployed_model in endpoint_info.deployed_models:
    print(f"Model ID: {deployed_model.id}")
    print(f"Display Name: {deployed_model.display_name}")
    print(f"Machine Type: {deployed_model.dedicated_resources.machine_spec.machine_type}")
```

## Cleaning Up

When you are done testing, make sure to undeploy the model and delete the endpoint to avoid ongoing charges:

```python
from google.cloud import aiplatform

aiplatform.init(
    project="your-project-id",
    location="us-central1"
)

# Undeploy the model from the endpoint
endpoint.undeploy_all()

# Delete the endpoint
endpoint.delete()

# Optionally delete the uploaded Model Garden model resource.
# Replace MODEL_ID with the model ID from Model Registry.
model = aiplatform.Model("MODEL_ID")
model.delete()
```

## Wrapping Up

Vertex AI Model Garden takes a lot of the pain out of deploying open-source models. You get verified deployment options, sensible defaults, and seamless integration with the rest of GCP's ML infrastructure. The combination of a curated model catalog with managed deployment infrastructure means you can go from browsing models to serving predictions in under an hour.

For monitoring the health and uptime of your deployed model endpoints, consider using a tool like [OneUptime](https://oneuptime.com) to set up alerts and track availability across your AI infrastructure.
