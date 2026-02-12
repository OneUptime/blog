# How to Bring Your Own Model to SageMaker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, Machine Learning, Docker, Model Deployment

Description: Learn how to bring your own custom machine learning models and containers to Amazon SageMaker for training and deployment.

---

SageMaker's built-in algorithms and framework containers cover a lot of ground, but sometimes you need full control. Maybe you have a proprietary model architecture, a custom inference pipeline, or dependencies that don't fit neatly into the standard containers. That's where "Bring Your Own Model" (BYOM) comes in - you package your model and code into a Docker container and run it on SageMaker's managed infrastructure.

This guide shows you how to build custom containers for both training and inference on SageMaker.

## Understanding the Container Contract

SageMaker doesn't care what's inside your container, as long as it follows a specific contract. For training, SageMaker expects your container to read data from certain paths and write model artifacts to a specific location. For inference, it expects your container to serve an HTTP API on port 8080.

```mermaid
graph TB
    subgraph Training Container
        A[/opt/ml/input/data/train] --> B[Your Training Code]
        C[/opt/ml/input/config] --> B
        B --> D[/opt/ml/model/]
    end
    subgraph Inference Container
        E[HTTP POST :8080/invocations] --> F[Your Inference Code]
        G[HTTP GET :8080/ping] --> H[Health Check]
        I[/opt/ml/model/] --> F
    end
```

Here are the key paths SageMaker uses:

- `/opt/ml/input/data/<channel_name>/` - Training data (downloaded from S3)
- `/opt/ml/input/config/` - Training configuration (hyperparameters, etc.)
- `/opt/ml/model/` - Where your training code saves model artifacts
- `/opt/ml/output/` - Any additional output files

## Building a Custom Training Container

Let's build a complete custom training container. We'll use a simple example, but the pattern works for anything.

First, the training script.

```python
# train.py - Custom training script

import os
import json
import sys
import traceback
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
import joblib

# SageMaker paths
prefix = '/opt/ml/'
input_path = os.path.join(prefix, 'input', 'data')
output_path = os.path.join(prefix, 'output')
model_path = os.path.join(prefix, 'model')
param_path = os.path.join(prefix, 'input', 'config', 'hyperparameters.json')

def train():
    """Main training function."""
    try:
        # Read hyperparameters
        with open(param_path, 'r') as f:
            params = json.load(f)

        # SageMaker passes all hyperparameters as strings
        n_estimators = int(params.get('n_estimators', 100))
        max_depth = int(params.get('max_depth', 5))
        learning_rate = float(params.get('learning_rate', 0.1))

        print(f"Hyperparameters: n_estimators={n_estimators}, "
              f"max_depth={max_depth}, learning_rate={learning_rate}")

        # Read training data from the 'train' channel
        train_dir = os.path.join(input_path, 'train')
        train_files = [
            os.path.join(train_dir, f)
            for f in os.listdir(train_dir)
            if f.endswith('.csv')
        ]

        if not train_files:
            raise ValueError("No training data found")

        raw_data = pd.concat([pd.read_csv(f, header=None) for f in train_files])

        # First column is the label
        y_train = raw_data.iloc[:, 0].values
        X_train = raw_data.iloc[:, 1:].values

        print(f"Training on {X_train.shape[0]} samples with {X_train.shape[1]} features")

        # Train the model
        model = GradientBoostingClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            random_state=42
        )
        model.fit(X_train, y_train)

        train_score = model.score(X_train, y_train)
        print(f"Training accuracy: {train_score:.4f}")

        # Save the model to the model directory
        joblib.dump(model, os.path.join(model_path, 'model.joblib'))

        # Save model metadata
        metadata = {
            'n_features': int(X_train.shape[1]),
            'n_classes': int(len(np.unique(y_train))),
            'train_accuracy': float(train_score)
        }
        with open(os.path.join(model_path, 'metadata.json'), 'w') as f:
            json.dump(metadata, f)

        print("Training complete!")

    except Exception as e:
        # Write failure information to the output directory
        trc = traceback.format_exc()
        with open(os.path.join(output_path, 'failure'), 'w') as f:
            f.write(f"Exception during training: {str(e)}\n{trc}")
        print(f"Exception during training: {str(e)}", file=sys.stderr)
        sys.exit(255)

if __name__ == '__main__':
    train()
```

Now the Dockerfile for the training container.

```dockerfile
# Dockerfile.training

FROM python:3.10-slim

# Install dependencies
RUN pip install --no-cache-dir \
    pandas==2.1.0 \
    numpy==1.25.2 \
    scikit-learn==1.3.0 \
    joblib==1.3.2

# Copy training code
COPY train.py /opt/program/train.py

# SageMaker runs the container with "train" as the entrypoint argument
ENV SAGEMAKER_PROGRAM train.py
ENV PATH="/opt/program:${PATH}"

WORKDIR /opt/program

# Make the training script executable
RUN chmod +x /opt/program/train.py

ENTRYPOINT ["python", "/opt/program/train.py"]
```

## Building a Custom Inference Container

The inference container needs to serve an HTTP API. Most people use Flask or FastAPI for this.

