# How to Deploy Knative on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Knative, Serverless, Kubernetes, Eventing

Description: Complete guide to deploying Knative on Rancher for serverless workloads and event-driven applications.

## Introduction

Knative extends Kubernetes to provide serverless workloads with automatic scaling (including scale-to-zero) and event-driven architecture. This guide covers deploying Knative Serving and Eventing on Rancher.

## Prerequisites

- Rancher cluster with Kubernetes 1.26+
- Minimum 4 nodes (3 control plane + 1 worker)
- 8 GB RAM per node minimum
- Load balancer or NodePort service support

## Step 1: Install Knative Operator

```bash
# Install Knative Operator

kubectl apply -f https://github.com/knative/operator/releases/download/knative-v1.12.0/operator.yaml

# Verify operator is running
kubectl get deployment knative-operator
```

## Step 2: Install Knative Serving

```yaml
# knative-serving.yaml
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
spec:
  version: "1.12.0"
  ingress:
    kourier:
      enabled: true
  config:
    autoscaler:
      enable-scale-to-zero: "true"
      scale-to-zero-grace-period: "30s"
    domain:
      example.com: ""
```

```bash
kubectl apply -f knative-serving.yaml
kubectl wait knativeserving/knative-serving \
  --for=condition=Ready \
  --timeout=10m \
  --namespace=knative-serving
```

## Step 3: Configure DNS

```bash
# Configure custom domain
kubectl patch configmap config-domain \
  --namespace knative-serving \
  --patch '{"data":{"example.com":""}}'
```

## Step 4: Install Knative Eventing

```yaml
# knative-eventing.yaml
apiVersion: operator.knative.dev/v1beta1
kind: KnativeEventing
metadata:
  name: knative-eventing
  namespace: knative-eventing
spec:
  version: "1.12.0"
```

```bash
kubectl apply -f knative-eventing.yaml
```

## Step 5: Deploy a Knative Service

```yaml
# hello-world-ksvc.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-world
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/min-scale: "0"
        autoscaling.knative.dev/max-scale: "10"
        autoscaling.knative.dev/target: "100"
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Rancher Knative"
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
```

```bash
kubectl apply -f hello-world-ksvc.yaml
kubectl get ksvc hello-world
curl $(kubectl get ksvc hello-world -o jsonpath='{.status.url}')
```

## Step 6: Configure Traffic Splitting

```yaml
# traffic-split.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-app
spec:
  traffic:
  - revisionName: my-app-v1
    percent: 80
  - revisionName: my-app-v2
    percent: 20
  template:
    spec:
      containers:
      - image: registry.example.com/my-app:v2
```

## Step 7: Set Up Event Sources

```yaml
# ping-source.yaml
apiVersion: sources.knative.dev/v1
kind: PingSource
metadata:
  name: hourly-trigger
  namespace: default
spec:
  schedule: "0 * * * *"
  data: '{"message": "hourly job"}'
  sink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: event-processor
```

## Monitoring Knative

```bash
# Check Knative pods
kubectl get pods -n knative-serving
kubectl get pods -n knative-eventing

# Monitor autoscaling
kubectl get kpa -A
```

## Conclusion

Knative on Rancher provides a powerful serverless platform with automatic scaling including scale-to-zero. Knative Serving handles HTTP workloads while Knative Eventing enables event-driven architectures. Once deployed, development teams can focus on writing functions rather than managing Kubernetes deployments.
