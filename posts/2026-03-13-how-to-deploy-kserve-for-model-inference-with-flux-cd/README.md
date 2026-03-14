# How to Deploy KServe for Model Inference with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KServe, Model Inference, Serverless, Machine Learning, HelmRelease

Description: Learn how to deploy KServe serverless model inference on Kubernetes using Flux CD for a GitOps-managed model serving platform.

---

## Introduction

KServe (formerly KFServing) is the standard model inference platform for Kubernetes, providing serverless model serving with autoscaling to zero, multi-framework support (TensorFlow, PyTorch, Scikit-learn, XGBoost, ONNX), and canary rollouts. It integrates deeply with Knative Serving for scale-to-zero functionality and Istio for traffic management.

Managing KServe deployments through Flux CD means that data scientists and MLOps engineers submit pull requests to deploy, update, or roll back models. The InferenceService custom resource declaratively describes a model's serving configuration — the model URI, runtime, resource requirements, and scaling policy. Flux reconciles this resource continuously, ensuring the cluster always reflects what is in Git.

In this guide you will install KServe and its dependencies using Flux CD, create InferenceService resources for multiple model runtimes, and configure autoscaling for cost-efficient model serving.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (minimum 4 CPUs, 8GB RAM)
- Knative Serving installed in the cluster (required by KServe in serverless mode)
- Istio installed for traffic management
- `kubectl` and `flux` CLI tools installed
- Model artifacts accessible from the cluster (S3, GCS, or Azure Blob)

## Step 1: Add the KServe HelmRepository

```yaml
# clusters/production/sources/kserve.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kserve
  namespace: flux-system
spec:
  interval: 1h
  url: https://kserve.github.io/kserve
```

## Step 2: Deploy KServe

```yaml
# clusters/production/infrastructure/kserve-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kserve
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: kserve
  createNamespace: true
  chart:
    spec:
      chart: kserve
      version: "0.13.x"
      sourceRef:
        kind: HelmRepository
        name: kserve
  install:
    timeout: 15m
  upgrade:
    timeout: 15m
  values:
    # Use serverless mode (requires Knative)
    kserve:
      controller:
        deploymentMode: Serverless
      agent:
        image: kserve/agent:v0.13.0
      router:
        image: kserve/router:v0.13.0
      metricsaggregator:
        enableMetricAggregation: "true"

    # Resource configuration for the KServe controller
    controller:
      resources:
        requests:
          cpu: 100m
          memory: 300Mi
        limits:
          cpu: 500m
          memory: 500Mi

    # Enable ingress for external access
    ingress:
      ingressGateway: istio-system/istio-ingressgateway
      localGateway: knative-serving/knative-local-gateway
```

## Step 3: Configure Storage Credentials

```yaml
# clusters/production/secrets/kserve-s3-secret.yaml
# Encrypt with SOPS before committing
apiVersion: v1
kind: Secret
metadata:
  name: kserve-s3-secret
  namespace: kserve-models
  annotations:
    # KServe uses this annotation to configure S3 access
    serving.kserve.io/s3-endpoint: s3.amazonaws.com
    serving.kserve.io/s3-usehttps: "1"
    serving.kserve.io/s3-region: us-east-1
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kserve-sa
  namespace: kserve-models
secrets:
  - name: kserve-s3-secret
```

## Step 4: Deploy a Scikit-learn Model

```yaml
# apps/kserve-models/churn-model-inferenceservice.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: churn-model
  namespace: kserve-models
  annotations:
    # Enable autoscaling to zero when not in use
    autoscaling.knative.dev/target: "100"
    autoscaling.knative.dev/scaleToZeroPodRetentionPeriod: "10m"
spec:
  predictor:
    serviceAccountName: kserve-sa
    # Minimum and maximum pod replicas
    minReplicas: 1
    maxReplicas: 10
    sklearn:
      # SKLearn runtime server
      runtimeVersion: "1.3.2"
      storageUri: s3://my-models-bucket/churn-model/v1.2.0
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi
```

## Step 5: Deploy a PyTorch Model with Canary Rollout

```yaml
# apps/kserve-models/sentiment-model-inferenceservice.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sentiment-analyzer
  namespace: kserve-models
spec:
  predictor:
    serviceAccountName: kserve-sa
    minReplicas: 1
    maxReplicas: 5
    pytorch:
      runtimeVersion: "2.1.0"
      storageUri: s3://my-models-bucket/sentiment-v2/
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 2Gi

  # Canary traffic: send 20% to new model version
  canaryTrafficPercent: 20
  # Uncomment when a new version is ready:
  # canary:
  #   predictor:
  #     pytorch:
  #       runtimeVersion: "2.2.0"
  #       storageUri: s3://my-models-bucket/sentiment-v3/
```

## Step 6: Deploy a Custom Model Server

For models requiring a custom runtime, use a custom container.

```yaml
# apps/kserve-models/custom-model-inferenceservice.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: custom-recommender
  namespace: kserve-models
spec:
  predictor:
    serviceAccountName: kserve-sa
    minReplicas: 2
    maxReplicas: 20
    containers:
      - name: kserve-container
        image: myregistry/recommender-server:v2.0.0
        args:
          - --model-path=/mnt/models
          - --http-port=8080
        ports:
          - containerPort: 8080
            protocol: TCP
        env:
          - name: MODEL_VERSION
            value: "v2.0.0"
        readinessProbe:
          httpGet:
            path: /v2/health/ready
            port: 8080
          initialDelaySeconds: 10
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

## Step 7: Create Flux Kustomization and Test

```yaml
# clusters/production/apps/kserve-models-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kserve-models
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/kserve-models
  prune: true
  wait: true
  timeout: 10m
  dependsOn:
    - name: kserve
```

```bash
# Check InferenceService status
kubectl get inferenceservice -n kserve-models
kubectl describe inferenceservice churn-model -n kserve-models

# Get the inference endpoint URL
INFERENCE_URL=$(kubectl get inferenceservice churn-model \
  -n kserve-models -o jsonpath='{.status.url}')

# Test a prediction (KServe v2 inference protocol)
curl -X POST "$INFERENCE_URL/v2/models/churn-model/infer" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{
      "name": "input-0",
      "shape": [1, 4],
      "datatype": "FP32",
      "data": [[30, 2, 1200.5, 0]]
    }]
  }'

# Watch autoscaling behavior
kubectl get pods -n kserve-models -w
```

## Best Practices

- Use `scaleToZeroPodRetentionPeriod` to keep warm replicas for low-latency responses on infrequently called models
- Set `minReplicas: 1` for latency-sensitive models to avoid cold-start delays
- Use canary rollouts to gradually shift traffic to new model versions before full promotion
- Store model artifacts in versioned S3 paths (never overwrite an existing version) for reliable rollbacks
- Configure readiness probes on custom model server containers to prevent traffic before the model is loaded
- Enable KServe's model monitoring integration with Prometheus for latency, throughput, and error rate metrics

## Conclusion

Deploying KServe with Flux CD creates a fully automated, GitOps-driven model inference platform. Data scientists submit InferenceService YAML files to Git, and Flux applies them to the cluster. KServe handles model download, runtime configuration, and serverless scaling, while Flux tracks every model deployment as a Git commit. Canary rollouts let you validate new model versions safely before promoting them to full production traffic.
