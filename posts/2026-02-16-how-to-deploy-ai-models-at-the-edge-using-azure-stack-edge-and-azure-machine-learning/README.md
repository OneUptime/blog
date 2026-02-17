# How to Deploy AI Models at the Edge Using Azure Stack Edge and Azure Machine Learning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Stack Edge, Azure Machine Learning, Edge AI, Model Deployment, IoT Edge, Inferencing, Edge Computing

Description: Learn how to deploy machine learning models to Azure Stack Edge devices for low-latency AI inferencing at the edge without constant cloud connectivity.

---

Running AI models in the cloud works well when you have reliable, low-latency connectivity. But many real-world scenarios require inference at the edge - manufacturing quality inspection where millisecond latency matters, remote locations with unreliable internet, or situations where sending raw data to the cloud is impractical due to bandwidth or privacy constraints. Azure Stack Edge provides GPU-accelerated hardware at the edge, and Azure Machine Learning provides the tooling to train models in the cloud and deploy them to these edge devices. This guide covers the complete workflow from model training to edge deployment.

## Why Edge AI

The case for edge AI comes down to a few key factors:

**Latency**: A camera on a manufacturing line needs to detect defects in real time. Sending every frame to the cloud for inference adds 50-200ms of round-trip latency, which is too slow for real-time quality control. Running the model locally on an edge device gives you sub-10ms inference times.

**Bandwidth**: A factory with 50 cameras generating 30 frames per second each produces roughly 4.5 GB per minute of raw video data. Sending all of that to the cloud is expensive and often impractical. Running inference at the edge means you only send results and flagged images.

**Connectivity**: Remote sites like oil rigs, mines, and rural facilities may have intermittent or limited connectivity. Edge AI keeps your models running even when the cloud connection is down.

**Privacy**: In healthcare and other regulated industries, sending raw patient data or sensitive images to the cloud may not be allowed. Edge processing keeps the data on-premises.

## Prerequisites

- An Azure Stack Edge Pro device (with GPU) deployed and configured
- Azure Machine Learning workspace
- Azure IoT Hub for device management
- Python 3.8+ with the Azure ML SDK
- A trained machine learning model (we will use a simple image classification model for this guide)

## Step 1: Train a Model in Azure Machine Learning

First, train your model in the cloud using Azure ML:

```python
# train_model.py
# Train an image classification model using Azure Machine Learning
from azure.ai.ml import MLClient
from azure.ai.ml.entities import Environment, CommandJob
from azure.identity import DefaultAzureCredential

# Connect to the Azure ML workspace
credential = DefaultAzureCredential()
ml_client = MLClient(
    credential=credential,
    subscription_id="your-subscription-id",
    resource_group_name="rg-ml-production",
    workspace_name="aml-workspace"
)

# Define the training environment with GPU support
env = Environment(
    name="edge-model-training",
    image="mcr.microsoft.com/azureml/openmpi4.1.0-cuda11.8-cudnn8-ubuntu22.04:latest",
    conda_file="conda_env.yml"
)

# Submit the training job
training_job = CommandJob(
    code="./training_scripts",
    command="python train.py --data-path ${{inputs.training_data}} --epochs 50 --output-dir ${{outputs.model}}",
    environment=env,
    compute="gpu-cluster",
    inputs={
        "training_data": ml_client.data.get("defect-detection-images", version="1")
    },
    outputs={
        "model": {"type": "uri_folder"}
    },
    display_name="defect-detection-training"
)

# Submit and wait for completion
returned_job = ml_client.jobs.create_or_update(training_job)
print(f"Training job submitted: {returned_job.name}")
```

The training script itself (train.py):

