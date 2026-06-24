# How to Install SUSE Observability with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Rancher, Kubernetes, Monitoring, Topology, Helm, SUSE Rancher

Description: Learn how to install SUSE Observability on a Rancher-managed Kubernetes cluster using Helm, configure the receiver, and connect the Rancher UI for topology-aware cluster monitoring.

---

SUSE Observability (formerly StackState) provides topology-aware observability for Kubernetes environments managed by Rancher. It maps relationships between cluster components, tracks changes, and surfaces health issues in context.

---

## Prerequisites

- A Rancher-managed RKE2/Kubernetes cluster supported by the SUSE Observability compatibility matrix
- Kubernetes version supported by the SUSE Observability compatibility matrix on the target cluster
- Helm 3.13.1+
- A SUSE Observability license key
- Resources and storage for your chosen sizing profile; for example, the `10-nonha` profile requests about 7 CPU, 22.7 GiB memory, and 358 GB storage

---

## Step 1: Add the SUSE Observability Helm Repository

```bash
# Add the Helm chart repository

helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Verify the charts are available
helm search repo suse-observability
```

---

## Step 2: Create the Namespace and Values File

```bash
kubectl create namespace suse-observability
```

Create a `values.yaml` file for your installation:

```yaml
# values.yaml
global:
  imageRegistry: "registry.rancher.com"
  # storageClass: "your-storage-class"  # Optional; omit to use the default StorageClass
  suseObservability:
    receiverApiKey: "your-receiver-api-key"   # Optional; generate with: openssl rand -hex 32
    baseUrl: "https://observability.example.com"
    license: "your-license-key"
    adminPassword: "change-me-admin-password"
    sizing:
      profile: "10-nonha"  # Use an HA profile, such as 150-ha, for production

ingress:
  enabled: true
  ingressClassName: nginx
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  path: /
  hosts:
    - host: observability.example.com
  tls:
    - secretName: observability-tls
      hosts:
        - observability.example.com
```

---

## Step 3: Install SUSE Observability

```bash
# Install using Helm
helm upgrade --install suse-observability \
  suse-observability/suse-observability \
  --namespace suse-observability \
  --values values.yaml \
  --timeout 20m \
  --wait

# Monitor the installation progress
kubectl get pods -n suse-observability -w
```

---

## Step 4: Verify the Installation

```bash
# Check all pods are running
kubectl get pods -n suse-observability

# Check the services
kubectl get svc -n suse-observability

# View the Observability API logs
kubectl logs -n suse-observability deployment/suse-observability-api -f
```

---

## Step 5: Install the SUSE Observability Agent on the Monitored Cluster

The agent collects topology, events, logs, changes, and metrics from the monitored Kubernetes cluster. In the SUSE Observability UI, create a Kubernetes StackPack instance first, then use the matching cluster name and API key for the agent:

```bash
# Add or update the SUSE Observability Helm repo
helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability --force-update
helm repo update

# Create agent values
cat > agent-values.yaml << EOF
stackstate:
  apiKey: "your-receiver-api-key"
  cluster:
    name: "production-cluster"
  url: "https://observability.example.com"

clusterAgent:
  enabled: true

logsAgent:
  enabled: true

checksAgent:
  enabled: true
EOF

# Install the agent
helm upgrade --install suse-observability-agent \
  suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --create-namespace \
  --values agent-values.yaml
```

---

## Step 6: Access the Observability UI

```bash
# Get the ingress URL
kubectl get ingress -n suse-observability

# If no ingress is configured, use port-forward
kubectl port-forward -n suse-observability svc/suse-observability-router 8080:8080
# Then access http://localhost:8080
```

Log in as `admin` with the admin password you set in `values.yaml` and verify the monitored cluster appears in the topology view.

---

## Step 7: Verify Data is Flowing

In the Observability UI:

1. Open the main menu and navigate to **Kubernetes**
2. Select **Clusters** and verify your cluster name appears
3. Check that Pods, Services, and Deployments are visible in the topology map
4. Verify metrics are flowing by checking **Health** indicators on components

---

## Best Practices

- Use a dedicated StorageClass with SSD-backed volumes for SUSE Observability persistent volumes - these are I/O intensive components.
- Set the `apiKey` value as a Kubernetes Secret rather than hardcoding it in the values file.
- Install the SUSE Observability agent on every cluster you want to monitor - each cluster needs its own agent deployment.
