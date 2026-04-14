# How to Implement Tenant Onboarding with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Tenancy, Onboarding, Kubernetes, Automation

Description: Automate Dapr tenant onboarding by creating namespaces, deploying components, configuring secrets, and provisioning backend resources using Helm charts and scripts.

---

## Tenant Onboarding in Dapr Multi-Tenant Systems

Tenant onboarding in a Dapr-based system requires creating the Kubernetes namespace, provisioning backend resources (databases, message brokers), deploying Dapr components, and deploying the tenant's application workloads. Automating this process ensures consistency and reduces operational burden.

## Onboarding Script Overview

A tenant onboarding script automates all Kubernetes and cloud resource creation:

```bash
#!/bin/bash
# onboard-tenant.sh
set -e

TENANT_ID=$1
PLAN=${2:-basic}

if [ -z "$TENANT_ID" ]; then
  echo "Usage: ./onboard-tenant.sh <tenant-id> [plan]"
  exit 1
fi

echo "Onboarding tenant: $TENANT_ID with plan: $PLAN"

# Step 1: Create namespace
kubectl create namespace "$TENANT_ID" || echo "Namespace already exists"
kubectl label namespace "$TENANT_ID" \
  app.kubernetes.io/tenant="$TENANT_ID" \
  dapr-tenant=true

# Step 2: Deploy Dapr components via Helm
helm install "dapr-tenant-${TENANT_ID}" ./charts/dapr-tenant \
  --namespace "$TENANT_ID" \
  --set tenantId="$TENANT_ID" \
  --set plan="$PLAN" \
  --wait

echo "Tenant $TENANT_ID onboarded successfully"
```

## Helm Chart for Tenant Dapr Resources

Structure a Helm chart to deploy all Dapr CRDs for a tenant:

```yaml
# charts/dapr-tenant/templates/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: {{ .Values.tenantId }}
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-{{ .Values.tenantId }}.{{ .Values.tenantId }}.svc.cluster.local:6379"
  - name: keyPrefix
    value: "{{ .Values.tenantId }}"
scopes:
{{ range .Values.appIds }}
- {{ . }}
{{ end }}
```

```yaml
# charts/dapr-tenant/templates/configuration.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tenant-config
  namespace: {{ .Values.tenantId }}
spec:
  tracing:
    samplingRate: {{ .Values.tracing.samplingRate | quote }}
  metric:
    enabled: {{ .Values.metrics.enabled }}
```

## Provisioning Backend Resources

Provision a dedicated Redis instance per tenant using a Kubernetes Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: provision-redis-{{ .Values.tenantId }}
  namespace: {{ .Values.tenantId }}
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: provision
        image: alpine/helm:latest
        command:
        - /bin/sh
        - -c
        - |
          helm install redis-{{ .Values.tenantId }} bitnami/redis \
            --namespace {{ .Values.tenantId }} \
            --set auth.enabled=false
```

## Creating Tenant Secrets

Set up secrets the tenant's components need:

```bash
# Create Kubernetes secret for tenant credentials
kubectl create secret generic tenant-credentials \
  --namespace "$TENANT_ID" \
  --from-literal=api-key="$(openssl rand -hex 32)" \
  --from-literal=db-password="$(openssl rand -hex 16)"
```

## Validating the Onboarding

After onboarding, validate that all components are healthy:

```bash
# Check components loaded successfully
kubectl get components -n "$TENANT_ID"

# Check Dapr-enabled pods are running
kubectl get pods -n "$TENANT_ID"

# Run a health check
curl -f http://tenant-api.${TENANT_ID}:3500/v1.0/healthz
```

## Summary

Dapr tenant onboarding is automated through a combination of a shell script for namespace and secret creation, a Helm chart for Dapr CRD deployment (components, configuration, resiliency), and Kubernetes Jobs for backend resource provisioning. This approach ensures consistent onboarding with minimal manual steps and enables self-service tenant creation through a control plane API.
