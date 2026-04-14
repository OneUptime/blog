# How to Manage Dapr Configuration Across Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Environment, Kustomize, DevOps

Description: Learn how to manage Dapr components and configuration files across development, staging, and production environments using Kustomize overlays and environment-specific values.

---

Managing Dapr configuration across multiple environments requires a strategy that keeps common settings DRY while allowing environment-specific overrides for broker endpoints, credential references, and resource limits. Kustomize overlays and Helm values files are the most effective approaches.

## The Challenge

Dapr components reference environment-specific resources like Redis hosts, Kafka brokers, and Vault addresses. A pub/sub component in development points to a local Redis, while production points to a highly-available Redis cluster.

## Kustomize Base and Overlays Structure

```bash
config/
├── base/
│   ├── components/
│   │   ├── pubsub.yaml
│   │   ├── state-store.yaml
│   │   └── kustomization.yaml
│   └── dapr-config/
│       ├── dapr-config.yaml
│       └── kustomization.yaml
└── overlays/
    ├── development/
    │   ├── kustomization.yaml
    │   ├── pubsub-patch.yaml
    │   └── dapr-config-patch.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── pubsub-patch.yaml
    └── production/
        ├── kustomization.yaml
        ├── pubsub-patch.yaml
        └── resource-limits-patch.yaml
```

## Base Component (Environment-Agnostic)

```yaml
# config/base/components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "REPLACE_REDIS_HOST"
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials
      key: password
scopes:
- order-service
- notification-service
```

## Development Overlay

```yaml
# config/overlays/development/pubsub-patch.yaml
- op: replace
  path: /spec/metadata/0/value
  value: "localhost:6379"
```

```yaml
# config/overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: development
resources:
- ../../base/components
- ../../base/dapr-config
patches:
- path: pubsub-patch.yaml
  target:
    kind: Component
    name: pubsub
```

## Production Overlay with Additional Security

```yaml
# config/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
- ../../base/components
- ../../base/dapr-config
patches:
- path: pubsub-patch.yaml
  target:
    kind: Component
    name: pubsub
- path: mtls-strict-patch.yaml
  target:
    kind: Configuration
    name: dapr-config
```

```yaml
# config/overlays/production/mtls-strict-patch.yaml
- op: replace
  path: /spec/mtls/workloadCertTTL
  value: "4h"
- op: add
  path: /spec/accessControl
  value:
    defaultAction: deny
    trustDomain: "cluster.local"
```

## Environment Variables via ConfigMap Replacement

```bash
# Apply different configurations per environment
ENVIRONMENT=production
kubectl apply -k config/overlays/${ENVIRONMENT}/ -n ${ENVIRONMENT}

# Preview what would be applied
kubectl kustomize config/overlays/${ENVIRONMENT}/

# Diff against current cluster state
kubectl diff -k config/overlays/${ENVIRONMENT}/
```

## Using Helm for Parameterized Configuration

```yaml
# values/development.yaml
dapr:
  mtls:
    enabled: false
  redis:
    host: localhost
    port: 6379
    secretName: redis-dev-secret
  tracing:
    samplingRate: "1"
```

```yaml
# values/production.yaml
dapr:
  mtls:
    enabled: true
    workloadCertTTL: "4h"
  redis:
    host: prod-redis-cluster.production.svc.cluster.local
    port: 6379
    secretName: redis-prod-secret
  tracing:
    samplingRate: "0.1"
```

```bash
# Deploy with environment-specific values
helm upgrade --install dapr-config ./charts/dapr-config \
  --namespace production \
  --values values/production.yaml
```

## Summary

Managing Dapr configuration across environments works best with Kustomize overlays that patch only environment-specific values (host addresses, TTLs, secret names) while keeping common configuration in a shared base. Use Helm values files for teams that prefer templated approaches. Always preview changes with `kubectl diff` before applying to production.
