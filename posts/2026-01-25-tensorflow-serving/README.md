# How to Implement TensorFlow Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TensorFlow, Model Serving, MLOps, Machine Learning, Production

Description: Learn how to deploy machine learning models with TensorFlow Serving, from basic setup to production-ready configurations with batching, versioning, and monitoring.

---

Training a model is only half the battle. Getting it into production where it can serve predictions at scale requires a different set of tools. TensorFlow Serving is a flexible, high-performance serving system designed for production environments. It handles model versioning, batching, and GPU acceleration out of the box.

## Why TensorFlow Serving?

TensorFlow Serving provides production-grade model serving with:

- Efficient model loading and unloading
- Automatic model versioning and rollback
- Request batching for improved throughput
- gRPC and REST APIs
- GPU acceleration support
- Integration with Kubernetes

## Preparing Your Model

TensorFlow Serving requires models in the SavedModel format. Here is how to export a trained model:

```python
import tensorflow as tf
from tensorflow import keras

# Create a simple model
model = keras.Sequential([
    keras.layers.Dense(64, activation='relu', input_shape=(10,)),
    keras.layers.Dense(32, activation='relu'),
    keras.layers.Dense(1, activation='sigmoid')
])

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Train on sample data
import numpy as np
X_train = np.random.randn(1000, 10)
y_train = np.random.randint(0, 2, 1000)
model.fit(X_train, y_train, epochs=5, verbose=0)

# Save in SavedModel format
# The version number (1) is required for TensorFlow Serving
export_path = "./models/my_model/1"
model.save(export_path)

print(f"Model saved to {export_path}")

# Inspect the saved model
!saved_model_cli show --dir {export_path} --all
```

## Directory Structure

TensorFlow Serving expects models organized with version numbers:

```
models/
  my_model/
    1/                    # Version 1
      saved_model.pb
      variables/
        variables.data-00000-of-00001
        variables.index
    2/                    # Version 2 (newer)
      saved_model.pb
      variables/
```

## Running TensorFlow Serving Locally

The easiest way to run TensorFlow Serving is with Docker:

```bash
# Pull the TensorFlow Serving image
docker pull tensorflow/serving:latest

# Run the server with your model
docker run -p 8501:8501 -p 8500:8500 \
    --mount type=bind,source=$(pwd)/models/my_model,target=/models/my_model \
    -e MODEL_NAME=my_model \
    tensorflow/serving

# Or with GPU support
docker run --gpus all -p 8501:8501 -p 8500:8500 \
    --mount type=bind,source=$(pwd)/models/my_model,target=/models/my_model \
    -e MODEL_NAME=my_model \
    tensorflow/serving:latest-gpu
```

## Making Predictions

### REST API

```python
import requests
import numpy as np
import json

# Prepare input data
input_data = np.random.randn(5, 10).tolist()  # 5 samples, 10 features

# REST API request
response = requests.post(
    "http://localhost:8501/v1/models/my_model:predict",
    json={"instances": input_data}
)

predictions = response.json()["predictions"]
print(f"Predictions: {predictions}")

# Get model metadata
metadata = requests.get("http://localhost:8501/v1/models/my_model/metadata")
print(json.dumps(metadata.json(), indent=2))

# Check model status
status = requests.get("http://localhost:8501/v1/models/my_model")
print(json.dumps(status.json(), indent=2))
```

### gRPC API (Higher Performance)

```python
import grpc
import numpy as np
from tensorflow_serving.apis import predict_pb2
from tensorflow_serving.apis import prediction_service_pb2_grpc
import tensorflow as tf

# Create gRPC channel
channel = grpc.insecure_channel("localhost:8500")
stub = prediction_service_pb2_grpc.PredictionServiceStub(channel)

# Prepare request
request = predict_pb2.PredictRequest()
request.model_spec.name = "my_model"
request.model_spec.signature_name = "serving_default"

# Add input data
input_data = np.random.randn(5, 10).astype(np.float32)
request.inputs["dense_input"].CopyFrom(
    tf.make_tensor_proto(input_data)
)

# Make prediction
response = stub.Predict(request, timeout=10.0)

# Parse response
output_tensor = tf.make_ndarray(response.outputs["dense_1"])
print(f"Predictions: {output_tensor}")
```

