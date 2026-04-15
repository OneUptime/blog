# How to Deploy Dapr on Amazon EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, EKS, AWS, Kubernetes, Deployment

Description: Step-by-step guide to deploying Dapr on Amazon EKS using Helm, configuring the control plane, and deploying a sample application with sidecar injection.

---

Amazon EKS is a managed Kubernetes service that provides a straightforward environment for running Dapr. This guide covers installing the Dapr control plane, enabling sidecar injection, and deploying a sample application.

## Prerequisites

```bash
# Install required tools
brew install helm
brew install eksctl
brew install awscli

# Create EKS cluster if needed
eksctl create cluster \
  --name dapr-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 5

# Configure kubectl
aws eks update-kubeconfig \
  --region us-east-1 \
  --name dapr-cluster
```

## Install Dapr with Helm

```bash
# Add the Dapr Helm chart repository
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# Create the Dapr namespace
kubectl create namespace dapr-system

# Install Dapr
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.mtls.enabled=true \
  --set dapr_operator.replicaCount=2 \
  --set dapr_sentry.replicaCount=2 \
  --wait
```

## Verify the Installation

```bash
# Check Dapr control plane pods
kubectl get pods -n dapr-system

# Expected output:
# dapr-operator-xxx          1/1   Running
# dapr-placement-server-xxx  1/1   Running
# dapr-sentry-xxx            1/1   Running
# dapr-sidecar-injector-xxx  1/1   Running

# Check Dapr version
kubectl get configuration/daprsystem -n dapr-system -o yaml
```

## Configure a State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.redis.svc.cluster.local:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

```bash
kubectl apply -f statestore.yaml
```

## Deploy a Sample Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-dapr
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello-dapr
  template:
    metadata:
      labels:
        app: hello-dapr
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "hello-dapr"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
    spec:
      containers:
      - name: hello-dapr
        image: ghcr.io/dapr/samples/hello-k8s-node:latest
        ports:
        - containerPort: 8080
        env:
        - name: APP_PORT
          value: "8080"
```

```bash
kubectl apply -f deployment.yaml

# Verify sidecar injection
kubectl get pods -l app=hello-dapr
# Each pod should show 2/2 containers (app + dapr-sidecar)
```

## Configure Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hello-dapr-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hello-dapr
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Enable Dapr Dashboard

```bash
# Install the Dapr dashboard (not included in the default Dapr Helm chart since v1.11)
helm install dapr-dashboard dapr/dapr-dashboard --namespace dapr-system

# Port-forward to access the Dapr dashboard
kubectl port-forward svc/dapr-dashboard 8080:8080 -n dapr-system

# Open http://localhost:8080 in your browser
```

## Summary

Deploying Dapr on EKS involves installing the Helm chart into the `dapr-system` namespace, creating component manifests for your infrastructure, and annotating deployments to enable sidecar injection. The Dapr control plane components run as highly available deployments, and the sidecar injector automatically injects the Dapr proxy into annotated pods. This setup provides a production-ready foundation for building distributed applications on EKS.
