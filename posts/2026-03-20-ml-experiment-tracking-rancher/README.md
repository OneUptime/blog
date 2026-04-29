# How to Set Up ML Experiment Tracking on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, MLflow, Experiment-tracking, MLOps, Kubernetes

Description: Guide to setting up comprehensive ML experiment tracking on Rancher with MLflow and W&B integration.

## Introduction

This guide covers How to Set Up ML Experiment Tracking on Rancher in a production Rancher environment, with practical examples and best practices.

## Prerequisites

- Rancher v2.7+ with a working Kubernetes cluster
- kubectl and helm configured
- Persistent storage (Longhorn or NFS recommended)

## Architecture Overview

Deploying this component on Rancher follows Kubernetes-native patterns: using Helm charts for installation, ConfigMaps for configuration, Secrets for credentials, and PersistentVolumeClaims for data storage.

## Step 1: Install via Helm

```bash
# Add the appropriate Helm repository

helm repo add community-charts https://community-charts.github.io/helm-charts
helm repo update

# Create namespace
kubectl create namespace mlops

# Install with custom values
helm install ml-experiment-tracking-rancher community-charts/mlflow   --namespace mlops   --set persistence.enabled=true   --set persistence.storageClass=longhorn
```

## Step 2: Configure Storage

```yaml
# storage-config.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-storage
  namespace: mlops
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: longhorn
```

## Step 3: Configure Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: service-ingress
  namespace: mlops
spec:
  rules:
  - host: service.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service-name
            port:
              number: 8080
  tls:
  - hosts:
    - service.example.com
    secretName: service-tls
```

## Step 4: Configure Authentication

```bash
# Create credentials secret
kubectl create secret generic service-credentials   --namespace mlops   --from-literal=username=admin   --from-literal=password=$(openssl rand -base64 16)
```

## Step 5: Verify Deployment

```bash
# Check pods are running
kubectl get pods -n mlops

# Test service connectivity
kubectl port-forward svc/service-name -n mlops 8080:8080 &
curl -s http://localhost:8080/health

# Check logs
kubectl logs -n mlops   -l app=service-name   --tail=50
```

## Step 6: Configure Monitoring

```yaml
# service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: service-monitor
  namespace: mlops
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: service-name
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## Step 7: Configure Backup

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: service-backup
  namespace: mlops
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - sh
            - -c
            - aws s3 sync /data s3://mlops-backups/$(date +%Y%m%d)/
          restartPolicy: OnFailure
```

## Integration with Rancher Projects

Use Rancher's project system to organize ML workloads:

```bash
# Apply project labels for Rancher management
kubectl label namespace mlops   field.cattle.io/projectId=YOUR_PROJECT_ID

# View in Rancher UI under Projects > mlops
```

## Conclusion

Deploying How to Set Up ML Experiment Tracking on Rancher on Rancher provides a production-ready ML infrastructure component with enterprise-grade management capabilities. Combine with Rancher's monitoring, logging, and access control features for a complete MLOps platform.
