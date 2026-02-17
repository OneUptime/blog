# How to Deploy Azure API Management Self-Hosted Gateway on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Kubernetes, Self-Hosted Gateway, Containers, Hybrid Cloud

Description: Step-by-step instructions for deploying the Azure API Management self-hosted gateway on Kubernetes for hybrid and multi-cloud API scenarios.

---

The Azure API Management self-hosted gateway lets you run the APIM gateway component anywhere - on your own Kubernetes cluster, in another cloud provider, or on-premises. It connects back to your APIM control plane in Azure for configuration and reporting, but the actual request processing happens locally. This is essential for hybrid architectures where your backends are not in Azure, or where latency requirements mean you need the gateway close to the backend.

In this post, I will walk through deploying the self-hosted gateway on a Kubernetes cluster, from provisioning in the Azure Portal to writing the deployment manifests and verifying that traffic flows correctly.

## Why Self-Hosted Gateway

The managed APIM gateway runs in Azure and is great when your backends are also in Azure. But there are scenarios where it falls short:

- **On-premises backends**: If your APIs run in your own data center, routing traffic through Azure adds latency. A self-hosted gateway in the same data center processes requests locally.
- **Multi-cloud**: If you run workloads in AWS or GCP, a self-hosted gateway in those environments avoids cross-cloud latency.
- **Data sovereignty**: Some regulations require that API traffic does not leave a specific geographic region. The self-hosted gateway keeps request processing local.
- **Edge computing**: For IoT or retail scenarios, you might need gateways at edge locations with intermittent connectivity.

The self-hosted gateway supports most APIM policies (rate limiting, JWT validation, transformations, etc.) and synchronizes its configuration from the Azure control plane every few minutes.

## Prerequisites

You need:
- An APIM instance on the Premium or Developer tier (self-hosted gateways are not available on the Consumption or Standard tiers)
- A Kubernetes cluster (AKS, EKS, GKE, or any conformant cluster)
- `kubectl` configured to connect to your cluster
- Helm 3 (optional, but recommended)

## Step 1: Provision the Gateway in Azure

In the Azure Portal, go to your APIM instance and click "Gateways" under Deployment and infrastructure. Click "Add" to create a new gateway resource.

Give it a name (e.g., `on-prem-gateway`) and optionally a description and location. After creation, click on the gateway and go to the "Deployment" tab. You will see a token and configuration values needed for the Kubernetes deployment.

The key piece is the gateway token, which the self-hosted gateway uses to authenticate with the Azure control plane. You can generate a new token with a specified expiry (the default is 30 days). Copy the token value.

## Step 2: Create the Kubernetes Namespace and Secret

First, create a namespace for the gateway:

```bash
# Create a dedicated namespace for the APIM gateway
kubectl create namespace apim-gateway
```

Then create a Kubernetes secret with the gateway token:

```bash
# Store the APIM gateway token as a Kubernetes secret
# Replace <your-gateway-token> with the token from the Azure Portal
kubectl create secret generic apim-gateway-token \
    --from-literal=value="GatewayKey <your-gateway-token>" \
    --namespace apim-gateway
```

## Step 3: Deploy with Helm

The easiest way to deploy the self-hosted gateway is with the official Helm chart:

```bash
# Add the Azure API Management Helm repository
helm repo add azure-apim-gateway https://azure.github.io/api-management-self-hosted-gateway/helm-charts/
helm repo update

# Install the self-hosted gateway
helm install apim-gateway azure-apim-gateway/azure-api-management-gateway \
    --namespace apim-gateway \
    --set gateway.configuration.uri="https://yourinstance.management.azure-api.net/subscriptions/YOUR_SUB_ID/resourceGroups/YOUR_RG/providers/Microsoft.ApiManagement/service/yourinstance/gateways/on-prem-gateway?api-version=2021-08-01" \
    --set gateway.auth.key="apim-gateway-token" \
    --set service.type=LoadBalancer
```

The `configuration.uri` is the management endpoint for your specific gateway resource. You can find this in the Azure Portal on the gateway's Deployment tab.

## Step 4: Deploy with kubectl (Without Helm)

If you prefer plain Kubernetes manifests, here is a complete deployment:

