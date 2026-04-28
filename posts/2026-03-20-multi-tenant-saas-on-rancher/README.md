# How to Set Up Multi-Tenant SaaS Platform on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Multi-Tenant, SaaS, Kubernetes, Isolation, RBAC, Namespace

Description: Build a multi-tenant SaaS platform on Rancher with namespace-per-tenant isolation, tenant-specific resource quotas, network policies, and automated tenant provisioning for software-as-a-service...

## Introduction

Multi-tenant SaaS platforms on Kubernetes require isolation between tenants while sharing cluster infrastructure for efficiency. Rancher provides the management layer for implementing namespace-per-tenant isolation, enforcing resource quotas, network policies, and automating tenant lifecycle management. The right isolation model depends on your security and compliance requirements.

## Isolation Models

| Model | Isolation Level | Use Case |
|---|---|---|
| Namespace per tenant | Soft (shared cluster) | Most SaaS platforms |
| Cluster per tenant | Hard (dedicated cluster) | High security / compliance |
| Node pool per tenant | Medium (dedicated nodes) | Performance-sensitive tenants |

## Architecture: Namespace-per-Tenant

```text
Production Cluster
├── tenant-acme/          ← Acme Corp namespace
│   └── All Acme workloads
├── tenant-globex/        ← Globex Corp namespace
│   └── All Globex workloads
├── tenant-initech/       ← Initech Corp namespace
└── shared-services/      ← Shared logging, monitoring
```

## Step 1: Automated Tenant Provisioning

```python
# tenant_provisioner.py - Provision new tenant namespace with all policies

import subprocess
import yaml

def provision_tenant(tenant_id: str, tier: str, admins: list):
    """Create isolated tenant environment"""

    # Create namespace
    ns_manifest = {
        'apiVersion': 'v1',
        'kind': 'Namespace',
        'metadata': {
            'name': f'tenant-{tenant_id}',
            'labels': {
                'tenant': tenant_id,
                'tier': tier,
                'pod-security.kubernetes.io/enforce': 'restricted'
            }
        }
    }
    apply_manifest(ns_manifest)

    # Apply resource quota based on tier
    quota = TIER_QUOTAS[tier]
    quota_manifest = {
        'apiVersion': 'v1',
        'kind': 'ResourceQuota',
        'metadata': {'name': 'tenant-quota', 'namespace': f'tenant-{tenant_id}'},
        'spec': {'hard': quota}
    }
    apply_manifest(quota_manifest)

    # Apply network isolation policy
    apply_manifest(build_network_policy(tenant_id))

    # Create service account for tenant CI/CD
    apply_manifest(build_service_account(tenant_id))

    # Assign admin users
    for admin_email in admins:
        assign_tenant_admin(tenant_id, admin_email)

    print(f"Tenant {tenant_id} provisioned successfully")


TIER_QUOTAS = {
    'starter': {
        'requests.cpu': '2', 'limits.cpu': '4',
        'requests.memory': '4Gi', 'limits.memory': '8Gi',
        'persistentvolumeclaims': '5'
    },
    'business': {
        'requests.cpu': '8', 'limits.cpu': '16',
        'requests.memory': '16Gi', 'limits.memory': '32Gi',
        'persistentvolumeclaims': '20'
    },
    'enterprise': {
        'requests.cpu': '32', 'limits.cpu': '64',
        'requests.memory': '64Gi', 'limits.memory': '128Gi',
        'persistentvolumeclaims': '100'
    }
}
```

## Step 2: Network Isolation Policies

```yaml
# Template function build_network_policy()

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
    # Only allow from same tenant namespace
    - from:
        - namespaceSelector:
            matchLabels:
              tenant: acme
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
  egress:
    # Allow within same namespace
    - to:
        - namespaceSelector:
            matchLabels:
              tenant: acme
    # Allow access to shared services
    - to:
        - namespaceSelector:
            matchLabels:
              shared-service: "true"
    # DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
```

## Step 3: Tenant-Specific Ingress Routing

```yaml
# Ingress for tenant with custom domain or path prefix
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tenant-acme-ingress
  namespace: tenant-acme
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  tls:
    - secretName: acme-tls
      hosts:
        - acme.yourapp.com    # Custom tenant subdomain
  rules:
    - host: acme.yourapp.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 80
```

## Step 4: Tenant Data Isolation

```yaml
# Each tenant gets dedicated PVCs with StorageClass
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tenant-data
  namespace: tenant-acme
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: tenant-storage    # Dedicated storage class
  resources:
    requests:
      storage: 50Gi
---
# StorageClass with Longhorn encryption per tenant
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: tenant-storage-encrypted
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  encrypted: "true"
```

## Step 5: Tenant Lifecycle Management

```bash
# Off-board tenant (preserve data for compliance period)
offboard_tenant() {
  local tenant_id=$1
  local retention_days=$2

  NS="tenant-$tenant_id"

  echo "Archiving tenant data..."
  # Archive data to S3 before deletion
  # Velero --ttl uses Go duration format (h/m/s), so convert days to hours
  velero backup create "tenant-$tenant_id-final" \
    --include-namespaces "$NS" \
    --ttl "$((retention_days * 24))h"

  echo "Suspending tenant (label for no traffic)..."
  kubectl label namespace "$NS" tenant-status=suspended

  echo "Scale down all workloads..."
  kubectl scale deployment --all -n "$NS" --replicas=0

  echo "Tenant $tenant_id suspended. Data retained for $retention_days days."
}
```

## Step 6: Tenant Usage Metering

```yaml
# Track per-tenant resource usage for billing
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tenant-billing-metrics
spec:
  groups:
    - name: tenant-usage
      rules:
        - record: tenant:cpu_usage:rate5m
          expr: |
            sum by (namespace) (
              rate(container_cpu_usage_seconds_total{namespace=~"tenant-.*"}[5m])
            )

        - record: tenant:memory_usage:avg
          expr: |
            avg by (namespace) (
              container_memory_working_set_bytes{namespace=~"tenant-.*"}
            )
```

## Conclusion

Multi-tenant SaaS on Rancher uses namespace isolation as the foundation, enhanced by network policies, resource quotas, and RBAC to create strong tenant boundaries on shared clusters. Automated provisioning scripts handle the full tenant lifecycle from onboarding to off-boarding. For tenants requiring stronger isolation (compliance requirements), escalate to dedicated node pools or dedicated clusters-Rancher's multi-cluster management handles all tiers from a single pane of glass. Monitor per-tenant resource usage with Prometheus for usage-based billing and capacity planning.