## Model Configuration

Use a model configuration file for advanced setups:

```protobuf
# model_config.pbtxt
model_config_list {
  config {
    name: 'classifier'
    base_path: '/models/classifier'
    model_platform: 'tensorflow'
    model_version_policy {
      specific {
        versions: 1
        versions: 2
      }
    }
  }
  config {
    name: 'regressor'
    base_path: '/models/regressor'
    model_platform: 'tensorflow'
    model_version_policy {
      latest {
        num_versions: 2
      }
    }
  }
}
```

Run with the configuration file:

```bash
docker run -p 8501:8501 -p 8500:8500 \
    --mount type=bind,source=$(pwd)/models,target=/models \
    --mount type=bind,source=$(pwd)/model_config.pbtxt,target=/config/model_config.pbtxt \
    tensorflow/serving \
    --model_config_file=/config/model_config.pbtxt \
    --model_config_file_poll_wait_seconds=60
```

## Batching Configuration

Enable request batching for higher throughput:

```protobuf
# batching_config.pbtxt
max_batch_size { value: 128 }
batch_timeout_micros { value: 1000 }
max_enqueued_batches { value: 1000 }
num_batch_threads { value: 4 }
pad_variable_length_inputs: true
```

Start with batching enabled:

```bash
docker run -p 8501:8501 -p 8500:8500 \
    --mount type=bind,source=$(pwd)/models/my_model,target=/models/my_model \
    --mount type=bind,source=$(pwd)/batching_config.pbtxt,target=/config/batching.pbtxt \
    -e MODEL_NAME=my_model \
    tensorflow/serving \
    --enable_batching=true \
    --batching_parameters_file=/config/batching.pbtxt
```

## Kubernetes Deployment

Deploy TensorFlow Serving on Kubernetes:

```yaml
# tfserving-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tf-serving
  namespace: ml-serving
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tf-serving
  template:
    metadata:
      labels:
        app: tf-serving
    spec:
      containers:
        - name: tf-serving
          image: tensorflow/serving:latest-gpu
          ports:
            - containerPort: 8500
              name: grpc
            - containerPort: 8501
              name: rest
          env:
            - name: MODEL_NAME
              value: "my_model"
          args:
            - "--enable_batching=true"
            - "--batching_parameters_file=/config/batching.pbtxt"
          resources:
            limits:
              nvidia.com/gpu: "1"
              memory: "4Gi"
            requests:
              memory: "2Gi"
              cpu: "1"
          volumeMounts:
            - name: model-volume
              mountPath: /models/my_model
              readOnly: true
            - name: config-volume
              mountPath: /config
          readinessProbe:
            httpGet:
              path: /v1/models/my_model
              port: 8501
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /v1/models/my_model
              port: 8501
            initialDelaySeconds: 60
            periodSeconds: 30
      volumes:
        - name: model-volume
          persistentVolumeClaim:
            claimName: model-storage
        - name: config-volume
          configMap:
            name: tfserving-config
---
apiVersion: v1
kind: Service
metadata:
  name: tf-serving
  namespace: ml-serving
spec:
  selector:
    app: tf-serving
  ports:
    - port: 8500
      targetPort: 8500
      name: grpc
    - port: 8501
      targetPort: 8501
      name: rest
  type: ClusterIP
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: tfserving-config
  namespace: ml-serving
data:
  batching.pbtxt: |
    max_batch_size { value: 128 }
    batch_timeout_micros { value: 1000 }
    max_enqueued_batches { value: 1000 }
    num_batch_threads { value: 4 }
```

## Model Versioning and A/B Testing

Serve multiple model versions simultaneously:

