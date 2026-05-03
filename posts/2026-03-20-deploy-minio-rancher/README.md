# How to Deploy Minio on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, MinIO, Object-storage, S3, Kubernetes

Description: Guide to deploying MinIO distributed object storage on Rancher as an S3-compatible storage backend.

## Introduction

This guide covers deploying MinIO on Rancher with production-ready configuration including persistent storage, TLS, and monitoring integration.

## Prerequisites

- Rancher v2.7+ with a Kubernetes cluster
- kubectl and helm configured
- Ingress controller (nginx or traefik)
- Persistent storage class (Longhorn recommended)
- cert-manager for TLS

## Step 1: Add Helm Repository

```bash
# Add the chart repository

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Search for available versions
helm search repo bitnami/minio --versions | head -5
```

## Step 2: Create Namespace and Secrets

```bash
# Create dedicated namespace
kubectl create namespace minio

# Create admin credentials secret
kubectl create secret generic minio-credentials   --namespace minio   --from-literal=root-user=admin   --from-literal=root-password=$(openssl rand -base64 24)
```

## Step 3: Configure Values

```yaml
# minio-values.yaml
# Resource limits
resources:
  limits:
    cpu: "2"
    memory: "2Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"

# Persistent storage
persistence:
  enabled: true
  storageClass: longhorn
  size: 20Gi

# Ingress configuration
ingress:
  enabled: true
  hostname: minio.example.com
  ingressClassName: nginx
  tls: true
  certManager: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

# Authentication (use the secret created in Step 2)
auth:
  existingSecret: minio-credentials

# Replication for HA
mode: distributed
statefulset:
  replicaCount: 4
podDisruptionBudget:
  create: true
  minAvailable: 1
```

## Step 4: Install with Helm

```bash
# Install minio
helm install minio bitnami/minio   --namespace minio   --values minio-values.yaml   --wait   --timeout 10m

# Verify deployment
kubectl get pods -n minio
kubectl get svc -n minio
```

## Step 5: Verify and Access

```bash
# Check all pods are running
kubectl rollout status statefulset/minio -n minio

# Get the admin password
kubectl get secret --namespace minio minio-credentials   -o jsonpath="{.data.root-password}" | base64 --decode

# Check ingress is configured
kubectl get ingress -n minio

# Test accessibility
curl -I https://minio.example.com
```

## Step 6: Configure Backups

```yaml
# minio-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: minio-backup
  namespace: minio
spec:
  schedule: "0 2 * * *"        # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
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
            - |
              # Backup data to S3
              aws s3 sync /data s3://app-backups/minio/$(date +%Y%m%d)/
            volumeMounts:
            - name: data
              mountPath: /data
          restartPolicy: OnFailure
          volumes:
          - name: data
            persistentVolumeClaim:
              claimName: minio-data
```

## Step 7: Configure Monitoring

```yaml
# minio-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: minio-metrics
  namespace: minio
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: minio
  endpoints:
  - port: metrics
    interval: 60s
    path: /metrics
```

## Step 8: Configure Horizontal Pod Autoscaler

```yaml
# minio-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: minio-hpa
  namespace: minio
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: minio
  minReplicas: 4
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Upgrades

```bash
# Upgrade minio
helm upgrade minio bitnami/minio   --namespace minio   --values minio-values.yaml   --reuse-values

# Rollback if needed
helm rollback minio 1 --namespace minio
```

## Conclusion

Deploying MinIO on Rancher provides a production-ready environment with persistent storage, TLS termination, and autoscaling. Rancher's unified management interface gives operations teams visibility into MinIO's health while the Helm-based installation makes upgrades and configuration changes straightforward.
