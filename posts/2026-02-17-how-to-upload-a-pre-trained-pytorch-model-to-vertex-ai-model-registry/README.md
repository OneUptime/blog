# How to Upload a Pre-Trained PyTorch Model to Vertex AI Model Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, PyTorch, Model Registry, Machine Learning

Description: Step-by-step guide to uploading a pre-trained PyTorch model to the Vertex AI Model Registry for serving and version management.

---

PyTorch has become one of the most popular frameworks for training deep learning models, especially in research and NLP. But getting a PyTorch model from your local development environment into a production-ready serving infrastructure can be tricky. Vertex AI Model Registry provides a clean path for this - you package your model, upload it, and then deploy it to an endpoint for predictions.

This guide walks through the entire process of preparing a PyTorch model and getting it registered in Vertex AI.

## Preparing Your PyTorch Model

Before uploading, you need to save your model in a format that the Vertex AI serving container understands. For PyTorch, this means either using TorchScript or saving the model archive using the standard PyTorch save convention.

Here is how to save a model using TorchScript, which is the recommended approach for production:

```python
# save_model.py
# Save a PyTorch model as TorchScript for Vertex AI

import torch
import torch.nn as nn

# Define your model architecture
class ImageClassifier(nn.Module):
    def __init__(self, num_classes=10):
        super(ImageClassifier, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
        )
        self.classifier = nn.Sequential(
            nn.Linear(128 * 8 * 8, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

# Create model and load trained weights
model = ImageClassifier(num_classes=10)
model.load_state_dict(torch.load('trained_weights.pth'))
model.eval()

# Convert to TorchScript using tracing
example_input = torch.randn(1, 3, 32, 32)
traced_model = torch.jit.trace(model, example_input)

# Save the traced model
traced_model.save('model.pt')
print("Model saved as TorchScript")
```

## Creating a Custom Model Handler

Vertex AI pre-built PyTorch containers use TorchServe under the hood. You need to create a handler that defines how to preprocess inputs, run inference, and postprocess outputs.

Here is a custom handler:

```python
# handler.py
# Custom TorchServe handler for the image classifier

import torch
import json
import base64
import io
from PIL import Image
from torchvision import transforms
from ts.torch_handler.base_handler import BaseHandler

class ImageClassifierHandler(BaseHandler):
    """Custom handler for the image classification model."""

    def __init__(self):
        super().__init__()
        self.transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
        ])
        # Class labels
        self.classes = [
            'airplane', 'automobile', 'bird', 'cat', 'deer',
            'dog', 'frog', 'horse', 'ship', 'truck'
        ]

    def preprocess(self, data):
        """Preprocess the input data - expects base64-encoded images."""
        images = []
        for row in data:
            # Get the image data from the request
            image_data = row.get('data') or row.get('body')
            if isinstance(image_data, str):
                image_data = base64.b64decode(image_data)

            # Convert to PIL Image and apply transforms
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            tensor = self.transform(image)
            images.append(tensor)

        return torch.stack(images)

    def inference(self, data):
        """Run inference on the preprocessed data."""
        with torch.no_grad():
            outputs = self.model(data)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
        return probabilities

    def postprocess(self, data):
        """Convert model outputs to a readable format."""
        results = []
        for probs in data:
            # Get top prediction
            top_prob, top_idx = torch.max(probs, 0)
            result = {
                'predicted_class': self.classes[top_idx.item()],
                'confidence': top_prob.item(),
                'all_probabilities': {
                    self.classes[i]: probs[i].item()
                    for i in range(len(self.classes))
                }
            }
            results.append(result)
        return results
```

## Packaging the Model for TorchServe

TorchServe expects a Model Archive (.mar) file. Use the `torch-model-archiver` tool to create one:

```bash
# Install the model archiver tool
pip install torch-model-archiver

# Create the model archive
torch-model-archiver \
  --model-name image-classifier \
  --version 1.0 \
  --serialized-file model.pt \
  --handler handler.py \
  --export-path model-store/ \
  --force

# This creates model-store/image-classifier.mar
```

## Uploading Model Artifacts to GCS

Upload the model archive to a GCS bucket:

