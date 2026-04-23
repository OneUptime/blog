# How to Set Up Rancher for Retail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Retail, Edge Computing, k3s, POS, Kubernetes, High Availability

Description: Configure Rancher for retail environments managing Kubernetes clusters at store edge locations, central data centers, and cloud for POS systems, inventory management, and customer-facing...

## Introduction

Retail Kubernetes deployments span multiple environments: cloud clusters for e-commerce and analytics, central data centers for backend systems, and edge K3s clusters at thousands of store locations running POS terminals, inventory systems, and in-store applications. Rancher's fleet management and K3s integration make it ideal for managing retail-scale distributed infrastructure.

## Retail Architecture

```text
Central Data Center
┌─────────────────────────────────────┐
│  Rancher Management                  │
│  + Central Services (ERP, Analytics)│
└────────────────┬────────────────────┘
                 │ manages 1000s of stores
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│Store  │   │Store  │   │Store  │
│K3s    │   │K3s    │   │K3s    │
│cluster│   │cluster│   │cluster│
└───────┘   └───────┘   └───────┘
POS, Kiosk, Inventory, WiFi
```

## Step 1: Deploy Store Edge Clusters with K3s

```bash
# Automated K3s provisioning for store nodes

# Install K3s first, then register the running cluster with Rancher

# Create K3s config before installing the service
mkdir -p /etc/rancher/k3s

cat > /etc/rancher/k3s/config.yaml << 'EOF'
tls-san:
  - 10.100.1.50
node-label:
  - location=store
  - store-id=STORE-1234
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
EOF

# K3s installation at store edge
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --disable traefik --disable servicelb" sh -s -

# After K3s is running, register the cluster in Rancher
```

## Step 2: Manage Store Workloads with Fleet

```yaml
# GitRepo targeting all store clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: store-apps
  namespace: fleet-default
spec:
  repo: https://github.com/myretail/store-apps.git
  branch: main
  paths:
    - store-apps
  targets:
    - name: all-stores
      clusterSelector:
        matchLabels:
          location: store
---
# store-apps/fleet.yaml in that repository
helm:
  values:
    # Per-store customization via cluster labels
    storeId: '${ get .ClusterLabels "store-id" }'
    region: '${ get .ClusterLabels "region" }'
```

## Step 3: Deploy POS Application

```yaml
# POS system deployment on store edge
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pos-terminal
  namespace: store-apps
spec:
  replicas: 2    # Local HA in case one node fails
  selector:
    matchLabels:
      app: pos
  template:
    metadata:
      labels:
        app: pos
        store-id: "STORE-1234"
    spec:
      # Schedule onto store edge nodes
      nodeSelector:
        location: store
      containers:
        - name: pos
          image: myregistry/pos-app:v2.5.0
          ports:
            - containerPort: 8080
          env:
            - name: STORE_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['store-id']
            - name: OFFLINE_MODE
              value: "enabled"    # Support offline operation
          volumeMounts:
            - name: pos-data
              mountPath: /data/transactions
      volumes:
        - name: pos-data
          persistentVolumeClaim:
            claimName: pos-transactions
```

## Step 4: Offline-Capable Applications

Retail edge clusters may lose connectivity. Design for offline operation:

```yaml
# Local Redis cache for offline transaction queuing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-cache
  namespace: store-apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: local-cache
  template:
    metadata:
      labels:
        app: local-cache
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command: ["redis-server", "--save", "60", "1"]
          volumeMounts:
            - name: cache-data
              mountPath: /data
          resources:
            limits:
              memory: "256Mi"
      volumes:
        - name: cache-data
          persistentVolumeClaim:
            claimName: local-cache-data
```

## Step 5: Centralized Monitoring for All Stores

```yaml
# Prometheus configuration on each store cluster
global:
  external_labels:
    store_id: "${STORE_ID}"
    region: "${STORE_REGION}"

remote_write:
  - url: "https://prometheus.retail-hq.com/api/v1/write"

---
# Central alerting rule example
groups:
  - name: retail-stores
    rules:
      - alert: StorePrometheusDown
        expr: up{job="store-prometheus"} == 0
        for: 10m
        annotations:
          summary: "Store Prometheus {{ $labels.store_id }} offline"
```

## Step 6: Automated Store Rollouts

```yaml
# fleet.yaml in the repo watched by Fleet
rolloutStrategy:
  autoPartitionSize: 10%       # Partition stores into 10% rollout waves
  maxUnavailable: 10%          # Pause if more than 10% of a wave is not ready
  maxUnavailablePartitions: 0  # Wait for the current wave before advancing
```

## Retail-Specific Considerations

- **PCI-DSS**: POS clusters handling card payments need network isolation
- **Offline mode**: Store applications must function without WAN connectivity
- **Low-maintenance edge**: Mirror images locally with `/etc/rancher/k3s/registries.yaml`; manage upgrades separately via Rancher or K3s upgrade workflows
- **Fleet for GitOps**: All store app versions managed centrally, deployed via Git
- **Local backups**: Daily backup of transaction data before sync to HQ

## Conclusion

Rancher with K3s is the leading platform for retail edge Kubernetes. Rancher manages thousands of K3s store clusters centrally, while Fleet handles GitOps-based application deployment across all locations simultaneously. Store clusters run offline-capable POS and inventory applications, while central clusters handle analytics, order management, and supply chain systems. The key advantage over traditional retail IT is treating store infrastructure as code-every store is identical, updates are automated, and failures are detected centrally.
