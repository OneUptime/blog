# How to Deploy Nextcloud on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Nextcloud, File-sharing, Kubernetes, Helm

Description: Guide to deploying Nextcloud on Rancher for self-hosted file sync and collaboration platform.

## Introduction

This guide covers deploying Nextcloud on Rancher with the official Helm chart and production-ready configuration including persistent storage, TLS, and monitoring integration.

## Prerequisites

- Rancher v2.7+ with a Kubernetes cluster
- Kubernetes 1.24+
- kubectl and Helm 3.7+ configured
- Ingress controller (nginx or traefik)
- Persistent storage class (Longhorn recommended)
- cert-manager for TLS

## Step 1: Add Helm Repository

```bash
# Add the chart repository

helm repo add nextcloud https://nextcloud.github.io/helm/
helm repo update

# Search for available versions
helm search repo nextcloud/nextcloud --versions | head -5
```

## Step 2: Create Namespace and Secrets

```bash
# Create dedicated namespace
kubectl create namespace nextcloud

# Create admin credentials secret
kubectl create secret generic nextcloud-secret \
  --namespace nextcloud \
  --from-literal=nextcloud-username=admin \
  --from-literal=nextcloud-password="$(openssl rand -base64 24)"

# Create PostgreSQL credentials secret
kubectl create secret generic nextcloud-db \
  --namespace nextcloud \
  --from-literal=db-username=nextcloud \
  --from-literal=db-password="$(openssl rand -base64 24)" \
  --from-literal=postgres-password="$(openssl rand -base64 24)"
```

## Step 3: Configure Values

```yaml
# nextcloud-values.yaml
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

# Nextcloud configuration
nextcloud:
  host: nextcloud.example.com
  trustedDomains:
    - nextcloud.example.com
  existingSecret:
    enabled: true
    secretName: nextcloud-secret

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  tls:
    - secretName: nextcloud-tls
      hosts:
        - nextcloud.example.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

# Fix generated URLs when TLS terminates at the ingress controller
phpClientHttpsFix:
  enabled: true

# Database
internalDatabase:
  enabled: false

externalDatabase:
  enabled: true
  type: postgresql
  database: nextcloud
  existingSecret:
    enabled: true
    secretName: nextcloud-db

postgresql:
  enabled: true
  global:
    postgresql:
      auth:
        database: nextcloud
        username: nextcloud
        existingSecret: nextcloud-db
        secretKeys:
          adminPasswordKey: postgres-password
          userPasswordKey: db-password
  primary:
    persistence:
      enabled: true
      storageClass: longhorn
      size: 10Gi
```

## Step 4: Install with Helm

```bash
# Install Nextcloud
helm install nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --values nextcloud-values.yaml \
  --version 9.0.5 \
  --wait \
  --timeout 10m

# Verify deployment
kubectl get pods -n nextcloud
kubectl get svc -n nextcloud
```

## Step 5: Verify and Access

```bash
# Check all pods are running
kubectl rollout status deployment/nextcloud -n nextcloud

# Get the admin password
kubectl get secret --namespace nextcloud nextcloud-secret \
  -o jsonpath="{.data.nextcloud-password}" | base64 --decode

# Check ingress is configured
kubectl get ingress -n nextcloud

# Test accessibility
curl -I https://nextcloud.example.com
```

## Step 6: Configure Backups

```yaml
# nextcloud-backup-cronjob.yaml
# Example: back up the Nextcloud data PVC to S3.
# For a full Nextcloud backup, also back up the database, config, custom_apps, and themes.
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nextcloud-backup
  namespace: nextcloud
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
            image: amazon/aws-cli:2
            command:
            - sh
            - -c
            - |
              # Assumes AWS credentials are already available to the pod.
              aws s3 sync /var/www/html/data s3://app-backups/nextcloud/$(date +%Y%m%d)/
            volumeMounts:
            - name: nextcloud-main
              mountPath: /var/www/html
              readOnly: true
          restartPolicy: OnFailure
          volumes:
          - name: nextcloud-main
            persistentVolumeClaim:
              claimName: nextcloud-nextcloud
```

## Step 7: Configure Monitoring

```yaml
# nextcloud-monitoring-values.yaml
metrics:
  enabled: true
  https: false

prometheus:
  serviceMonitor:
    enabled: true
    interval: 60s
    labels:
      release: prometheus
```

```bash
helm upgrade nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --reuse-values \
  --values nextcloud-monitoring-values.yaml
```

## Step 8: Configure Horizontal Pod Autoscaler

```yaml
# nextcloud-hpa-values.yaml
# Requires metrics-server, sticky sessions on the ingress, and storage that supports ReadWriteMany.
persistence:
  accessMode: ReadWriteMany

ingress:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/affinity: cookie

hpa:
  enabled: true
  minPods: 2
  maxPods: 8
  cputhreshold: 70
```

```bash
helm upgrade nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --reuse-values \
  --values nextcloud-hpa-values.yaml
```

## Upgrades

```bash
# Upgrade Nextcloud
helm upgrade nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --values nextcloud-values.yaml \
  --reuse-values

# Rollback if needed
helm rollback nextcloud 1 --namespace nextcloud
```

## Conclusion

Deploying Nextcloud on Rancher provides a production-ready environment with persistent storage, TLS termination, and autoscaling. Rancher's unified management interface gives operations teams visibility into Nextcloud's health while the Helm-based installation makes upgrades and configuration changes straightforward.
