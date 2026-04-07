# How to Deploy WordPress on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, WordPress, CMS, Kubernetes, Helm

Description: Complete guide to deploying WordPress with MySQL on Rancher for scalable web content management.

## Introduction

This guide covers deploying WordPress on Rancher with production-ready configuration including persistent storage, TLS, and monitoring integration.

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
helm search repo bitnami/wordpress --versions | head -5
```

## Step 2: Create Namespace and Secrets

```bash
# Create dedicated namespace
kubectl create namespace wordpress

# Create admin credentials secret
kubectl create secret generic wordpress-credentials   --namespace wordpress   --from-literal=admin-password=$(openssl rand -base64 24)   --from-literal=db-password=$(openssl rand -base64 24)
```

## Step 3: Configure Values

```yaml
# wordpress-values.yaml
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
  hostname: wordpress.example.com
  ingressClassName: nginx
  tls: true
  certManager: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

# Database
mariadb:
  enabled: true
  auth:
    rootPassword: "${DB_ROOT_PASSWORD}"
    password: "${DB_PASSWORD}"
  primary:
    persistence:
      enabled: true
      storageClass: longhorn
      size: 10Gi

# Replication for HA
replicaCount: 2
podDisruptionBudget:
  enabled: true
  minAvailable: 1
```

## Step 4: Install with Helm

```bash
# Install WordPress
helm install wordpress bitnami/wordpress   --namespace wordpress   --values wordpress-values.yaml   --wait   --timeout 10m

# Verify deployment
kubectl get pods -n wordpress
kubectl get svc -n wordpress
```

## Step 5: Verify and Access

```bash
# Check all pods are running
kubectl rollout status deployment/wordpress -n wordpress

# Get the admin password
kubectl get secret --namespace wordpress wordpress-credentials   -o jsonpath="{.data.admin-password}" | base64 --decode

# Check ingress is configured
kubectl get ingress -n wordpress

# Test accessibility
curl -I https://wordpress.example.com
```

## Step 6: Configure Backups

```yaml
# wordpress-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: wordpress-backup
  namespace: wordpress
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
              aws s3 sync /data s3://app-backups/wordpress/$(date +%Y%m%d)/
          restartPolicy: OnFailure
          volumes:
          - name: data
            persistentVolumeClaim:
              claimName: wordpress-data
```

## Step 7: Configure Monitoring

```yaml
# wordpress-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: wordpress-metrics
  namespace: wordpress
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: wordpress
  endpoints:
  - port: metrics
    interval: 60s
    path: /metrics
```

## Step 8: Configure Horizontal Pod Autoscaler

```yaml
# wordpress-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: wordpress-hpa
  namespace: wordpress
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: wordpress
  minReplicas: 2
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
# Upgrade WordPress
helm upgrade wordpress bitnami/wordpress   --namespace wordpress   --values wordpress-values.yaml   --reuse-values

# Rollback if needed
helm rollback wordpress 1 --namespace wordpress
```

## Conclusion

Deploying WordPress on Rancher provides a production-ready environment with persistent storage, TLS termination, and autoscaling. Rancher's unified management interface gives operations teams visibility into WordPress's health while the Helm-based installation makes upgrades and configuration changes straightforward.
