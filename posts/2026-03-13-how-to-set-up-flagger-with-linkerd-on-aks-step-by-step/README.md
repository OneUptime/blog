# How to Set Up Flagger with Linkerd on AKS Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, linkerd, aks, azure, kubernetes, canary, progressive delivery, service mesh

Description: A step-by-step guide to setting up Flagger with Linkerd on Azure Kubernetes Service for progressive canary deployments.

---

## Introduction

Azure Kubernetes Service (AKS) provides a managed Kubernetes environment that pairs well with Linkerd for service mesh capabilities and Flagger for progressive delivery. Linkerd is a lightweight service mesh that provides mTLS, observability, and traffic splitting without the complexity of heavier alternatives. Flagger leverages Linkerd's TrafficSplit resource to gradually shift traffic between primary and canary workloads.

This guide walks through setting up a complete progressive delivery pipeline on AKS, from cluster preparation through Linkerd installation to deploying a Flagger-managed canary.

## Prerequisites

- An Azure subscription with permissions to create AKS clusters
- Azure CLI (`az`) installed and configured
- kubectl installed
- Helm installed
- The Linkerd CLI (`linkerd`) installed

## Step 1: Create an AKS Cluster

Create an AKS cluster with sufficient resources for Linkerd and Flagger:

```bash
az group create --name flagger-rg --location eastus

az aks create \
  --resource-group flagger-rg \
  --name flagger-cluster \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2 \
  --generate-ssh-keys

az aks get-credentials \
  --resource-group flagger-rg \
  --name flagger-cluster
```

Verify the cluster is running:

```bash
kubectl get nodes
```

## Step 2: Install Linkerd

First, validate that the cluster meets Linkerd prerequisites:

```bash
linkerd check --pre
```

Install the Linkerd CRDs and control plane:

```bash
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
```

Wait for the control plane to be ready:

```bash
linkerd check
```

Install the Linkerd Viz extension, which provides the Prometheus instance that Flagger uses for metrics:

```bash
linkerd viz install | kubectl apply -f -
linkerd viz check
```

## Step 3: Install Flagger

Install Flagger with Linkerd as the mesh provider:

```bash
helm repo add flagger https://flagger.app

helm upgrade -i flagger flagger/flagger \
  --namespace linkerd \
  --set meshProvider=linkerd \
  --set metricsServer=http://prometheus.linkerd-viz:9090
```

The `meshProvider=linkerd` flag tells Flagger to use Linkerd's TrafficSplit resources for traffic management. The `metricsServer` points to the Prometheus instance installed by Linkerd Viz.

Verify Flagger is running:

```bash
kubectl -n linkerd get deploy flagger
```

## Step 4: Install the Flagger Load Tester

Deploy the load tester in a dedicated namespace:

```bash
helm upgrade -i flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace \
  --set meshProvider=linkerd
```

Inject Linkerd proxy into the load tester namespace:

```bash
kubectl annotate namespace test linkerd.io/inject=enabled
kubectl -n test rollout restart deploy flagger-loadtester
```

## Step 5: Prepare the Application Namespace

Create a namespace for your application and enable Linkerd injection:

```bash
kubectl create namespace demo
kubectl annotate namespace demo linkerd.io/inject=enabled
```

The `linkerd.io/inject=enabled` annotation ensures that all pods in this namespace automatically get the Linkerd sidecar proxy.

## Step 6: Deploy the Application

Deploy a sample application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: demo
  labels:
    app: podinfo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
        - name: podinfo
          image: stefanprodan/podinfo:6.0.0
          ports:
            - containerPort: 9898
              name: http
          command:
            - ./podinfo
            - --port=9898
```

Apply the deployment:

```bash
kubectl apply -f deployment.yaml
```

## Step 7: Create the Canary Resource

Create a Canary resource that targets the Deployment:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: demo
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
    targetPort: 9898
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 5
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://podinfo-canary.demo:9898/healthz"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.demo:9898/"
```

Apply the Canary resource:

```bash
kubectl apply -f canary.yaml
```

Flagger initializes the canary by creating the primary Deployment, Services, and a TrafficSplit resource:

```bash
kubectl -n demo get canary podinfo
```

Wait until the status shows `Initialized`:

```bash
kubectl -n demo get canary podinfo -w
```

## Step 8: Trigger a Canary Deployment

Update the container image to trigger a canary deployment:

```bash
kubectl -n demo set image deployment/podinfo podinfo=stefanprodan/podinfo:6.0.1
```

Watch the canary progress:

```bash
kubectl -n demo get canary podinfo -w
```

Flagger detects the new revision, creates the canary workload, runs the pre-rollout smoke test, then gradually shifts traffic using Linkerd TrafficSplit resources while evaluating metrics.

## Step 9: Monitor the Deployment

Check the Flagger events:

```bash
kubectl -n demo describe canary podinfo
```

View the TrafficSplit configuration:

```bash
kubectl -n demo get trafficsplit podinfo -o yaml
```

The TrafficSplit shows the current weight distribution between the primary and canary backends.

## Verifying the Setup

After the canary completes (either promoted or rolled back), verify the final state:

```bash
kubectl -n demo get canary podinfo
kubectl -n demo get deploy
kubectl -n demo get svc
kubectl -n demo get trafficsplit
```

A successful promotion shows the canary status as `Succeeded`, and the primary Deployment is updated with the new container image.

## Conclusion

Setting up Flagger with Linkerd on AKS involves installing the Linkerd control plane and Viz extension for metrics, deploying Flagger with the Linkerd mesh provider, and creating Canary resources that target your Deployments. Flagger uses Linkerd's TrafficSplit resources to manage traffic distribution during canary analysis, querying Linkerd's Prometheus instance for success rate and latency metrics. The combination provides a lightweight but effective progressive delivery pipeline on Azure Kubernetes Service.
