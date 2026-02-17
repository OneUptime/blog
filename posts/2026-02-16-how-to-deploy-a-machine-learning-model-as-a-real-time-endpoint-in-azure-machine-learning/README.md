# How to Deploy a Machine Learning Model as a Real-Time Endpoint in Azure Machine Learning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Machine Learning, Deployment, Endpoints, Real-Time, MLOps, Inference

Description: Deploy a trained machine learning model as a real-time REST API endpoint in Azure Machine Learning with scoring scripts, managed compute, and monitoring.

---

Training a machine learning model is only half the job. The other half is making that model available to your applications through an API they can call in real time. Azure Machine Learning managed online endpoints let you deploy models as REST APIs with built-in autoscaling, authentication, and monitoring. You do not need to manage servers, containers, or load balancers - Azure handles all of that. In this post, I will walk through deploying a model step by step, from writing the scoring script to testing the live endpoint.

## Deployment Options in Azure ML

Azure ML offers two types of online endpoints:

- **Managed online endpoints**: Azure manages the infrastructure. You specify the VM size and instance count, and Azure handles provisioning, scaling, health checks, and OS patching. This is the recommended option for most scenarios.
- **Kubernetes online endpoints**: You bring your own AKS cluster or Azure Arc-enabled Kubernetes cluster. This gives you more control over the infrastructure but requires more operational overhead.

For this post, I will focus on managed online endpoints.

## Prerequisites

You need:
- An Azure ML workspace
- A trained model (saved as a pickle file, ONNX, MLflow, or other supported format)
- Python 3.9+ with the Azure ML SDK v2

```bash
pip install azure-ai-ml azure-identity
```

## Step 1: Register Your Model

Before deploying, register the model in your workspace. This creates a versioned artifact that can be referenced across multiple deployments.

```python
from azure.ai.ml import MLClient
from azure.ai.ml.entities import Model
from azure.ai.ml.constants import AssetTypes
from azure.identity import DefaultAzureCredential

# Connect to the workspace
credential = DefaultAzureCredential()
ml_client = MLClient(
    credential=credential,
    subscription_id="your-subscription-id",
    resource_group_name="ml-project-rg",
    workspace_name="ml-workspace-production"
)

# Register a local model file
model = Model(
    path="./model/model.pkl",           # Local path to your model file
    name="customer-churn-model",
    description="Gradient boosting classifier for customer churn prediction",
    type=AssetTypes.CUSTOM_MODEL        # Use MLFLOW_MODEL if it is an MLflow model
)

registered_model = ml_client.models.create_or_update(model)
print(f"Registered model: {registered_model.name} version {registered_model.version}")
```

## Step 2: Write the Scoring Script

The scoring script defines how your model processes incoming requests. It must implement two functions: `init()` (called once when the endpoint starts) and `run()` (called for each request).

Create a file called `score.py`:

```python
import json
import joblib
import numpy as np
import os

def init():
    """
    Called once when the endpoint starts up.
    Load the model into memory so it is ready for predictions.
    """
    global model
    # AZUREML_MODEL_DIR is set by Azure ML and points to the model directory
    model_path = os.path.join(os.environ["AZUREML_MODEL_DIR"], "model.pkl")
    model = joblib.load(model_path)
    print(f"Model loaded from {model_path}")

def run(raw_data):
    """
    Called for each prediction request.
    Takes JSON input, runs prediction, and returns JSON output.
    """
    try:
        # Parse the input data
        data = json.loads(raw_data)
        input_array = np.array(data["data"])

        # Run the prediction
        predictions = model.predict(input_array)
        probabilities = model.predict_proba(input_array)

        # Return results as JSON
        result = {
            "predictions": predictions.tolist(),
            "probabilities": probabilities.tolist()
        }
        return json.dumps(result)

    except Exception as e:
        return json.dumps({"error": str(e)})
```

## Step 3: Define the Environment

The environment specifies the Python packages and dependencies your scoring script needs. You can use a curated environment from Azure ML or define a custom one.

Create a `conda.yml` file:

```yaml
name: model-env
channels:
  - conda-forge
dependencies:
  - python=3.9
  - pip
  - pip:
      - numpy>=1.21
      - scikit-learn>=1.0
      - joblib>=1.1
      - azureml-defaults>=1.0
```

Register the environment:

```python
from azure.ai.ml.entities import Environment

# Create a custom environment from a conda specification
env = Environment(
    name="churn-model-env",
    description="Environment for the customer churn prediction model",
    conda_file="./environment/conda.yml",
    image="mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu20.04:latest"  # Base Docker image
)

registered_env = ml_client.environments.create_or_update(env)
print(f"Environment registered: {registered_env.name} version {registered_env.version}")
```

## Step 4: Create the Endpoint

The endpoint is the stable URL that clients call. It can have multiple deployments behind it, which enables blue-green deployment and A/B testing.

```python
from azure.ai.ml.entities import ManagedOnlineEndpoint

# Create the endpoint
endpoint = ManagedOnlineEndpoint(
    name="churn-prediction-v1",          # Must be unique within the region
    description="Real-time customer churn prediction endpoint",
    auth_mode="key",                     # Options: "key" or "aml_token"
    tags={"team": "data-science", "project": "churn"}
)

# This creates the endpoint infrastructure (takes 1-2 minutes)
ml_client.online_endpoints.begin_create_or_update(endpoint).result()
print(f"Endpoint created: {endpoint.name}")
```

## Step 5: Create the Deployment

