# How to Set Up Flagger with Istio on AKS Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Istio, AKS, Azure, Canary, Kubernetes, Service-Mesh

Description: A step-by-step guide to setting up Flagger with Istio on Azure Kubernetes Service for automated canary deployments.

---

## Introduction

Azure Kubernetes Service (AKS) provides a managed Kubernetes platform on Azure that works well with Istio and Flagger for progressive delivery. This guide walks through creating an AKS cluster, installing Istio and Flagger, and running your first canary deployment with automated traffic shifting and metric analysis.

## Prerequisites

- Azure CLI (`az`) installed and configured
- An Azure subscription
- `kubectl` installed
- `helm` v3 installed
- `istioctl` installed

## Step 1: Create an AKS Cluster

```bash
# Create a resource group
az group create --name flagger-demo-rg --location eastus

# Create an AKS cluster
az aks create \
  --resource-group flagger-demo-rg \
  --name flagger-demo \
  --node-count 3 \
  --node-vm-size Standard_DS3_v2 \
  --generate-ssh-keys \
  --network-plugin azure \
  --network-policy azure

# Get credentials for kubectl
az aks get-credentials \
  --resource-group flagger-demo-rg \
  --name flagger-demo

# Verify cluster access
kubectl get nodes
```

## Step 2: Install Istio

```bash
# Install Istio with the default profile
istioctl install --set profile=default -y

# Verify Istio components
kubectl get pods -n istio-system

# Enable automatic sidecar injection
kubectl label namespace default istio-injection=enabled

# Verify the installation
istioctl verify-install
```

## Step 3: Install Prometheus

```bash
# Install Prometheus for Istio metrics
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml

# Wait for Prometheus
kubectl rollout status deployment/prometheus -n istio-system
```

## Step 4: Install Flagger

```bash
# Add and update Helm repo
helm repo add flagger https://flagger.app
helm repo update

# Install Flagger for Istio
helm upgrade -i flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus:9090

# Verify Flagger
kubectl get pods -n istio-system -l app.kubernetes.io/name=flagger
```

## Step 5: Create an Istio Gateway

```yaml
# gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: public-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
```

```bash
kubectl apply -f gateway.yaml
```

## Step 6: Deploy the Application

```yaml
# app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: default
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
          image: ghcr.io/stefanprodan/podinfo:6.5.0
          ports:
            - name: http
              containerPort: 9898
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

```bash
kubectl apply -f app.yaml
```

## Step 7: Create the Canary Resource

```yaml
# canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
    targetPort: 9898
    gateways:
      - public-gateway.istio-system.svc.cluster.local
    hosts:
      - "*"
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

```bash
kubectl apply -f canary.yaml
kubectl get canary podinfo -n default -w
```

## Step 8: Trigger and Monitor a Canary Release

```bash
# Get the external IP
export GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Generate traffic
while true; do curl -s http://$GATEWAY_IP/ > /dev/null; sleep 0.5; done &

# Trigger canary deployment
kubectl set image deployment/podinfo podinfo=ghcr.io/stefanprodan/podinfo:6.5.1 -n default

# Monitor rollout
kubectl get canary podinfo -n default -w
```

## AKS-Specific Considerations

### Network Policy with Azure CNI

AKS with Azure CNI and Azure Network Policy supports Istio's traffic management. Ensure your network policy does not block Istio's control plane communication:

```yaml
# allow-istio-control-plane.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio
  namespace: default
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
  policyTypes:
    - Ingress
```

### Azure Load Balancer Annotations

Customize the Istio ingress gateway's Azure Load Balancer:

```bash
# Patch the ingress gateway service for internal load balancer
kubectl annotate svc istio-ingressgateway -n istio-system \
  service.beta.kubernetes.io/azure-load-balancer-internal="true"
```

### Using Azure Monitor

You can export Flagger metrics to Azure Monitor by deploying a Prometheus-to-Azure-Monitor sidecar or using the Azure Monitor managed service for Prometheus.

## Cleanup

```bash
kubectl delete canary podinfo -n default
kubectl delete deployment podinfo -n default
helm uninstall flagger -n istio-system
istioctl uninstall --purge -y
az aks delete --resource-group flagger-demo-rg --name flagger-demo --yes
az group delete --name flagger-demo-rg --yes
```

## Conclusion

You now have a complete Flagger and Istio setup on Azure Kubernetes Service. AKS handles the Kubernetes control plane while Istio manages service-to-service traffic and Flagger automates canary deployments with metric-based analysis. This foundation supports production-grade progressive delivery on Azure with automated rollback safety.
