# How to Configure Dapr for Production on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Production, High Availability, Security

Description: Configure Dapr for production Kubernetes environments with high availability, mTLS, resource limits, and observability settings using Helm.

---

## Production Readiness Checklist

Before going to production with Dapr, you should enable high availability mode, set resource limits, configure mTLS, and set up observability. All of this is controlled via Helm values.

## Installing Dapr in HA Mode

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

kubectl create namespace dapr-system

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --version 1.13.0 \
  -f dapr-production-values.yaml \
  --wait
```

## Production Helm Values

```yaml
# dapr-production-values.yaml
global:
  ha:
    enabled: true
    replicaCount: 3
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"

dapr_operator:
  replicaCount: 2
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"

dapr_sentry:
  replicaCount: 2
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "300m"
      memory: "256Mi"

dapr_placement:
  replicaCount: 3
  resources:
    requests:
      cpu: "250m"
      memory: "256Mi"
    limits:
      cpu: "1000m"
      memory: "512Mi"

dapr_sidecar_injector:
  replicaCount: 2
```

## Enabling Pod Disruption Budgets

```yaml
# pdb-dapr.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dapr-operator-pdb
  namespace: dapr-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: dapr-operator
```

```bash
kubectl apply -f pdb-dapr.yaml
```

## Configuring Observability

Enable Zipkin tracing for all sidecar-injected applications:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"
    zipkin:
      endpointAddress: "http://zipkin.monitoring:9411/api/v2/spans"
```

```bash
kubectl apply -f dapr-config-tracing.yaml
```

Reference it in your deployment:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/config: "tracing"
```

## Restricting mTLS Certificate Lifetime

```bash
kubectl patch configurations/daprsystem -n dapr-system \
  --type merge \
  -p '{"spec":{"mtls":{"workloadCertTTL":"12h","allowedClockSkew":"10m"}}}'
```

## Summary

A production Dapr deployment requires HA mode with multiple replicas for control plane components, resource requests and limits, mTLS enabled, and observability configured. Use Helm values files to manage these settings consistently across environments and version them in your GitOps repository.