The deployment binds your model, scoring script, environment, and compute together.

```python
from azure.ai.ml.entities import (
    ManagedOnlineDeployment,
    CodeConfiguration,
    ProbeSettings
)

deployment = ManagedOnlineDeployment(
    name="blue",                                  # Deployment name
    endpoint_name="churn-prediction-v1",
    model=registered_model.id,                    # Reference to registered model
    environment=registered_env.id,                # Reference to registered environment
    code_configuration=CodeConfiguration(
        code="./scoring/",                        # Directory containing score.py
        scoring_script="score.py"
    ),
    instance_type="Standard_DS3_v2",              # VM size
    instance_count=1,                             # Number of instances
    liveness_probe=ProbeSettings(
        initial_delay=30,                         # Wait 30s before first health check
        period=10,                                # Check every 10 seconds
        failure_threshold=3                       # Mark unhealthy after 3 failures
    ),
    readiness_probe=ProbeSettings(
        initial_delay=30,
        period=10,
        failure_threshold=3
    )
)

# Create the deployment (takes 5-10 minutes for the first deployment)
ml_client.online_deployments.begin_create_or_update(deployment).result()

# Route 100% of traffic to this deployment
endpoint.traffic = {"blue": 100}
ml_client.online_endpoints.begin_create_or_update(endpoint).result()

print("Deployment complete. All traffic routed to 'blue' deployment.")
```

## Step 6: Test the Endpoint

Once the deployment is live, test it with a sample request.

```python
import json

# Create a sample request
sample_data = {
    "data": [
        [12, 29.85, 358.20, 1, 0],  # Sample customer features
        [45, 89.10, 4011.50, 2, 1]
    ]
}

# Call the endpoint
response = ml_client.online_endpoints.invoke(
    endpoint_name="churn-prediction-v1",
    request_file=None,
    deployment_name="blue",
    input=json.dumps(sample_data)
)

print(f"Response: {response}")
```

You can also test with curl from the command line:

```bash
# Get the endpoint URL and key
ENDPOINT_URL=$(az ml online-endpoint show \
    --name churn-prediction-v1 \
    --query scoring_uri -o tsv)

ENDPOINT_KEY=$(az ml online-endpoint get-credentials \
    --name churn-prediction-v1 \
    --query primaryKey -o tsv)

# Send a prediction request
curl -X POST "$ENDPOINT_URL" \
    -H "Authorization: Bearer $ENDPOINT_KEY" \
    -H "Content-Type: application/json" \
    -d '{"data": [[12, 29.85, 358.20, 1, 0]]}'
```

## Step 7: Set Up Autoscaling

For production endpoints, configure autoscaling so the deployment scales up during high traffic and scales down when idle.

```python
from azure.ai.ml.entities import OnlineRequestSettings

# Update the deployment with scaling rules
deployment.instance_count = 1  # Minimum instances

# Azure ML supports scaling rules through Azure Monitor autoscale
# Configure through the Azure Portal or CLI:
```

```bash
# Set up autoscaling using Azure CLI
az monitor autoscale create \
    --resource-group ml-project-rg \
    --name churn-autoscale \
    --min-count 1 \
    --max-count 5 \
    --count 1 \
    --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.MachineLearningServices/workspaces/{ws}/onlineEndpoints/churn-prediction-v1/deployments/blue"

# Add a scale-out rule based on CPU usage
az monitor autoscale rule create \
    --resource-group ml-project-rg \
    --autoscale-name churn-autoscale \
    --condition "CpuUtilizationPercentage > 70 avg 5m" \
    --scale out 1
```

## Blue-Green Deployment

When you need to update your model without downtime, use blue-green deployment:

1. Create a new deployment (green) alongside the existing one (blue).
2. Test the green deployment with a small percentage of traffic.
3. Gradually shift traffic from blue to green.
4. Delete the blue deployment once green is validated.

```python
# Route 90% to blue, 10% to green for testing
endpoint.traffic = {"blue": 90, "green": 10}
ml_client.online_endpoints.begin_create_or_update(endpoint).result()

# After validation, shift all traffic to green
endpoint.traffic = {"blue": 0, "green": 100}
ml_client.online_endpoints.begin_create_or_update(endpoint).result()

# Clean up the old deployment
ml_client.online_deployments.begin_delete(
    name="blue",
    endpoint_name="churn-prediction-v1"
).result()
```

## Monitoring Your Endpoint

Azure ML automatically collects metrics for your endpoints. View them in Azure ML Studio or query them through Azure Monitor:

- **Request count and latency** (P50, P90, P99)
- **CPU and memory utilization** per instance
- **Error rates** (4xx and 5xx responses)
- **Model data drift** (if you enable data collection)

Enable data collection to log input and output data for drift detection:

```python
from azure.ai.ml.entities import DataCollector, DeploymentCollection

deployment.data_collector = DataCollector(
    collections={
        "model_inputs": DeploymentCollection(enabled=True),
        "model_outputs": DeploymentCollection(enabled=True)
    }
)
ml_client.online_deployments.begin_create_or_update(deployment).result()
```

## Wrapping Up

Deploying a model as a real-time endpoint in Azure ML involves several pieces: registering the model, writing a scoring script, defining the environment, creating the endpoint, and configuring the deployment. The managed online endpoint option handles the operational complexity for you, so you can focus on the model and the application. For production workloads, add autoscaling, blue-green deployments, and data collection to ensure reliability and maintainability over time.