```yaml
# apim-gateway-deployment.yaml
# Deploys the APIM self-hosted gateway as a Kubernetes Deployment
# with 2 replicas for high availability
apiVersion: apps/v1
kind: Deployment
metadata:
  name: apim-gateway
  namespace: apim-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: apim-gateway
  template:
    metadata:
      labels:
        app: apim-gateway
    spec:
      containers:
      - name: apim-gateway
        image: mcr.microsoft.com/azure-api-management/gateway:v2
        ports:
        - name: http
          containerPort: 8080
        - name: https
          containerPort: 8081
        - name: management
          containerPort: 8082
        env:
        - name: config.service.auth
          valueFrom:
            secretKeyRef:
              name: apim-gateway-token
              key: value
        - name: config.service.endpoint
          value: "https://yourinstance.management.azure-api.net/subscriptions/YOUR_SUB_ID/resourceGroups/YOUR_RG/providers/Microsoft.ApiManagement/service/yourinstance/gateways/on-prem-gateway?api-version=2021-08-01"
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /status-0123456789abcdef
            port: management
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /status-0123456789abcdef
            port: management
          initialDelaySeconds: 30
          periodSeconds: 15
---
# Service to expose the gateway
apiVersion: v1
kind: Service
metadata:
  name: apim-gateway
  namespace: apim-gateway
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8081
  selector:
    app: apim-gateway
```

Apply the manifest:

```bash
# Deploy the gateway to Kubernetes
kubectl apply -f apim-gateway-deployment.yaml
```

## Step 5: Assign APIs to the Gateway

By default, APIs in APIM are assigned to the managed gateway. To route them through your self-hosted gateway, you need to explicitly assign them.

In the Azure Portal, go to your gateway resource, click "APIs," and add the APIs you want to serve from this gateway. Only assigned APIs will be available on the self-hosted gateway.

You can assign APIs to both the managed and self-hosted gateways simultaneously. This is useful during migration when you want traffic to work from both locations.

## Step 6: Verify the Deployment

Check that the pods are running:

```bash
# Verify the gateway pods are running
kubectl get pods -n apim-gateway

# Check the logs for successful configuration sync
kubectl logs -n apim-gateway -l app=apim-gateway --tail=50
```

You should see log messages indicating that the gateway successfully connected to the Azure control plane and downloaded its configuration.

Get the external IP of the service:

```bash
# Get the external IP assigned to the gateway service
kubectl get svc -n apim-gateway
```

Test an API call through the self-hosted gateway:

```bash
# Test the gateway by calling an assigned API
# Replace EXTERNAL_IP with the LoadBalancer IP from the previous command
curl -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
     http://EXTERNAL_IP/your-api-path
```

## Configuring TLS

For production deployments, you need TLS termination. You can either:

1. **Use a Kubernetes Ingress controller** (like nginx or Traefik) in front of the gateway service
2. **Configure TLS directly on the gateway** using Kubernetes secrets

For the ingress approach:

```yaml
# Ingress resource for TLS termination with cert-manager
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: apim-gateway-ingress
  namespace: apim-gateway
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: apim-gateway-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: apim-gateway
            port:
              number: 80
```

## Scaling and High Availability

The self-hosted gateway is stateless, so scaling is straightforward. Use a Horizontal Pod Autoscaler based on CPU or memory:

```yaml
# HPA to auto-scale the gateway between 2 and 10 replicas
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: apim-gateway-hpa
  namespace: apim-gateway
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: apim-gateway
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

For high availability, run at least two replicas and spread them across availability zones using pod anti-affinity rules.

## Monitoring and Telemetry

The self-hosted gateway sends telemetry back to the Azure control plane, so you can see metrics in the APIM Analytics blade. For local monitoring, the gateway exposes Prometheus metrics on the management port. You can scrape these with a Prometheus instance in your cluster.

## Offline Behavior

One of the key questions about the self-hosted gateway is what happens when it loses connectivity to Azure. The gateway caches its configuration locally and continues to process requests using the last known configuration. It will reconnect and sync when connectivity is restored.

However, some features degrade during extended disconnections. Rate limiting counters that depend on the Azure control plane stop synchronizing. Analytics data is buffered locally and sent when connectivity returns, but the buffer has limits.

## Summary

Deploying the Azure API Management self-hosted gateway on Kubernetes gives you the policy engine and management capabilities of APIM while keeping request processing local to your infrastructure. Provision the gateway in Azure, deploy it to Kubernetes with Helm or plain manifests, assign your APIs, and configure TLS for production. The gateway syncs its configuration from Azure and reports telemetry back, giving you a unified management experience across hybrid and multi-cloud environments.
