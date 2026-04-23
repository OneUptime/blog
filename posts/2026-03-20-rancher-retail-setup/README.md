# How to Set Up Rancher for Retail - Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Retail, PCI-DSS, Edge, Kubernetes, Point-of-sale

Description: A practical guide to deploying Rancher for retail environments, covering in-store edge deployments, POS systems, PCI DSS compliance, and centralized fleet management.

## Overview

Retail organizations are modernizing store infrastructure with Kubernetes, deploying containerized applications at scale across hundreds or thousands of store locations. Rancher, with its Fleet multi-cluster management and K3s edge support, is well-suited for retail edge deployments. This guide covers setting up Rancher for retail environments, from headquarters to individual store locations.

## Architecture Overview

A typical retail Rancher deployment includes:

```text
Headquarters (Data Center)
└── Rancher Management Server (RKE2 HA cluster)
    ├── Fleet GitOps Controller
    ├── NeuVector Security
    └── Rancher Monitoring

Regional Hubs
└── RKE2 Clusters (3+ nodes)

Individual Store Locations
└── K3s Clusters (1-3 nodes per store)
    ├── POS Application
    ├── Inventory Management
    └── Digital Signage
```

## Step 1: Set Up Store Edge Clusters with K3s

Each retail store runs a K3s cluster on minimal hardware:

```bash
# Install K3s on a store server (single-node example;
# use 3 server nodes for embedded-etcd HA)

curl -sfL https://get.k3s.io | sh -s - \
  --node-label="location=store" \
  --node-label="store-id=NYC-001" \
  --node-label="region=northeast" \
  --tls-san="store-nyc-001.retail.internal"

# Register store cluster with Rancher HQ
# Copy the cluster-specific kubectl command from the Rancher UI
kubectl apply -f https://rancher.hq.retail.com/v3/import/<cluster-registration-token>.yaml

# After registration, add Rancher/Fleet cluster labels such as:
# location=store, store-id=NYC-001, region=northeast
```

## Step 2: Fleet Configuration for Store Deployments

```yaml
# Fleet GitRepo for store application deployments
# Fleet targets labels on the registered cluster resource.
# Use each app bundle's fleet.yaml targetCustomizations for per-region overrides.
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: store-applications
  namespace: fleet-default
spec:
  repo: https://git.retail.internal/store-apps
  branch: production
  targets:
    - name: all-stores
      clusterSelector:
        matchLabels:
          location: store
  paths:
    - apps/pos
    - apps/inventory
    - apps/signage
```

## Step 3: POS Application Deployment

```yaml
# Point-of-Sale application deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pos-terminal
  namespace: retail-pos
spec:
  replicas: 1    # Use a single replica when backing the workload with a shared local PVC
  selector:
    matchLabels:
      app: pos
  template:
    metadata:
      labels:
        app: pos
        store-id: NYC-001
    spec:
      containers:
        - name: pos-app
          image: registry.retail.internal/pos:v2.4.1
          env:
            - name: STORE_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['store-id']
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: pos-secrets
                  key: database-url
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          # POS terminals need persistent local storage
          volumeMounts:
            - name: pos-data
              mountPath: /var/lib/pos
      volumes:
        - name: pos-data
          persistentVolumeClaim:
            claimName: pos-local-pvc
```

## Step 4: PCI DSS Network Isolation for POS

POS systems handling card data must be isolated:

```yaml
# Network isolation for POS namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: pos-pci-isolation
  namespace: retail-pos
spec:
  podSelector:
    matchLabels:
      app: pos
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Only allow traffic from the payment gateway
    - from:
        - ipBlock:
            cidr: 10.0.1.0/28   # Payment gateway subnet
      ports:
        - port: 8443
  egress:
    # Only allow outbound to payment processor and store backend
    - to:
        - ipBlock:
            cidr: 192.168.100.0/24  # Payment processor
      ports:
        - port: 443
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: retail-apps
          podSelector:
            matchLabels:
              app: store-backend
      ports:
        - port: 5432
```

## Step 5: Digital Signage Management

```yaml
# Digital signage deployment across all stores
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digital-signage
  namespace: retail-apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: signage
  template:
    metadata:
      labels:
        app: signage
    spec:
      containers:
        - name: signage
          image: registry.retail.internal/signage:v1.5.2
          env:
            - name: CONTENT_SERVER
              value: "https://cdn.retail.internal"
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
```

## Step 6: Inventory Management

```yaml
# Inventory sync deployment with HQ
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-sync
  namespace: retail-apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: inventory
  template:
    metadata:
      labels:
        app: inventory
    spec:
      containers:
        - name: inventory
          image: registry.retail.internal/inventory:v3.1.0
          env:
            - name: SYNC_INTERVAL
              value: "300"    # Sync every 5 minutes
            - name: HQ_API_URL
              value: "https://hq-api.retail.internal/v1/inventory"
```

## Step 7: Monitoring Store Health

```yaml
# ServiceMonitor for store application metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: store-apps
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  jobLabel: app
  namespaceSelector:
    matchNames:
      - retail-apps
      - retail-pos
  selector:
    matchLabels:
      monitoring: "true"
  endpoints:
    - port: metrics
      interval: 30s
```

Configure Rancher alerts for store-specific SLAs:

```yaml
# Alert if POS app is down at any store
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: store-pos-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: pos-availability
      rules:
        - alert: POSAppDown
          expr: up{job="pos", namespace="retail-pos"} == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "POS metrics target {{ $labels.instance }} is down"
```

## Step 8: Over-the-Air Updates

Use Fleet to perform rolling updates across all store clusters:

```yaml
# Update fleet.yaml to the new image version.
# Fleet processes partitions in order, so put the canary group first.
# Keep the cluster groups mutually exclusive and make sure they cover all targets.

rolloutStrategy:
  maxUnavailablePartitions: 0
  partitions:
    - name: canary-stores
      maxUnavailable: 10%
      clusterGroup: canary-stores
    - name: remaining-stores
      maxUnavailable: 10%
      clusterGroup: remaining-stores
```

## Conclusion

Rancher's combination of K3s for lightweight edge clusters and Fleet for centralized management makes it ideal for retail deployments spanning hundreds of store locations. The ability to deploy, update, and monitor all store applications from a single control plane dramatically reduces operational overhead. PCI DSS compliance requirements for POS systems can be further supported through network isolation, secrets encryption at rest, and audit logging. This architecture enables retailers to treat their store infrastructure as a modern cloud-native platform.