```python
import requests

# Request specific version
response_v1 = requests.post(
    "http://localhost:8501/v1/models/my_model/versions/1:predict",
    json={"instances": input_data}
)

response_v2 = requests.post(
    "http://localhost:8501/v1/models/my_model/versions/2:predict",
    json={"instances": input_data}
)

# Compare predictions
print(f"V1 predictions: {response_v1.json()['predictions']}")
print(f"V2 predictions: {response_v2.json()['predictions']}")
```

For traffic splitting, use an Istio VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tf-serving-vs
spec:
  hosts:
    - tf-serving
  http:
    - match:
        - headers:
            model-version:
              exact: "v1"
      route:
        - destination:
            host: tf-serving-v1
    - route:
        - destination:
            host: tf-serving-v1
          weight: 90
        - destination:
            host: tf-serving-v2
          weight: 10
```

## Monitoring with Prometheus

TensorFlow Serving exports metrics at `/monitoring/prometheus/metrics`:

```yaml
# prometheus-scrape-config.yaml
scrape_configs:
  - job_name: 'tf-serving'
    static_configs:
      - targets: ['tf-serving:8501']
    metrics_path: /monitoring/prometheus/metrics
```

Key metrics to monitor:

```promql
# Request rate
rate(tensorflow_serving_request_count[5m])

# Request latency
histogram_quantile(0.95, rate(tensorflow_serving_request_latency_bucket[5m]))

# Batch size distribution
histogram_quantile(0.50, rate(tensorflow_serving_batch_size_bucket[5m]))

# Model load time
tensorflow_serving_model_load_latency_seconds
```

## Python Client Library

Create a reusable client:

```python
import requests
import numpy as np
from typing import List, Dict, Any
import grpc
from tensorflow_serving.apis import predict_pb2
from tensorflow_serving.apis import prediction_service_pb2_grpc
import tensorflow as tf

class TFServingClient:
    """Client for TensorFlow Serving with REST and gRPC support."""

    def __init__(self, host: str, rest_port: int = 8501, grpc_port: int = 8500):
        self.rest_url = f"http://{host}:{rest_port}"
        self.grpc_channel = grpc.insecure_channel(f"{host}:{grpc_port}")
        self.grpc_stub = prediction_service_pb2_grpc.PredictionServiceStub(
            self.grpc_channel
        )

    def predict_rest(
        self,
        model_name: str,
        inputs: np.ndarray,
        version: int = None
    ) -> List[Any]:
        """Make prediction using REST API."""
        url = f"{self.rest_url}/v1/models/{model_name}"
        if version:
            url += f"/versions/{version}"
        url += ":predict"

        response = requests.post(url, json={"instances": inputs.tolist()})
        response.raise_for_status()
        return response.json()["predictions"]

    def predict_grpc(
        self,
        model_name: str,
        inputs: np.ndarray,
        input_name: str = "dense_input",
        output_name: str = "dense_1"
    ) -> np.ndarray:
        """Make prediction using gRPC API."""
        request = predict_pb2.PredictRequest()
        request.model_spec.name = model_name
        request.model_spec.signature_name = "serving_default"
        request.inputs[input_name].CopyFrom(
            tf.make_tensor_proto(inputs.astype(np.float32))
        )

        response = self.grpc_stub.Predict(request, timeout=10.0)
        return tf.make_ndarray(response.outputs[output_name])

    def get_model_status(self, model_name: str) -> Dict:
        """Get model status."""
        response = requests.get(f"{self.rest_url}/v1/models/{model_name}")
        response.raise_for_status()
        return response.json()

# Usage
client = TFServingClient("localhost")
inputs = np.random.randn(10, 10).astype(np.float32)
predictions = client.predict_grpc("my_model", inputs)
print(predictions)
```

---

TensorFlow Serving handles the operational complexity of model deployment so your team can focus on improving models. Start with a single model, then add batching, versioning, and monitoring as your traffic grows. The Kubernetes integration makes it straightforward to scale horizontally when you need more capacity.
