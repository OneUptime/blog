# How to Deploy Prometheus Stack on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Prometheus, Monitoring, Alertmanager, Kubernetes

Description: Guide to deploying the full Prometheus monitoring stack on Rancher for comprehensive cluster observability.

## Introduction

How to Deploy Prometheus Stack on Rancher on Rancher gives your team a production-ready deployment with enterprise-grade cluster management, monitoring, and access control. This guide walks through a complete setup.

## Prerequisites

- Rancher v2.7+ managing a Kubernetes 1.25+ cluster
- Helm 3.x
- Persistent storage (Longhorn)
- Ingress controller (nginx)
- cert-manager

## Step 1: Prepare Namespace

```bash
kubectl create namespace prometheus-stack

# Configure project in Rancher

kubectl annotate namespace prometheus-stack   field.cattle.io/projectId=YOUR_PROJECT_ID
```

## Step 2: Install with Helm

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus-stack prometheus-community/kube-prometheus-stack   --namespace prometheus-stack   -f prometheus-stack-values.yaml   --wait
```

## Step 3: Configure Values

```yaml
# prometheus-stack-values.yaml
prometheus:
  prometheusSpec:
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: longhorn
          accessModes:
          - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
  ingress:
    enabled: true
    ingressClassName: nginx
    hosts:
    - prometheus-stack.example.com
    tls:
    - secretName: prometheus-stack-tls-secret
      hosts:
      - prometheus-stack.example.com
```

## Step 4: Configure TLS Certificate

```yaml
# prometheus-stack-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: prometheus-stack-tls
  namespace: prometheus-stack
spec:
  secretName: prometheus-stack-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - prometheus-stack.example.com
```

## Step 5: Configure Resource Limits

```yaml
# Apply ResourceQuota to namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: prometheus-stack-quota
  namespace: prometheus-stack
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    persistentvolumeclaims: "5"
```

## Step 6: Verify Monitoring

```bash
# Verify the Prometheus custom resource and built-in ServiceMonitors
kubectl get prometheus -n prometheus-stack
kubectl get servicemonitors -n prometheus-stack
```

## Step 7: Configure Backup Policy

```yaml
# Requires Velero to be installed with volume snapshots configured
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: prometheus-stack-backup
  namespace: velero
spec:
  schedule: "0 3 * * *"
  template:
    includedNamespaces:
    - prometheus-stack
    snapshotVolumes: true
```

## Step 8: Test the Deployment

```bash
# Verify pod status
kubectl get pods -n prometheus-stack

# Check ingress
kubectl get ingress -n prometheus-stack

# Test readiness endpoint
curl -L https://prometheus-stack.example.com/-/ready

# View application logs
POD_NAME=$(kubectl get pods -n prometheus-stack -l app.kubernetes.io/instance=prometheus-stack -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n prometheus-stack "$POD_NAME" --tail=50
```

## Upgrading

```bash
# Upgrade to latest version
helm repo update
helm upgrade prometheus-stack prometheus-community/kube-prometheus-stack   --namespace prometheus-stack   --reuse-values   --wait

# Check upgrade status
helm status prometheus-stack -n prometheus-stack
kubectl get pods -n prometheus-stack
```

## Conclusion

How to Deploy Prometheus Stack on Rancher on Rancher benefits from centralized management, unified monitoring, and enterprise RBAC. The Helm-based installation makes configuration management straightforward, while Rancher's project system enables multi-team governance of the deployment.
