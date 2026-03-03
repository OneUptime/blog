# How to Deploy Harbor Container Registry on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Harbor, Container Registry, Kubernetes, DevOps

Description: A complete guide to deploying Harbor container registry on Talos Linux for hosting private container images with vulnerability scanning and access control.

---

Harbor is an open-source container registry that goes well beyond simple image storage. It provides vulnerability scanning, image signing, replication between registries, role-based access control, and audit logging. When you deploy Harbor on Talos Linux, you get a feature-rich private registry running on a secure, immutable platform. This is particularly valuable for organizations that need to control their container supply chain and cannot rely solely on public registries.

This guide covers deploying Harbor on Talos Linux, configuring it for production use, and integrating it with your development workflow.

## Why Harbor on Talos Linux

Running your own container registry gives you control over your images. You decide what gets stored, who can access it, and which images pass security scanning. Harbor adds enterprise-grade features on top of the basic registry functionality:

- Built-in vulnerability scanning with Trivy
- Image signing and content trust
- Replication to and from other registries
- Robot accounts for CI/CD automation
- Quota management per project
- Comprehensive audit logging

On Talos Linux, the registry runs on infrastructure that cannot be tampered with at the OS level, adding an extra layer of assurance for your image supply chain.

## Prerequisites

Before starting, make sure you have:

- A Talos Linux cluster with at least 3 nodes
- kubectl configured and connected
- Helm v3 installed
- A StorageClass for persistent volumes (Harbor needs significant storage)
- A domain name and TLS certificate for the registry
- At least 100GB of storage for the registry data

## Installing Harbor with Helm

```bash
# Add the Harbor Helm repository
helm repo add harbor https://helm.goharbor.io

# Update the chart cache
helm repo update

# Create the namespace
kubectl create namespace harbor
```

Create a comprehensive values file for production deployment.

```yaml
# harbor-values.yaml
expose:
  type: ingress
  tls:
    enabled: true
    certSource: secret
    secret:
      secretName: harbor-tls
  ingress:
    hosts:
      core: registry.example.com
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/proxy-body-size: "0"
      nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
      nginx.ingress.kubernetes.io/proxy-send-timeout: "600"

externalURL: https://registry.example.com

# Harbor admin password
harborAdminPassword: "change-this-password"

# Internal communication secret
secretKey: "a-sixteen-char-k"

# Persistence configuration
persistence:
  enabled: true
  persistentVolumeClaim:
    registry:
      storageClass: local-path
      size: 200Gi
    database:
      storageClass: local-path
      size: 10Gi
    redis:
      storageClass: local-path
      size: 5Gi
    trivy:
      storageClass: local-path
      size: 10Gi

# Database configuration
database:
  type: internal
  internal:
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1
        memory: 1Gi

# Redis configuration
redis:
  type: internal
  internal:
    resources:
      requests:
        cpu: 100m
        memory: 256Mi

# Core service
core:
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 512Mi

# Registry
registry:
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 2
      memory: 1Gi

# Trivy vulnerability scanner
trivy:
  enabled: true
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1
      memory: 1Gi

# Job service for async tasks
jobservice:
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 512Mi

# Notary for image signing (optional)
notary:
  enabled: true
```

```bash
# Install Harbor
helm install harbor \
  harbor/harbor \
  --namespace harbor \
  -f harbor-values.yaml

# Wait for all pods to be running
kubectl get pods -n harbor -w

# This takes a few minutes as it deploys:
# harbor-core
# harbor-database
# harbor-jobservice
# harbor-portal
# harbor-redis
# harbor-registry
# harbor-trivy
```

## Verifying the Installation

```bash
# Check all Harbor pods
kubectl get pods -n harbor

# Check the services
kubectl get svc -n harbor

# Test access to the Harbor UI
# Open https://registry.example.com in your browser
# Login with admin / your-configured-password
```

## Configuring Harbor

### Creating a Project

Projects in Harbor organize images and control access.

```bash
# Create a project using the Harbor API
curl -k -u admin:your-password \
  -X POST "https://registry.example.com/api/v2.0/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "myorg",
    "public": false,
    "storage_limit": -1,
    "metadata": {
      "auto_scan": "true",
      "severity": "high"
    }
  }'
```

### Creating Robot Accounts for CI/CD

Robot accounts provide automated access for CI/CD pipelines.