```python
# serve.py - Custom inference server

import os
import json
import joblib
import numpy as np
import flask

# Load model at startup
prefix = '/opt/ml/'
model_path = os.path.join(prefix, 'model')

model = None
metadata = None

def load_model():
    """Load the model and metadata from disk."""
    global model, metadata
    model = joblib.load(os.path.join(model_path, 'model.joblib'))

    metadata_file = os.path.join(model_path, 'metadata.json')
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)

    print("Model loaded successfully")

# Create Flask app
app = flask.Flask(__name__)

@app.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint - SageMaker calls this to verify the container is ready."""
    health = model is not None
    status = 200 if health else 404
    return flask.Response(
        response='\n',
        status=status,
        mimetype='application/json'
    )

@app.route('/invocations', methods=['POST'])
def invoke():
    """Prediction endpoint - receives data and returns predictions."""
    try:
        content_type = flask.request.content_type

        if content_type == 'application/json':
            data = flask.request.get_json()
            features = np.array(data['features'])
        elif content_type == 'text/csv':
            lines = flask.request.data.decode('utf-8').strip().split('\n')
            features = np.array([
                [float(v) for v in line.split(',')]
                for line in lines
            ])
        else:
            return flask.Response(
                response=json.dumps({'error': f'Unsupported content type: {content_type}'}),
                status=415,
                mimetype='application/json'
            )

        # Run prediction
        predictions = model.predict(features).tolist()
        probabilities = model.predict_proba(features).tolist()

        result = {
            'predictions': predictions,
            'probabilities': probabilities,
            'model_metadata': metadata
        }

        return flask.Response(
            response=json.dumps(result),
            status=200,
            mimetype='application/json'
        )

    except Exception as e:
        return flask.Response(
            response=json.dumps({'error': str(e)}),
            status=500,
            mimetype='application/json'
        )

if __name__ == '__main__':
    load_model()
    app.run(host='0.0.0.0', port=8080)
```

And the inference Dockerfile.

```dockerfile
# Dockerfile.inference

FROM python:3.10-slim

RUN pip install --no-cache-dir \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    pandas==2.1.0 \
    numpy==1.25.2 \
    scikit-learn==1.3.0 \
    joblib==1.3.2

COPY serve.py /opt/program/serve.py

WORKDIR /opt/program

# SageMaker expects the container to listen on port 8080
EXPOSE 8080

# Use gunicorn for production
ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "--timeout", "60", "serve:app"]
```

## Building and Pushing to ECR

SageMaker pulls containers from Amazon ECR. Here's how to build and push yours.

```bash
# Set variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
REPO_NAME=custom-ml-model

# Create ECR repository
aws ecr create-repository --repository-name ${REPO_NAME}

# Authenticate Docker with ECR
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Build and tag the inference image
docker build -f Dockerfile.inference -t ${REPO_NAME}:latest .
docker tag ${REPO_NAME}:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest

# Push to ECR
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest
```

## Using Your Custom Container

Once the container is in ECR, use it like any other SageMaker container.

```python
import sagemaker
from sagemaker.estimator import Estimator

session = sagemaker.Session()
role = sagemaker.get_execution_role()
account_id = boto3.client('sts').get_caller_identity()['Account']
region = session.boto_region_name

# Your custom container URI
training_image = f'{account_id}.dkr.ecr.{region}.amazonaws.com/custom-ml-model-training:latest'

# Create estimator with your custom container
estimator = Estimator(
    image_uri=training_image,
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    output_path=f's3://{session.default_bucket()}/custom-model-output',
    hyperparameters={
        'n_estimators': '200',
        'max_depth': '8',
        'learning_rate': '0.05'
    }
)

# Train
estimator.fit({
    'train': f's3://{session.default_bucket()}/data/train'
})

# Deploy using the inference container
inference_image = f'{account_id}.dkr.ecr.{region}.amazonaws.com/custom-ml-model:latest'

from sagemaker.model import Model

model = Model(
    image_uri=inference_image,
    model_data=estimator.model_data,
    role=role,
    sagemaker_session=session
)

predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.large',
    endpoint_name='custom-model-endpoint'
)
```

## Testing Locally Before Deploying

Always test your container locally before pushing to SageMaker. It saves a lot of debugging time.

```bash
# Test the training container locally
docker run -v $(pwd)/test_data:/opt/ml/input/data/train \
           -v $(pwd)/test_model:/opt/ml/model \
           -v $(pwd)/test_config:/opt/ml/input/config \
           custom-ml-model-training:latest

# Test the inference container locally
docker run -p 8080:8080 \
           -v $(pwd)/test_model:/opt/ml/model \
           custom-ml-model:latest

# Send a test request
curl -X POST http://localhost:8080/invocations \
     -H "Content-Type: application/json" \
     -d '{"features": [[1.0, 2.0, 3.0, 4.0, 5.0]]}'
```

## Wrapping Up

Bringing your own model to SageMaker gives you the flexibility of custom code with the operational benefits of managed infrastructure. The key is understanding the container contract - where SageMaker puts your data, where it expects your model artifacts, and what HTTP endpoints your inference container needs to expose. Once you have that down, you can containerize virtually anything and run it on SageMaker. For more about deploying models, check out our guide on [deploying model endpoints](https://oneuptime.com/blog/post/deploy-model-endpoint-sagemaker/view).
