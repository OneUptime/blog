# How to Deploy Harbor Registry on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Harbor, Container-registry, Kubernetes, Helm

Description: Complete guide to deploying Harbor container registry on Rancher for private image management and vulnerability scanning.

## Introduction

How to Deploy Harbor Registry on Rancher on Rancher gives your team a production-ready deployment with enterprise-grade cluster management, monitoring, and access control. This guide walks through a complete setup.

## Prerequisites

- Rancher v2.7+ cluster
- Helm 3.x
- Persistent storage (Longhorn)
- Ingress controller (nginx)
- cert-manager

## Step 1: Prepare Namespace

```bash
kubectl create namespace harbor-registry

# Configure project in Rancher

kubectl annotate namespace harbor-registry   field.cattle.io/projectId=YOUR_PROJECT_ID
```

## Step 2: Install with Helm

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install harbor-registry bitnami/harbor   --namespace harbor-registry   --set persistence.enabled=true   --set persistence.persistentVolumeClaim.registry.storageClass=longhorn   --set persistence.persistentVolumeClaim.jobservice.storageClass=longhorn   --set persistence.persistentVolumeClaim.database.storageClass=longhorn   --set persistence.persistentVolumeClaim.redis.storageClass=longhorn   --set persistence.persistentVolumeClaim.trivy.storageClass=longhorn   --set exposureType=ingress   --set ingress.core.hostname=harbor-registry.example.com   --set ingress.core.tls=true   --wait
```

## Step 3: Configure Storage

```yaml
# harbor-registry-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: harbor-registry-data
  namespace: harbor-registry
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
# harbor-registry-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: harbor-registry-tls
  namespace: harbor-registry
spec:
  secretName: harbor-registry-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - harbor-registry.example.com
```

## Step 5: Configure Resource Limits

```yaml
# Apply ResourceQuota to namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: harbor-registry-quota
  namespace: harbor-registry
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
kubectl exec -n harbor-registry   $(kubectl get pods -n harbor-registry -o name | head -1)   -- curl -s http://localhost:9090/metrics | head -20

# Create ServiceMonitor
kubectl apply -f - << SMEOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: harbor-registry-monitor
  namespace: harbor-registry
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: harbor-registry
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
  name: harbor-registry-backup
  namespace: harbor-registry
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
              echo "Creating harbor-registry backup..."
              kubectl exec -n harbor-registry                 $(kubectl get pod -n harbor-registry -l app.kubernetes.io/name=harbor-registry -o name | head -1)                 -- /opt/bitnami/scripts/harbor-registry/entrypoint.sh harbor-registry-backup
          restartPolicy: OnFailure
```

## Step 8: Test the Deployment

```bash
# Verify pod status
kubectl get pods -n harbor-registry

# Check ingress
kubectl get ingress -n harbor-registry

# Test HTTP response
curl -L https://harbor-registry.example.com/

# View application logs
kubectl logs -n harbor-registry   $(kubectl get pods -n harbor-registry -l app.kubernetes.io/name=harbor-registry -o name | head -1)   --tail=50
```

## Upgrading

```bash
# Upgrade to latest version
helm repo update
helm upgrade harbor-registry bitnami/harbor   --namespace harbor-registry   --reuse-values

# Check upgrade status
kubectl rollout status deployment/harbor-registry-core -n harbor-registry
```

## Conclusion

How to Deploy Harbor Registry on Rancher on Rancher benefits from centralized management, unified monitoring, and enterprise RBAC. The Helm-based installation makes configuration management straightforward, while Rancher's project system enables multi-team governance of the deployment.
