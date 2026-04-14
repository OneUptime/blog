# How to Use Dapr with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rancher, Kubernetes, Helm, Multi-Cluster

Description: Install and manage Dapr on Kubernetes clusters managed by Rancher using the Rancher App Catalog and Helm charts with multi-cluster deployment support.

---

Rancher simplifies Kubernetes management across multiple clusters. Dapr integrates with Rancher through its Helm chart support, allowing you to deploy and manage Dapr across all your Rancher-managed clusters from a central interface.

## Installing Dapr via Rancher App Catalog

Add the Dapr Helm repository to Rancher:

1. In the Rancher UI, navigate to your cluster and go to **Apps and Marketplace** > **Repositories**
2. Click **Create** and add:
   - Name: `dapr`
   - Index URL: `https://dapr.github.io/helm-charts/`
3. After the repo syncs, go to **Charts** and search for `dapr`

Or via the Rancher CLI:

```bash
# Log in to Rancher
rancher login https://rancher.company.com \
  --token <api-token>

# Add Dapr helm repo
rancher catalog add dapr https://dapr.github.io/helm-charts/

# Install Dapr
rancher app install dapr dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true
```

## Installing via kubectl in Rancher Context

Rancher provides kubeconfig files per cluster. Use them directly:

```bash
# Download kubeconfig for cluster
# In Rancher UI: Cluster > Kubeconfig File

# Install Dapr using the cluster kubeconfig
KUBECONFIG=~/Downloads/cluster-kubeconfig.yaml \
  helm upgrade --install dapr dapr/dapr \
    --namespace dapr-system \
    --create-namespace \
    --set global.ha.enabled=true \
    --wait
```

## Multi-Cluster Dapr Deployment with Rancher

Deploy Dapr to multiple clusters using a script:

```bash
#!/bin/bash
# deploy-dapr-multi-cluster.sh

CLUSTERS=("prod-us-east" "prod-eu-west" "staging")
DAPR_VERSION="1.14.0"

for CLUSTER in "${CLUSTERS[@]}"; do
  echo "Deploying Dapr to cluster: $CLUSTER"

  # Get kubeconfig for cluster
  rancher clusters kubeconfig "$CLUSTER" > /tmp/kubeconfig-$CLUSTER.yaml

  KUBECONFIG="/tmp/kubeconfig-$CLUSTER.yaml" \
    helm upgrade --install dapr dapr/dapr \
      --namespace dapr-system \
      --create-namespace \
      --version "$DAPR_VERSION" \
      --set global.ha.enabled=true \
      --wait

  echo "Dapr deployed to $CLUSTER"
done
```

## Rancher Projects and Dapr Namespaces

Rancher uses Projects to organize namespaces. Create a dedicated project for Dapr workloads:

```bash
# Create Rancher project for Dapr workloads
rancher projects create \
  --cluster <cluster-id> \
  --name "Dapr Applications" \
  --description "Microservices using Dapr"

# Create namespace within the project
rancher namespaces create \
  --project "Dapr Applications" \
  dapr-apps
```

## Monitoring Dapr with Rancher Monitoring

Rancher's built-in monitoring stack (Prometheus + Grafana) integrates with Dapr metrics:

```yaml
# ServiceMonitor for Rancher monitoring
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-system-monitor
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
    - dapr-system
  selector:
    matchLabels:
      app: dapr-operator
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

## Deploying Dapr Applications

Deploy applications with Dapr annotations using Rancher workload UI or kubectl:

```yaml
# workload.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: dapr-apps
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        ports:
        - containerPort: 8080
```

```bash
KUBECONFIG=cluster-kubeconfig.yaml kubectl apply -f workload.yaml
```

## Summary

Dapr integrates with Rancher through standard Helm chart deployment, supporting both single-cluster and multi-cluster deployment patterns. Rancher's Projects and Namespaces provide organizational boundaries for Dapr workloads, while the built-in monitoring stack with ServiceMonitor resources enables Dapr metrics collection across all managed clusters.