```python
# train.py
# PyTorch training script for defect detection
import torch
import torch.nn as nn
from torchvision import models, transforms
from torch.utils.data import DataLoader
import argparse
import os

def train(data_path, epochs, output_dir):
    """Train a ResNet-based defect detection model."""
    # Use a pretrained ResNet18 and fine-tune for defect detection
    model = models.resnet18(pretrained=True)

    # Replace the final layer for binary classification (defect/no-defect)
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, 2)

    # Move to GPU if available
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)

    # Define transforms for input images
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                           std=[0.229, 0.224, 0.225])
    ])

    # Load training data
    dataset = torchvision.datasets.ImageFolder(data_path, transform=transform)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True, num_workers=4)

    # Training loop
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0

        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

        avg_loss = running_loss / len(dataloader)
        print(f"Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}")

    # Save the model in ONNX format for edge deployment
    # ONNX provides better cross-platform compatibility at the edge
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    onnx_path = os.path.join(output_dir, "defect_detector.onnx")

    torch.onnx.export(
        model, dummy_input, onnx_path,
        opset_version=13,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}}
    )
    print(f"Model saved to {onnx_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-path", type=str, required=True)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--output-dir", type=str, required=True)
    args = parser.parse_args()

    train(args.data_path, args.epochs, args.output_dir)
```

## Step 2: Register the Model

After training, register the model in Azure ML for versioning and deployment tracking:

```python
# register_model.py
# Register the trained model in Azure ML
from azure.ai.ml.entities import Model
from azure.ai.ml.constants import AssetTypes

model = Model(
    path="outputs/defect_detector.onnx",
    name="defect-detector",
    description="Defect detection model for manufacturing quality inspection",
    type=AssetTypes.CUSTOM_MODEL,
    tags={
        "framework": "pytorch",
        "format": "onnx",
        "target": "edge"
    }
)

registered_model = ml_client.models.create_or_update(model)
print(f"Model registered: {registered_model.name} v{registered_model.version}")
```

## Step 3: Package the Model as a Docker Container

For edge deployment, package the model and inference code into a Docker container:

```python
# score.py
# Inference script that runs on the edge device
import onnxruntime as ort
import numpy as np
from PIL import Image
import io
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

# Load the ONNX model at startup
session = ort.InferenceSession(
    "/models/defect_detector.onnx",
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
)

def preprocess_image(image_bytes):
    """Preprocess an image for model inference."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((224, 224))

    # Convert to numpy array and normalize
    img_array = np.array(image).astype(np.float32) / 255.0
    img_array = (img_array - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]

    # Transpose from HWC to CHW format and add batch dimension
    img_array = np.transpose(img_array, (2, 0, 1))
    img_array = np.expand_dims(img_array, axis=0)

    return img_array


@app.route("/predict", methods=["POST"])
def predict():
    """Run inference on an uploaded image."""
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_bytes = request.files["image"].read()
    input_data = preprocess_image(image_bytes)

    # Run ONNX inference
    input_name = session.get_inputs()[0].name
    result = session.run(None, {input_name: input_data})

    # Interpret results
    probabilities = np.softmax(result[0][0])
    prediction = "defect" if np.argmax(probabilities) == 1 else "no_defect"
    confidence = float(np.max(probabilities))

    return jsonify({
        "prediction": prediction,
        "confidence": confidence,
        "probabilities": {
            "no_defect": float(probabilities[0]),
            "defect": float(probabilities[1])
        }
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

Create the Dockerfile:

```dockerfile
# Dockerfile for edge inference
FROM nvcr.io/nvidia/cuda:11.8.0-runtime-ubuntu22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Install inference dependencies
RUN pip3 install onnxruntime-gpu==1.16.0 flask numpy Pillow

# Copy the model and inference code
COPY defect_detector.onnx /models/
COPY score.py /app/

WORKDIR /app

# Expose the inference endpoint
EXPOSE 5001

# Run the inference server
CMD ["python3", "score.py"]
```

Build and push the container to Azure Container Registry:

```bash
# Build and push the inference container
ACR_NAME="acredgemodels"

az acr build \
    --registry $ACR_NAME \
    --image defect-detector:v1 \
    --file Dockerfile \
    .