```bash
# Create the GCS directory structure
gsutil mkdir gs://your-bucket/models/image-classifier/1/

# Upload the model archive file
gsutil cp model-store/image-classifier.mar gs://your-bucket/models/image-classifier/1/
```

## Registering in Vertex AI Model Registry

Now register the model using the Python SDK:

```python
# register_pytorch_model.py
# Register the PyTorch model in Vertex AI Model Registry

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Upload the model to the registry
model = aiplatform.Model.upload(
    display_name='image-classifier-pytorch',
    description='PyTorch image classifier trained on CIFAR-10',
    # GCS path containing the model archive
    artifact_uri='gs://your-bucket/models/image-classifier/1/',
    # Pre-built PyTorch serving container
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/pytorch-gpu.2-1:latest',
    # TorchServe specific configuration
    serving_container_environment_variables={
        'TS_DEFAULT_WORKERS_PER_MODEL': '1',
    },
    labels={
        'framework': 'pytorch',
        'model-type': 'image-classifier',
        'dataset': 'cifar10',
    },
)

print(f"Model registered: {model.resource_name}")
print(f"Model ID: {model.name}")
```

## Alternative: Using the Simple PyTorch Save Format

If you do not want to deal with TorchServe and model archives, you can use a simpler approach with a custom container. Save your model using PyTorch's standard save:

```python
# simple_save.py
# Save model weights and architecture info

import torch

# Save the full model (architecture + weights)
torch.save(model, 'model.pth')

# Or save just the state dict (recommended)
torch.save({
    'model_state_dict': model.state_dict(),
    'model_config': {
        'num_classes': 10,
        'input_channels': 3,
    },
}, 'model_checkpoint.pth')
```

Then create a simple Flask serving application:

```python
# serve.py
# Simple Flask server for PyTorch model inference

from flask import Flask, request, jsonify
import torch
import numpy as np

app = Flask(__name__)

# Load model at startup
checkpoint = torch.load('model_checkpoint.pth')
model = ImageClassifier(num_classes=checkpoint['model_config']['num_classes'])
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

@app.route('/predict', methods=['POST'])
def predict():
    """Handle prediction requests."""
    data = request.json
    instances = data.get('instances', [])

    # Convert input to tensor
    input_tensor = torch.tensor(instances, dtype=torch.float32)

    # Run inference
    with torch.no_grad():
        outputs = model(input_tensor)
        predictions = torch.softmax(outputs, dim=1).tolist()

    return jsonify({'predictions': predictions})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Deploying the Registered Model

Once the model is in the registry, deploying it to an endpoint is straightforward:

```python
# deploy.py
# Deploy the registered PyTorch model to an endpoint

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the model from the registry
model = aiplatform.Model('projects/your-project-id/locations/us-central1/models/MODEL_ID')

# Create an endpoint and deploy
endpoint = model.deploy(
    machine_type='n1-standard-4',
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    min_replica_count=1,
    max_replica_count=3,
)

print(f"Model deployed to: {endpoint.resource_name}")
```

## Uploading a New Version

When you retrain your model, upload it as a new version under the same parent:

```python
# new_version.py
# Register a new version of the PyTorch model

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Upload as a new version
new_version = aiplatform.Model.upload(
    display_name='image-classifier-pytorch',
    parent_model='projects/your-project-id/locations/us-central1/models/MODEL_ID',
    artifact_uri='gs://your-bucket/models/image-classifier/2/',
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/pytorch-gpu.2-1:latest',
    version_description='Retrained with data augmentation, +3% accuracy improvement',
    labels={
        'framework': 'pytorch',
        'version': 'v2',
    },
)

print(f"New version: {new_version.version_id}")
```

## Common Issues

The most common issue is a mismatch between the model format and what the serving container expects. If you use the pre-built PyTorch container, make sure you have a proper .mar file. If you use a custom container, make sure the predict and health routes match what you specified during registration.

Another frequent problem is forgetting to include all dependencies. If your model handler imports custom modules, they need to be included in the model archive.

## Wrapping Up

Getting a PyTorch model into the Vertex AI Model Registry involves packaging your model correctly, uploading the artifacts to GCS, and registering them with the right serving container. The TorchServe approach with model archives is the most production-ready path, but the custom container approach gives you more flexibility. Either way, once your model is in the registry, you get versioning, deployment, and management for free.
