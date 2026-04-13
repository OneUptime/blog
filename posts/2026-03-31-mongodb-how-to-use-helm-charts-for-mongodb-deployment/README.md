# How to Use Helm Charts for MongoDB Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Helm, Kubernetes, Bitnami, Deployment

Description: Deploy MongoDB on Kubernetes using Helm charts from Bitnami with customized values for replica sets, authentication, and persistent storage.

---

## Overview

Helm is the package manager for Kubernetes that simplifies deploying complex applications like MongoDB. Instead of writing many YAML manifests manually, you install a Helm chart with a values file that customizes the deployment. The Bitnami MongoDB Helm chart is the most widely used option and supports standalone, replica set, and sharded cluster configurations.

## Prerequisites

- Kubernetes cluster (minikube, EKS, GKE, or AKS)
- Helm 3.x installed
- `kubectl` configured

## Step 1 - Add the Bitnami Repository

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Browse available MongoDB chart versions
helm search repo bitnami/mongodb --versions | head -10
```

## Step 2 - Install MongoDB with Default Settings

```bash
# Quick install for development
helm install my-mongodb bitnami/mongodb \
  --namespace mongodb \
  --create-namespace \
  --set auth.rootPassword=rootpass123
```

## Step 3 - Create a Custom values.yaml

For production, create a values file:

```yaml
# mongodb-values.yaml
architecture: replicaset
replicaCount: 3

auth:
  enabled: true
  rootUser: root
  rootPassword: "RootPassword123!"
  usernames:
    - appuser
  passwords:
    - "AppPassword456!"
  databases:
    - myapp
  replicaSetKey: "ReplicaSetKey789"

replicaSetName: rs0
replicaSetHostnames: true

persistence:
  enabled: true
  storageClass: ""
  accessModes:
    - ReadWriteOnce
  size: 20Gi

resources:
  requests:
    cpu: 300m
    memory: 512Mi
  limits:
    cpu: 2
    memory: 4Gi

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: monitoring

readinessProbe:
  enabled: true
  initialDelaySeconds: 30
  periodSeconds: 20

livenessProbe:
  enabled: true
  initialDelaySeconds: 30
  periodSeconds: 20

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9216"
```

## Step 4 - Install with Custom Values

```bash
helm install my-mongodb bitnami/mongodb \
  --namespace mongodb \
  --create-namespace \
  --values mongodb-values.yaml

# Monitor the installation
kubectl -n mongodb rollout status statefulset/my-mongodb
```

## Step 5 - Get Connection Details

```bash
# Get the root password from secret
kubectl -n mongodb get secret my-mongodb \
  -o jsonpath="{.data.mongodb-root-password}" | base64 -d

# Get the connection string
echo "mongodb://root:$(kubectl -n mongodb get secret my-mongodb \
  -o jsonpath='{.data.mongodb-root-password}' | base64 -d)@my-mongodb.mongodb.svc.cluster.local:27017/admin?replicaSet=rs0"
```

Connect using mongosh:

```bash
kubectl -n mongodb exec -it my-mongodb-0 -- mongosh \
  --username root \
  --password RootPassword123! \
  --authenticationDatabase admin
```

## Step 6 - Upgrade the Helm Release

To change configuration or upgrade MongoDB version:

```bash
# Update values.yaml, then upgrade
helm upgrade my-mongodb bitnami/mongodb \
  --namespace mongodb \
  --values mongodb-values.yaml \
  --reuse-values

# Or update to a newer chart version
helm upgrade my-mongodb bitnami/mongodb \
  --namespace mongodb \
  --version 15.6.0 \
  --values mongodb-values.yaml
```

## Step 7 - Check Release History and Rollback

```bash
# View release history
helm -n mongodb history my-mongodb

# Rollback to previous version if needed
helm -n mongodb rollback my-mongodb 1
```

## Step 8 - Configure External Access

```yaml
# Add to mongodb-values.yaml for external access
externalAccess:
  enabled: true
  service:
    type: LoadBalancer
    port: 27017
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

## Step 9 - Uninstall

```bash
helm -n mongodb uninstall my-mongodb

# Note: PVCs are not deleted by default - delete manually if desired
kubectl -n mongodb delete pvc -l app.kubernetes.io/instance=my-mongodb
```

## Summary

Helm charts dramatically reduce the complexity of deploying MongoDB on Kubernetes by packaging all the required manifests into a single installable unit. The Bitnami MongoDB chart supports replica sets, sharded clusters, metrics exporters, and persistent volumes through a single values file. Use `helm upgrade` for configuration changes and version upgrades, and `helm rollback` to quickly revert problematic changes.
