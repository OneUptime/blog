# How to Set Up Seldon Core for Multi-Model Serving with Custom Inference Graphs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Seldon Core, Model Serving, Machine Learning, MLOps

Description: Deploy Seldon Core on Kubernetes for advanced multi-model serving with custom inference graphs, A/B testing, and complex ML pipelines with transformers and combiners.

---

Seldon Core provides advanced model serving capabilities beyond simple prediction endpoints. It supports complex inference graphs where multiple models work together, custom transformers for preprocessing, and combiners for ensemble predictions. This makes it ideal for sophisticated ML systems where a single model isn't enough.

This guide shows you how to deploy Seldon Core and build custom inference graphs on Kubernetes.

## Installing Seldon Core

Install using Helm:

```bash
helm repo add seldon https://storage.googleapis.com/seldon-charts
helm repo update

# Install Seldon Core operator
helm install seldon-core seldon/seldon-core-operator \
  --namespace seldon-system \
  --create-namespace \
  --set usageMetrics.enabled=false \
  --set istio.enabled=false

kubectl get pods -n seldon-system
```

Install analytics (optional):

```bash
helm install seldon-core-analytics seldon/seldon-core-analytics \
  --namespace seldon-system
```

## Deploying a Simple Model

Start with a basic deployment:

```yaml
# simple-model.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: sklearn-iris
  namespace: seldon
spec:
  predictors:
  - name: default
    replicas: 2
    graph:
      name: classifier
      implementation: SKLEARN_SERVER
      modelUri: gs://seldon-models/sklearn/iris
    componentSpecs:
    - spec:
        containers:
        - name: classifier
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "1"
              memory: "2Gi"
```

Deploy and test:

```bash
kubectl create namespace seldon
kubectl apply -f simple-model.yaml

# Wait for deployment
kubectl wait --for=condition=ready pod -l seldon-deployment-id=sklearn-iris -n seldon --timeout=5m

# Test prediction
curl -X POST http://sklearn-iris-default.seldon.svc.cluster.local:8000/api/v1.0/predictions \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "ndarray": [[5.1, 3.5, 1.4, 0.2]]
    }
  }'
```

## Creating a Custom Transformer

Build a preprocessing transformer:

```python
# transformer.py
import numpy as np

class FeatureTransformer:
    def __init__(self):
        self.mean = None
        self.std = None

    def predict(self, X, features_names=None):
        """Transform features before prediction"""
        # Convert to numpy array
        if isinstance(X, list):
            X = np.array(X)

        # Apply transformations
        # Example: standardization, feature engineering
        X_transformed = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-8)

        # Add polynomial features
        X_poly = np.hstack([X_transformed, X_transformed ** 2])

        return X_poly

    def transform_input(self, X, names, meta):
        """Alternative method for transformers"""
        return self.predict(X)
```

Package as a Docker image:

```dockerfile
# Dockerfile.transformer
FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    seldon-core==1.17.0 \
    numpy==1.24.0

COPY transformer.py /app/

CMD ["seldon-core-microservice", "transformer", "--service-type=TRANSFORMER"]
```

Deploy with transformer:

```yaml
# model-with-transformer.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: model-with-preprocessing
  namespace: seldon
spec:
  predictors:
  - name: default
    replicas: 2
    graph:
      name: transformer
      type: TRANSFORMER
      endpoint:
        type: REST
      children:
      - name: classifier
        implementation: SKLEARN_SERVER
        modelUri: gs://my-bucket/model
    componentSpecs:
    - spec:
        containers:
        - name: transformer
          image: your-registry/feature-transformer:v1
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
        - name: classifier
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
```

## Building an Ensemble Model

Create a combiner for ensemble predictions:

```python
# combiner.py
import numpy as np

class EnsembleCombiner:
    def aggregate(self, X_list, features_names_list):
        """
        Aggregate predictions from multiple models.
        X_list: List of predictions from different models
        """
        # Convert predictions to arrays
        predictions = [np.array(x) for x in X_list]

        # Weighted average ensemble
        weights = [0.4, 0.3, 0.3]  # Weights for 3 models

        ensemble_pred = np.zeros_like(predictions[0])
        for i, pred in enumerate(predictions):
            ensemble_pred += weights[i] * pred

        return ensemble_pred
```

Deploy ensemble:

```yaml
# ensemble-model.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: ensemble-model
  namespace: seldon
spec:
  predictors:
  - name: default
    replicas: 2
    graph:
      name: combiner
      type: COMBINER
      endpoint:
        type: REST
      children:
      - name: model1
        implementation: SKLEARN_SERVER
        modelUri: gs://my-bucket/model1
      - name: model2
        implementation: SKLEARN_SERVER
        modelUri: gs://my-bucket/model2
      - name: model3
        implementation: SKLEARN_SERVER
        modelUri: gs://my-bucket/model3
    componentSpecs:
    - spec:
        containers:
        - name: combiner
          image: your-registry/ensemble-combiner:v1
        - name: model1
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
        - name: model2
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
        - name: model3
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
```

