# How to Deploy Grafana on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Grafana, Monitoring, Dashboard, Kubernetes

Description: Complete guide to deploying Grafana on Rancher for metrics visualization and operational dashboards.

## Introduction

How to Deploy Grafana on Rancher on Rancher gives your team a production-ready deployment with enterprise-grade cluster management, monitoring, and access control. This guide walks through a complete setup.

## Prerequisites

- Rancher v2.7+ cluster
- Helm 3.x
- Persistent storage (Longhorn)
- Ingress controller (nginx)
- cert-manager

## Step 1: Prepare Namespace

```bash
kubectl create namespace grafana

# Configure project in Rancher

kubectl annotate namespace grafana   field.cattle.io/projectId=YOUR_PROJECT_ID
```

## Step 2: Install with Helm

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install grafana bitnami/grafana   --namespace grafana   --set persistence.enabled=true   --set persistence.storageClass=longhorn   --set ingress.enabled=true   --set ingress.hostname=grafana.example.com   --set ingress.tls=true   --wait
```

## Step 3: Configure Storage

```yaml
# grafana-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-data
  namespace: grafana
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: longhorn
```

## Step 4: Configure TLS Certificate

```yaml
# grafana-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: grafana-tls
  namespace: grafana
spec:
  secretName: grafana-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - grafana.example.com
```

## Step 5: Configure Resource Limits

```yaml
# Apply ResourceQuota to namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: grafana-quota
  namespace: grafana
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    persistentvolumeclaims: "5"
```

## Step 6: Set Up Monitoring

```bash
# Check if metrics endpoint is available
kubectl exec -n grafana   $(kubectl get pods -n grafana -o name | head -1)   -- curl -s http://localhost:3000/metrics | head -20

# Create ServiceMonitor
kubectl apply -f - << SMEOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: grafana-monitor
  namespace: grafana
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: grafana
  endpoints:
  - port: http
    path: /metrics
    interval: 60s
SMEOF
```

## Step 7: Configure Backup Policy

```yaml
# Backup using Velero or custom CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: grafana-backup
  namespace: grafana
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-sa
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - sh
            - -c
            - |
              echo "Creating grafana backup..."
              kubectl exec -n grafana                 $(kubectl get pod -n grafana -l app.kubernetes.io/name=grafana -o name | head -1)                 -- tar -czf /tmp/grafana-backup.tar.gz -C /opt/bitnami/grafana data
          restartPolicy: OnFailure
```

## Step 8: Test the Deployment

```bash
# Verify pod status
kubectl get pods -n grafana

# Check ingress
kubectl get ingress -n grafana

# Test HTTP response
curl -L https://grafana.example.com/

# View application logs
kubectl logs -n grafana   $(kubectl get pods -n grafana -l app.kubernetes.io/name=grafana -o name | head -1)   --tail=50
```

## Upgrading

```bash
# Upgrade to latest version
helm repo update
helm upgrade grafana bitnami/grafana   --namespace grafana   --reuse-values

# Check upgrade status
kubectl rollout status deployment/grafana -n grafana
```

## Conclusion

How to Deploy Grafana on Rancher on Rancher benefits from centralized management, unified monitoring, and enterprise RBAC. The Helm-based installation makes configuration management straightforward, while Rancher's project system enables multi-team governance of the deployment.
