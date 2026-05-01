# How to Deploy SonarQube on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, SonarQube, Code-quality, Kubernetes, Helm

Description: Step-by-step guide to deploying SonarQube on Rancher for continuous code quality analysis.

## Introduction

Deploying SonarQube on a Rancher-managed Kubernetes cluster gives your team centralized cluster management, monitoring, and access control. This guide walks through a complete setup.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x
- Persistent storage (Longhorn)
- Ingress controller
- cert-manager
- Prometheus Operator
- Velero (optional, for the backup policy in Step 7)
- External database for production deployments

## Step 1: Prepare Namespace

```bash
kubectl create namespace sonarqube

# Configure project in Rancher

kubectl annotate namespace sonarqube \
  field.cattle.io/projectId=YOUR_CLUSTER_ID:YOUR_PROJECT_ID
```

## Step 2: Install with Helm

```bash
helm repo add sonarqube https://SonarSource.github.io/helm-chart-sonarqube
helm repo update

export MONITORING_PASSCODE="change-this-passcode"

# For production, also configure jdbcOverwrite.* to use your external database.
helm upgrade --install sonarqube sonarqube/sonarqube \
  --namespace sonarqube \
  --set community.enabled=true \
  --set monitoringPasscode=$MONITORING_PASSCODE \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn \
  --set persistence.size=50Gi \
  --set ingress.enabled=true \
  --set ingress.hosts[0].name=sonarqube.example.com \
  --set ingress.tls[0].secretName=sonarqube-tls-secret \
  --set ingress.tls[0].hosts[0]=sonarqube.example.com \
  --set prometheusMonitoring.podMonitor.enabled=true \
  --wait
```

## Step 3: Configure Storage

```yaml
# values-storage.yaml
persistence:
  enabled: true
  storageClass: longhorn
  size: 50Gi
```

## Step 4: Configure TLS Certificate

```yaml
# sonarqube-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: sonarqube-tls
  namespace: sonarqube
spec:
  secretName: sonarqube-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - sonarqube.example.com
```

## Step 5: Configure Resource Limits

```yaml
# Apply ResourceQuota to namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: sonarqube-quota
  namespace: sonarqube
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
# Verify the PodMonitor created by the Helm chart
kubectl get podmonitor -n sonarqube

# In another terminal, check the metrics endpoint while port-forward is running
kubectl port-forward -n sonarqube svc/sonarqube-sonarqube 9000:9000
curl -s -H "X-Sonar-Passcode: $MONITORING_PASSCODE" \
  http://127.0.0.1:9000/api/monitoring/metrics | head -20
```

## Step 7: Configure Backup Policy

```yaml
# Backup the namespace with Velero.
# Back up the SonarQube database separately with its native tooling.
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: sonarqube-backup
  namespace: velero
spec:
  schedule: "0 3 * * *"
  template:
    includedNamespaces:
    - sonarqube
    ttl: 168h0m0s
```

## Step 8: Test the Deployment

```bash
# Verify pod status
kubectl get pods -n sonarqube

# Check ingress
kubectl get ingress -n sonarqube

# Test HTTP response
curl -L https://sonarqube.example.com/

# View application logs
kubectl logs -n sonarqube   $(kubectl get pods -n sonarqube -l app.kubernetes.io/name=sonarqube -o name | head -1)   --tail=50
```

## Upgrading

```bash
# Upgrade to latest version
helm repo update
helm upgrade sonarqube sonarqube/sonarqube \
  --namespace sonarqube \
  --reuse-values \
  --set monitoringPasscode=$MONITORING_PASSCODE

# Check upgrade status
kubectl rollout status statefulset/sonarqube-sonarqube -n sonarqube
```

## Conclusion

Deploying SonarQube on Rancher benefits from centralized management, unified monitoring, and project-based access control. The Helm-based installation makes configuration management straightforward, while Rancher's project system enables multi-team governance of the deployment.