## Implementing A/B Testing

Deploy multiple model versions with traffic split:

```yaml
# ab-test-deployment.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: ab-test-model
  namespace: seldon
spec:
  predictors:
  # Predictor A (90% traffic)
  - name: model-a
    replicas: 3
    traffic: 90
    graph:
      name: classifier-a
      implementation: SKLEARN_SERVER
      modelUri: gs://my-bucket/model-v1
    componentSpecs:
    - spec:
        containers:
        - name: classifier-a
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"

  # Predictor B (10% traffic)
  - name: model-b
    replicas: 1
    traffic: 10
    graph:
      name: classifier-b
      implementation: SKLEARN_SERVER
      modelUri: gs://my-bucket/model-v2
    componentSpecs:
    - spec:
        containers:
        - name: classifier-b
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
```

## Creating a Complex Inference Graph

Build a multi-stage pipeline:

```yaml
# complex-pipeline.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: complex-pipeline
  namespace: seldon
spec:
  predictors:
  - name: default
    replicas: 2
    graph:
      # Stage 1: Input validation
      name: validator
      type: TRANSFORMER
      children:
      # Stage 2: Feature extraction (parallel)
      - name: text-features
        type: TRANSFORMER
        children: []
      - name: numeric-features
        type: TRANSFORMER
        children: []

      # Stage 3: Combine features
      - name: feature-combiner
        type: COMBINER
        children:
        # Stage 4: Model prediction
        - name: predictor
          implementation: SKLEARN_SERVER
          modelUri: gs://my-bucket/model

        # Stage 5: Post-processing
        - name: postprocessor
          type: OUTPUT_TRANSFORMER
```

## Monitoring Seldon Deployments

Query Prometheus metrics:

```promql
# Prediction requests
rate(seldon_api_executor_client_requests_seconds_count[1m])

# Prediction latency
histogram_quantile(0.95,
  rate(seldon_api_executor_client_requests_seconds_bucket[5m])
)

# Model replicas
seldon_deployment_replicas

# Error rate
rate(seldon_api_executor_client_requests_seconds_count{code!="200"}[1m])
```

Create Grafana dashboard:

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [{
        "expr": "sum(rate(seldon_api_executor_client_requests_seconds_count[1m])) by (deployment_name)"
      }]
    },
    {
      "title": "P95 Latency",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(seldon_api_executor_client_requests_seconds_bucket[5m]))"
      }]
    }
  ]
}
```

## Implementing Outlier Detection

Add outlier detection to the pipeline:

```python
# outlier_detector.py
import numpy as np
from seldon_core.user_model import SeldonComponent

class OutlierDetector(SeldonComponent):
    def __init__(self, threshold=3.0):
        self.threshold = threshold
        self.mean = None
        self.std = None

    def predict(self, X, features_names=None):
        """Detect outliers and flag suspicious inputs"""
        if isinstance(X, list):
            X = np.array(X)

        # Calculate z-scores
        z_scores = np.abs((X - self.mean) / (self.std + 1e-8))

        # Flag outliers
        is_outlier = np.any(z_scores > self.threshold, axis=1)

        # Add metadata
        meta = {
            "outlier_detected": is_outlier.tolist(),
            "max_z_score": z_scores.max(axis=1).tolist()
        }

        return X, meta
```

Deploy with outlier detection:

```yaml
spec:
  predictors:
  - name: default
    graph:
      name: outlier-detector
      type: TRANSFORMER
      children:
      - name: classifier
        implementation: SKLEARN_SERVER
        modelUri: gs://my-bucket/model
    componentSpecs:
    - spec:
        containers:
        - name: outlier-detector
          image: your-registry/outlier-detector:v1
```

## Using GPU for Model Serving

Deploy models with GPU support:

```yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: gpu-model
  namespace: seldon
spec:
  predictors:
  - name: default
    replicas: 2
    graph:
      name: pytorch-model
      implementation: TRITON_SERVER
      modelUri: gs://my-bucket/pytorch-model
    componentSpecs:
    - spec:
        containers:
        - name: pytorch-model
          resources:
            requests:
              cpu: "2"
              memory: "8Gi"
              nvidia.com/gpu: 1
            limits:
              cpu: "4"
              memory: "16Gi"
              nvidia.com/gpu: 1
```

## Conclusion

Seldon Core provides powerful capabilities for complex model serving scenarios on Kubernetes. The ability to create custom inference graphs with transformers, combiners, and routers makes it possible to build sophisticated ML systems. Whether you need ensemble models, A/B testing, or multi-stage pipelines, Seldon Core offers the flexibility to implement these patterns while maintaining the benefits of Kubernetes orchestration like scaling, monitoring, and fault tolerance.
