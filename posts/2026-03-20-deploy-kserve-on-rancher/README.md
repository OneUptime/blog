# How to Deploy KServe on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, KServe, ML Model Serving, Kubernetes, Inference, MLOps

Description: Deploy KServe on Rancher for serverless ML model inference with autoscaling, multi-framework support, and canary deployments via InferenceService resources.

## Introduction

KServe (formerly KFServing) is a Kubernetes-native model serving platform built on Knative. It provides serverless inference with scale-to-zero, multi-framework support (scikit-learn, TensorFlow, PyTorch, XGBoost, ONNX), and model explainability through a simple InferenceService custom resource.

## Prerequisites

- Rancher cluster with Knative Serving installed
- cert-manager installed
- `kubectl` configured

## Step 1: Install KServe

```bash
# Install KServe (requires Knative)

kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.12.0/kserve.yaml

# Wait for controller to be ready
kubectl wait --for=condition=ready pod \
  -l control-plane=kserve-controller-manager \
  -n kserve \
  --timeout=5m
```

## Step 2: Configure S3 Credentials for Model Storage

```yaml
# s3-service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kserve-s3
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/kserve-s3-access
---
apiVersion: v1
kind: Secret
metadata:
  name: s3-credentials
  namespace: production
  annotations:
    serving.kserve.io/s3-endpoint: s3.amazonaws.com
    serving.kserve.io/s3-usehttps: "1"
    serving.kserve.io/s3-region: us-east-1
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: YOUR_ACCESS_KEY
  AWS_SECRET_ACCESS_KEY: YOUR_SECRET_KEY
```

## Step 3: Deploy a Model

```yaml
# sklearn-inference.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
  namespace: production
spec:
  predictor:
    serviceAccountName: kserve-s3
    sklearn:
      storageUri: "s3://my-models/sklearn/iris"
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "1Gi"
```

## Step 4: Canary Deployment

Apply the updated InferenceService (same name) with the new `storageUri` and `canaryTrafficPercent`. KServe retains the previous revision as the default and routes the specified percentage of traffic to the new revision.

```yaml
# canary-inference.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
  namespace: production
spec:
  predictor:
    canaryTrafficPercent: 20    # Send 20% to new revision
    serviceAccountName: kserve-s3
    sklearn:
      storageUri: "s3://my-models/sklearn/iris-v2"
```

## Step 5: Test Inference

```bash
# Get the inference service URL
ISVC_URL=$(kubectl get inferenceservice sklearn-iris \
  -n production \
  -o jsonpath='{.status.url}')

# Send a prediction request
curl -X POST "${ISVC_URL}/v1/models/sklearn-iris:predict" \
  -H "Content-Type: application/json" \
  -d '{"instances": [[5.1, 3.5, 1.4, 0.2]]}'
```

## Step 6: Add Explainability

```yaml
# Add Alibi explainer to InferenceService
spec:
  explainer:
    alibi:
      type: AnchorTabular
      storageUri: "s3://my-models/sklearn/iris-explainer"
      resources:
        requests:
          cpu: "100m"
          memory: "512Mi"
```

## Conclusion

KServe on Rancher provides a complete serverless ML serving platform. Scale-to-zero reduces costs during quiet periods, canary deployments enable safe model rollouts, and the multi-framework support means teams don't need to learn a new serving framework for each ML library. The InferenceService CRD provides a consistent interface for all model types.
