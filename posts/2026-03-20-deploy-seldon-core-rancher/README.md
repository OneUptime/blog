# How to Deploy Seldon Core on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Seldon, MLOps, Model-serving, Kubernetes

Description: Guide to deploying Seldon Core on Rancher for scalable, production-grade ML model serving.

## Introduction

Seldon Core is an open-source platform for deploying, scaling, and monitoring machine learning models on Kubernetes. It supports A/B testing, canary deployments, and multi-model pipelines, making it ideal for production ML serving on Rancher.

## Step 1: Install Seldon Core with Helm

```bash
# Add Seldon charts repository
helm repo add seldonio https://storage.googleapis.com/seldon-charts
helm repo update

# Create namespaces
kubectl create namespace seldon-system
kubectl create namespace ml-models

# Install Seldon Core
# Optional for private object storage:
# --set predictiveUnit.defaultEnvSecretRefName=seldon-init-container-secret
helm install seldon-core-operator seldonio/seldon-core-operator \
  --namespace seldon-system \
  --version 1.19.0 \
  --set usageMetrics.enabled=true \
  --set istio.enabled=false \
  --set ambassador.enabled=false

# Verify installation
kubectl get pods -n seldon-system
kubectl get crds | grep seldon
```

## Step 2: Deploy a Scikit-Learn Model

```yaml
# sklearn-deployment.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: iris-classifier
  namespace: ml-models
spec:
  name: iris
  predictors:
  - name: default
    replicas: 2
    componentSpecs:
    - spec:
        containers:
        - name: classifier
          resources:
            limits:
              cpu: "1"
              memory: "1Gi"
            requests:
              cpu: "100m"
              memory: "256Mi"
    graph:
      name: classifier
      implementation: SKLEARN_SERVER
      modelUri: gs://seldon-models/v1.19.0/sklearn/iris
      children: []
    traffic: 100
```

## Step 3: Deploy with A/B Testing

```yaml
# ab-testing-deployment.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: credit-model-ab
  namespace: ml-models
spec:
  name: credit-scoring
  predictors:
  - name: model-a
    replicas: 1
    traffic: 70              # 70% to model A
    graph:
      name: model-a
      implementation: SKLEARN_SERVER
      modelUri: s3://ml-models/credit/v1.0
  - name: model-b
    replicas: 1
    traffic: 30              # 30% to model B
    graph:
      name: model-b
      implementation: SKLEARN_SERVER
      modelUri: s3://ml-models/credit/v2.0
```

## Step 4: Deploy TensorFlow Model

```yaml
# tensorflow-serving.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: resnet-classifier
  namespace: ml-models
spec:
  name: image-classifier
  predictors:
  - name: default
    replicas: 2
    graph:
      name: classifier
      implementation: TENSORFLOW_SERVER
      modelUri: s3://ml-models/resnet50/v1
      children: []
      parameters:
      - name: signature_name
        type: STRING
        value: serving_default
      - name: model_name
        type: STRING
        value: resnet50
    componentSpecs:
    - spec:
        containers:
        - name: classifier
          resources:
            limits:
              nvidia.com/gpu: "1"
              memory: "8Gi"
```

## Step 5: Create a Multi-Stage Pipeline

```yaml
# pipeline-deployment.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: fraud-detection-pipeline
  namespace: ml-models
spec:
  name: fraud-pipeline
  predictors:
  - name: default
    graph:
      name: feature-transformer
      type: MODEL
      implementation: SKLEARN_SERVER
      modelUri: s3://ml-models/fraud/transformer
      children:
      - name: fraud-detector
        type: MODEL
        implementation: XGBOOST_SERVER
        modelUri: s3://ml-models/fraud/detector
        children: []
```

## Step 6: Test the Deployment

```bash
# Because Istio and Ambassador are disabled, port-forward the predictor service
kubectl port-forward -n ml-models svc/iris-classifier-default 8000:8000

# In another terminal, make a prediction request
curl -X POST "http://127.0.0.1:8000/api/v1.0/predictions" \
  -H "Content-Type: application/json" \
  -d '{"data": {"ndarray": [[5.1, 3.5, 1.4, 0.2]]}}'

# Response:
# {"data": {"names": ["setosa", "versicolor", "virginica"],
#            "ndarray": [[0.97, 0.02, 0.01]]}}
```

## Monitoring with Prometheus

```yaml
# seldon-podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: seldon-models
  namespace: ml-models
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/managed-by: seldon-core
  podMetricsEndpoints:
  - port: metrics
    interval: 30s
    path: /prometheus
```

## Conclusion

Seldon Core on Rancher provides enterprise-grade ML model serving with advanced features like A/B testing, multi-model pipelines, and built-in monitoring. Its Kubernetes-native design makes it a natural fit for Rancher-managed clusters where operations teams need visibility and control over ML deployments.
