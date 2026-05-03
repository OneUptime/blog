# How to Deploy Jenkins on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Jenkins, CI/CD, Kubernetes, Helm

Description: Guide to deploying Jenkins CI/CD platform on Rancher for automated build and deployment pipelines.

## Introduction

How to Deploy Jenkins on Rancher on Rancher gives your team a production-ready deployment with enterprise-grade cluster management, monitoring, and access control. This guide walks through a complete setup.

## Prerequisites

- Rancher v2.7+ cluster
- Helm 3.x
- Persistent storage (Longhorn)
- Ingress controller (nginx)
- cert-manager

## Step 1: Prepare Namespace

```bash
kubectl create namespace jenkins

# Configure project in Rancher

kubectl annotate namespace jenkins   field.cattle.io/projectId=YOUR_PROJECT_ID
```

## Step 2: Install with Helm

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install jenkins bitnami/jenkins   --namespace jenkins   --set persistence.enabled=true   --set persistence.storageClass=longhorn   --set ingress.enabled=true   --set ingress.hostname=jenkins.example.com   --set ingress.tls=true   --wait
```

## Step 3: Configure Storage

```yaml
# jenkins-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jenkins-data
  namespace: jenkins
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
# jenkins-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: jenkins-tls
  namespace: jenkins
spec:
  secretName: jenkins-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - jenkins.example.com
```

## Step 5: Configure Resource Limits

```yaml
# Apply ResourceQuota to namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: jenkins-quota
  namespace: jenkins
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
# Check if metrics endpoint is available (requires the Jenkins Prometheus plugin)
kubectl exec -n jenkins   $(kubectl get pods -n jenkins -o name | head -1)   -- curl -s http://localhost:8080/prometheus | head -20

# Create ServiceMonitor
kubectl apply -f - << SMEOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: jenkins-monitor
  namespace: jenkins
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: jenkins
  endpoints:
  - port: http
    path: /prometheus
    interval: 60s
SMEOF
```

## Step 7: Configure Backup Policy

```yaml
# Backup using Velero or custom CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: jenkins-backup
  namespace: jenkins
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
              echo "Creating jenkins backup..."
              POD=$(kubectl get pod -n jenkins -l app.kubernetes.io/name=jenkins -o name | head -1)
              kubectl exec -n jenkins $POD -- tar czf - /bitnami/jenkins > /backup/jenkins-$(date +%Y%m%d).tar.gz
          restartPolicy: OnFailure
```

## Step 8: Test the Deployment

```bash
# Verify pod status
kubectl get pods -n jenkins

# Check ingress
kubectl get ingress -n jenkins

# Test HTTP response
curl -L https://jenkins.example.com/

# View application logs
kubectl logs -n jenkins   $(kubectl get pods -n jenkins -l app.kubernetes.io/name=jenkins -o name | head -1)   --tail=50
```

## Upgrading

```bash
# Upgrade to latest version
helm repo update
helm upgrade jenkins bitnami/jenkins   --namespace jenkins   --reuse-values

# Check upgrade status
kubectl rollout status deployment/jenkins -n jenkins
```

## Conclusion

How to Deploy Jenkins on Rancher on Rancher benefits from centralized management, unified monitoring, and enterprise RBAC. The Helm-based installation makes configuration management straightforward, while Rancher's project system enables multi-team governance of the deployment.