```

## Step 4: Deploy to Azure Stack Edge via IoT Edge

Azure Stack Edge runs IoT Edge, which manages container deployments. Create an IoT Edge deployment manifest:

```json
{
    "modulesContent": {
        "$edgeAgent": {
            "properties.desired": {
                "modules": {
                    "defect-detector": {
                        "type": "docker",
                        "status": "running",
                        "restartPolicy": "always",
                        "settings": {
                            "image": "acredgemodels.azurecr.io/defect-detector:v1",
                            "createOptions": {
                                "HostConfig": {
                                    "DeviceRequests": [
                                        {
                                            "Count": 1,
                                            "Capabilities": [["gpu"]]
                                        }
                                    ],
                                    "PortBindings": {
                                        "5001/tcp": [{"HostPort": "5001"}]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "$edgeHub": {
            "properties.desired": {
                "routes": {
                    "defectResults": "FROM /messages/modules/defect-detector/outputs/* INTO $upstream"
                }
            }
        }
    }
}
```

Deploy the module:

```bash
# Deploy the model to the Azure Stack Edge device via IoT Hub
IOT_HUB_NAME="iot-factory-hub"
DEVICE_ID="stack-edge-factory-01"

az iot edge set-modules \
    --hub-name $IOT_HUB_NAME \
    --device-id $DEVICE_ID \
    --content deployment-manifest.json
```

## Step 5: Test the Edge Deployment

Once the module is running on the Azure Stack Edge device, test inference:

```bash
# Test inference from a machine on the same network as the edge device
EDGE_DEVICE_IP="10.0.1.100"

curl -X POST \
    "http://${EDGE_DEVICE_IP}:5001/predict" \
    -F "image=@test-image.jpg" \
    | jq .
```

Expected response:

```json
{
    "prediction": "defect",
    "confidence": 0.94,
    "probabilities": {
        "no_defect": 0.06,
        "defect": 0.94
    }
}
```

## Step 6: Update Models Without Downtime

When you retrain the model, update the edge deployment:

```bash
# Build a new version of the container with the updated model
az acr build \
    --registry $ACR_NAME \
    --image defect-detector:v2 \
    .

# Update the IoT Edge deployment to use the new version
# Modify the deployment manifest to reference v2 and redeploy
az iot edge set-modules \
    --hub-name $IOT_HUB_NAME \
    --device-id $DEVICE_ID \
    --content deployment-manifest-v2.json
```

IoT Edge handles the rolling update - it pulls the new container, starts it, and stops the old one. There is a brief interruption during the switch, so if you need truly zero-downtime updates, run two inference modules behind a local load balancer.

## Monitoring Edge Model Performance

Track model performance from the edge:

```python
# monitor_edge.py
# Send inference metrics from the edge to IoT Hub for cloud monitoring
import json
from azure.iot.device import IoTHubModuleClient, Message

client = IoTHubModuleClient.create_from_edge_environment()

def report_inference_metrics(prediction, confidence, latency_ms):
    """Send inference metrics to IoT Hub for monitoring."""
    metrics = {
        "prediction": prediction,
        "confidence": confidence,
        "inferenceLatencyMs": latency_ms,
        "modelVersion": "v1",
        "deviceId": "stack-edge-factory-01"
    }

    message = Message(json.dumps(metrics))
    message.content_type = "application/json"
    message.content_encoding = "utf-8"

    # Route to the cloud for aggregation and monitoring
    client.send_message_to_output(message, "metrics")
```

## Summary

Deploying AI models at the edge with Azure Stack Edge and Azure Machine Learning follows a clear pipeline: train in the cloud, package as a container, deploy via IoT Edge. The GPU on Azure Stack Edge provides hardware-accelerated inference for real-time workloads like manufacturing quality inspection, video analytics, and anomaly detection. The ONNX format provides efficient cross-platform inference, and the IoT Edge runtime handles deployment, monitoring, and updates. This architecture gives you the benefits of cloud ML training with the low-latency, high-bandwidth, and always-available characteristics of edge computing.