```bash
# Create a robot account via the API
curl -k -u admin:your-password \
  -X POST "https://registry.example.com/api/v2.0/robots" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-builder",
    "duration": -1,
    "level": "project",
    "permissions": [
      {
        "namespace": "myorg",
        "kind": "project",
        "access": [
          {"resource": "repository", "action": "push"},
          {"resource": "repository", "action": "pull"},
          {"resource": "tag", "action": "create"},
          {"resource": "artifact", "action": "read"}
        ]
      }
    ]
  }'

# Save the returned token securely
```

### Configuring Vulnerability Scanning

Harbor's built-in Trivy scanner automatically scans images when they are pushed.

```bash
# Enable automatic scanning for a project
curl -k -u admin:your-password \
  -X PUT "https://registry.example.com/api/v2.0/projects/myorg" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "auto_scan": "true",
      "severity": "critical"
    }
  }'

# Manually trigger a scan on an image
curl -k -u admin:your-password \
  -X POST "https://registry.example.com/api/v2.0/projects/myorg/repositories/myapp/artifacts/latest/scan"

# Check scan results
curl -k -u admin:your-password \
  "https://registry.example.com/api/v2.0/projects/myorg/repositories/myapp/artifacts/latest/additions/vulnerabilities"
```

## Pushing Images to Harbor

Configure Docker or containerd to use your Harbor instance.

```bash
# Log in to Harbor
docker login registry.example.com -u admin -p your-password

# Tag and push an image
docker tag myapp:latest registry.example.com/myorg/myapp:v1.0.0
docker push registry.example.com/myorg/myapp:v1.0.0

# Or with Kaniko in a CI pipeline
# /kaniko/executor \
#   --destination=registry.example.com/myorg/myapp:v1.0.0
```

## Configuring Kubernetes to Pull from Harbor

Create a pull secret for your Kubernetes cluster.

```bash
# Create an image pull secret
kubectl create secret docker-registry harbor-pull-secret \
  --namespace default \
  --docker-server=registry.example.com \
  --docker-username=robot-account-name \
  --docker-password=robot-account-token
```

Reference the secret in your deployments.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      imagePullSecrets:
        - name: harbor-pull-secret
      containers:
        - name: app
          image: registry.example.com/myorg/myapp:v1.0.0
          ports:
            - containerPort: 8080
```

## Setting Up Image Replication

Replicate images between Harbor instances or from external registries.

```bash
# Create a replication rule to pull from Docker Hub
curl -k -u admin:your-password \
  -X POST "https://registry.example.com/api/v2.0/replication/policies" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dockerhub-proxy",
    "src_registry": {
      "id": 1
    },
    "dest_namespace": "library",
    "trigger": {
      "type": "scheduled",
      "trigger_settings": {
        "cron": "0 0 * * *"
      }
    },
    "filters": [
      {
        "type": "name",
        "value": "library/nginx"
      },
      {
        "type": "tag",
        "value": "stable*"
      }
    ],
    "enabled": true
  }'
```

## Garbage Collection

Over time, deleted images leave unreferenced layers. Run garbage collection to reclaim storage.

```bash
# Trigger garbage collection via the API
curl -k -u admin:your-password \
  -X POST "https://registry.example.com/api/v2.0/system/gc/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": {
      "type": "Weekly",
      "cron": "0 0 0 * * 0"
    },
    "parameters": {
      "delete_untagged": true
    }
  }'
```

## Monitoring Harbor

Harbor exposes metrics for Prometheus monitoring.

```yaml
# harbor-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: harbor
  namespace: harbor
spec:
  selector:
    matchLabels:
      app: harbor
  endpoints:
    - port: metrics
      interval: 30s
```

```bash
# Check Harbor component health
curl -k "https://registry.example.com/api/v2.0/health"

# Check storage usage
curl -k -u admin:your-password \
  "https://registry.example.com/api/v2.0/statistics"
```

## Backup and Recovery

Back up Harbor's database and configuration regularly.

```bash
# Back up the Harbor database
kubectl exec -n harbor harbor-database-0 -- \
  pg_dump -U postgres registry > harbor-db-backup.sql

# Back up Harbor's configuration
kubectl get secret -n harbor harbor-core -o yaml > harbor-core-secret.yaml
kubectl get configmap -n harbor -o yaml > harbor-configmaps.yaml
```

## Wrapping Up

Harbor on Talos Linux gives you a full-featured private container registry on a hardened, immutable platform. With built-in vulnerability scanning, image signing, role-based access control, and replication, Harbor covers the entire container image lifecycle from build to deployment. The combination of Harbor's supply chain security features and Talos Linux's immutable infrastructure creates a registry environment where you have complete control and visibility over every image in your organization. Start with a single project, configure automatic scanning, set up robot accounts for your CI/CD pipelines, and gradually expand as your container ecosystem grows.
