# How to Deploy KServe on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, KServe, MLOps, Model-serving, Kubernetes

Description: Step-by-step guide to deploying KServe on Rancher for standardized, scalable ML model inference.

## Introduction

This guide covers deploying KServe in a production Rancher environment, with practical examples and best practices.

## Prerequisites

- Rancher v2.7+ with a working Kubernetes cluster (Kubernetes 1.24+)
- kubectl and Helm 3 configured
- Persistent storage (Longhorn or NFS recommended)
- KServe also requires cert-manager, Istio (for the default Serverless mode) and Knative Serving as dependencies — these are installed in Step 1

## Architecture Overview

Deploying this component on Rancher follows Kubernetes-native patterns: using Helm charts for installation, ConfigMaps for configuration, Secrets for credentials, and PersistentVolumeClaims for data storage.

## Step 1: Install via Helm

KServe ships its charts on an OCI registry (`oci://ghcr.io/kserve/charts`) and requires cert-manager, Istio and Knative Serving for the default Serverless mode. The example below pins to KServe v0.14.1, the latest stable release at the time of writing.

```bash
# Application namespace for your inference workloads
kubectl create namespace mlops

# 1. Install Istio (required for Serverless mode)
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
helm install istio-base istio/base -n istio-system --create-namespace --wait \
  --version 1.20.4 --set defaultRevision=default
helm install istiod istio/istiod -n istio-system --wait --version 1.20.4
helm install istio-ingressgateway istio/gateway -n istio-system --version 1.20.4

# 2. Install cert-manager (required by KServe webhooks)
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --version v1.15.1 --set crds.enabled=true

# 3. Install Knative Serving via the Knative Operator (Serverless mode)
helm install knative-operator --namespace knative-serving --create-namespace --wait \
  https://github.com/knative/operator/releases/download/knative-v1.14.5/knative-operator-v1.14.5.tgz
kubectl apply -f - <<EOF
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
spec:
  version: "1.13.1"
EOF

# 4. Install KServe CRDs and controller
helm install kserve-crd oci://ghcr.io/kserve/charts/kserve-crd \
  --version v0.14.1 --namespace kserve --create-namespace --wait
helm install kserve oci://ghcr.io/kserve/charts/kserve \
  --version v0.14.1 --namespace kserve --wait \
  --set kserve.controller.deploymentMode=Serverless \
  --set kserve.modelmesh.enabled=false
```

For RawDeployment mode (no Knative/Istio dependency), pass `--set kserve.controller.deploymentMode=RawDeployment` and skip the Knative install above.

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

Deploying KServe on Rancher provides a production-ready ML infrastructure component with enterprise-grade management capabilities. Combine with Rancher's monitoring, logging, and access control features for a complete MLOps platform.
