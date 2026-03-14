# How to Deploy Seldon Core for ML Model Serving with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Seldon Core, ML Model Serving, Machine Learning, HelmRelease

Description: Learn how to deploy Seldon Core ML model serving platform to Kubernetes using Flux CD HelmRelease for GitOps-managed model deployments.

---

## Introduction

Seldon Core is a production-grade platform for deploying machine learning models on Kubernetes. It supports multi-framework model serving (scikit-learn, TensorFlow, PyTorch, XGBoost), A/B testing, canary deployments, explainability, and outlier detection — all through Kubernetes custom resources. Deploying Seldon Core with Flux CD brings GitOps discipline to your model serving infrastructure.

Managing model deployments through Flux CD means that every model rollout, A/B test configuration, and serving infrastructure change is tracked in Git. Data scientists and MLOps engineers submit pull requests to deploy new model versions, and Flux automatically applies the changes. If a model degrades in production, reverting the Git commit rolls back the model deployment.

In this guide you will deploy Seldon Core using Flux CD, create SeldonDeployment resources for different model types, and configure canary deployments for safe model rollouts.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (minimum 4 CPUs, 8GB RAM)
- `kubectl` and `flux` CLI tools installed
- Istio or Ambassador installed for Seldon's ingress (Seldon v1 requires a gateway)
- Model artifacts stored in S3 or a container registry
- Basic understanding of ML model serving concepts

## Step 1: Add the Seldon Core HelmRepository

```yaml
# clusters/production/sources/seldon.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: seldon
  namespace: flux-system
spec:
  interval: 1h
  url: https://storage.googleapis.com/seldon-charts
```

## Step 2: Deploy Seldon Core Operator

```yaml
# clusters/production/infrastructure/seldon-core-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: seldon-core-operator
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: seldon-system
  createNamespace: true
  chart:
    spec:
      chart: seldon-core-operator
      version: "1.18.x"
      sourceRef:
        kind: HelmRepository
        name: seldon
  install:
    timeout: 10m
  values:
    # Use Istio as the ingress gateway
    istio:
      enabled: true
      gateway: istio-system/seldon-gateway

    # Ambassador alternative (disable Istio if using Ambassador)
    ambassador:
      enabled: false

    # Enable metrics with Prometheus
    executor:
      defaultEnv:
        - name: PREDICTIVE_UNIT_METRICS_PORT_NAME
          value: metrics

    # Operator resources
    manager:
      resources:
        requests:
          cpu: 100m
          memory: 200Mi
        limits:
          cpu: 500m
          memory: 500Mi
```

## Step 3: Create a Basic SeldonDeployment

Deploy a scikit-learn model stored in S3.

```yaml
# apps/ml-models/churn-model-seldondeployment.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: churn-predictor
  namespace: ml-models
spec:
  name: churn-predictor
  predictors:
    - name: default
      # Traffic allocation for this predictor
      traffic: 100
      replicas: 2
      graph:
        name: classifier
        type: MODEL
        # Model implementation type
        implementation: SKLEARN_SERVER
        modelUri: s3://my-models-bucket/churn-model/v1.2.0
        envSecretRefName: s3-credentials
      componentSpecs:
        - spec:
            containers:
              - name: classifier
                resources:
                  requests:
                    cpu: 200m
                    memory: 500Mi
                  limits:
                    cpu: 1000m
                    memory: 1Gi
```

## Step 4: Configure A/B Testing Between Model Versions

Deploy two model versions simultaneously and split traffic between them.

```yaml
# apps/ml-models/churn-model-ab-test.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: churn-predictor-ab
  namespace: ml-models
spec:
  name: churn-predictor-ab
  predictors:
    # Predictor A: Current production model (90% traffic)
    - name: model-v1
      traffic: 90
      replicas: 3
      graph:
        name: classifier-v1
        type: MODEL
        implementation: SKLEARN_SERVER
        modelUri: s3://my-models-bucket/churn-model/v1.2.0
        envSecretRefName: s3-credentials
      componentSpecs:
        - spec:
            containers:
              - name: classifier-v1
                resources:
                  requests:
                    cpu: 200m
                    memory: 500Mi

    # Predictor B: New candidate model (10% traffic)
    - name: model-v2
      traffic: 10
      replicas: 1
      graph:
        name: classifier-v2
        type: MODEL
        implementation: SKLEARN_SERVER
        modelUri: s3://my-models-bucket/churn-model/v2.0.0
        envSecretRefName: s3-credentials
      componentSpecs:
        - spec:
            containers:
              - name: classifier-v2
                resources:
                  requests:
                    cpu: 200m
                    memory: 500Mi
```

## Step 5: Deploy a TensorFlow Model

```yaml
# apps/ml-models/image-classifier-seldondeployment.yaml
apiVersion: machinelearning.seldon.io/v1
kind: SeldonDeployment
metadata:
  name: image-classifier
  namespace: ml-models
spec:
  name: image-classifier
  predictors:
    - name: default
      traffic: 100
      replicas: 2
      graph:
        name: tf-model
        type: MODEL
        implementation: TENSORFLOW_SERVER
        modelUri: s3://my-models-bucket/image-classifier/v3.1.0
        envSecretRefName: s3-credentials
        # TensorFlow Serving configuration
        parameters:
          - name: model_name
            value: image-classifier
            type: STRING
      componentSpecs:
        - spec:
            containers:
              - name: tf-model
                resources:
                  requests:
                    cpu: 500m
                    memory: 2Gi
                  limits:
                    cpu: 2000m
                    memory: 4Gi
```

## Step 6: Create the Flux Kustomization for Model Deployments

```yaml
# clusters/production/apps/ml-models-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ml-models
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/ml-models
  prune: true
  wait: true
  timeout: 10m
  # Seldon operator must be running before deploying models
  dependsOn:
    - name: seldon-core-operator
```

## Step 7: Monitor Model Deployments

```bash
# Check SeldonDeployment status
kubectl get seldondeployment -n ml-models
kubectl describe seldondeployment churn-predictor -n ml-models

# View model server pods
kubectl get pods -n ml-models

# Test model prediction
SELDON_URL="http://$(kubectl get svc -n istio-system istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"

curl -X POST \
  "$SELDON_URL/seldon/ml-models/churn-predictor/api/v1.0/predictions" \
  -H "Content-Type: application/json" \
  -d '{"data": {"ndarray": [[30, 2, 1200.50, 0]]}}'

# Check Seldon metrics
kubectl port-forward -n ml-models \
  $(kubectl get pod -n ml-models -l seldon-deployment-id=churn-predictor -o name | head -1) \
  6000:6000
curl http://localhost:6000/prometheus
```

## Best Practices

- Store model URIs in the SeldonDeployment spec with explicit version paths, never use `latest` in production
- Use A/B testing with traffic splits to validate new model versions before full rollout
- Configure Seldon's outlier detection and drift monitoring for production model health
- Use Kubernetes Secrets (SOPS-encrypted in Git) to store S3 credentials referenced by `envSecretRefName`
- Set resource limits on model server containers appropriate to your model size
- Integrate Seldon's Prometheus metrics with Grafana for request latency and error rate monitoring

## Conclusion

Deploying Seldon Core for ML model serving with Flux CD creates a GitOps pipeline for your machine learning models. Every model deployment, A/B test configuration, and traffic split is a Git commit, giving your team a clear audit trail and easy rollback path. Seldon handles the complex model serving logic, while Flux ensures the model infrastructure is always synchronized with the desired state in your repository.
