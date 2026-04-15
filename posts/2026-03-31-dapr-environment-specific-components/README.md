# How to Use Environment-Specific Dapr Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Environment, Configuration, Kubernetes

Description: Manage environment-specific Dapr component configurations across development, staging, and production using namespaces, Helm values, and Kustomize overlays.

---

## Why Environment-Specific Components?

Dapr components (state stores, pub/sub brokers, bindings) require different configurations per environment:
- **Development**: Local Redis, in-memory broker, local file secrets
- **Staging**: Azure Service Bus, Azure Cosmos DB with staging credentials
- **Production**: Azure Service Bus, Azure Cosmos DB with production credentials and stricter connection pool settings

Managing these differences requires a structured approach.

## Approach 1: Namespace-Scoped Components

Dapr components are scoped to their Kubernetes namespace. Deploy the same component name in each namespace with environment-specific values:

```bash
# Development namespace
kubectl apply -f - <<EOF
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: development
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-dev.development.svc:6379"
EOF

# Staging namespace - same component name, different backend
kubectl apply -f - <<EOF
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: staging
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    secretKeyRef:
      name: staging-cosmos-secret
      key: url
  - name: masterKey
    secretKeyRef:
      name: staging-cosmos-secret
      key: key
EOF
```

## Approach 2: Kustomize Overlays

```text
kubernetes/
  base/
    components/
      statestore.yaml    # Template/base
      pubsub.yaml
  overlays/
    development/
      kustomization.yaml
      components/
        statestore-patch.yaml
    staging/
      kustomization.yaml
      components/
        statestore-patch.yaml
    production/
      kustomization.yaml
      components/
        statestore-patch.yaml
```

```yaml
# kubernetes/base/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

```yaml
# kubernetes/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- ../../base

patches:
- path: components/statestore-patch.yaml
```

```yaml
# kubernetes/overlays/production/components/statestore-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    secretKeyRef:
      name: cosmos-secrets
      key: url
  - name: masterKey
    secretKeyRef:
      name: cosmos-secrets
      key: master-key
  - name: database
    value: production
  - name: actorStateStore
    value: "true"
```

## Approach 3: Helm Values Per Environment

```yaml
# helm/dapr-app/values.yaml - defaults
statestore:
  type: state.redis
  redisHost: "redis:6379"
  actorStateStore: "true"

pubsub:
  type: pubsub.redis
  redisHost: "redis:6379"
```

```yaml
# helm/dapr-app/values-production.yaml - overrides
statestore:
  type: state.azure.cosmosdb
  cosmosUrl: ""  # Populated from secrets
  database: production-db

pubsub:
  type: pubsub.azure.servicebus.topics
  connectionString: ""  # Populated from secrets
```

```yaml
# helm/dapr-app/templates/statestore-component.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: {{ .Release.Namespace }}
spec:
  type: {{ .Values.statestore.type }}
  version: v1
  metadata:
  {{- if eq .Values.statestore.type "state.redis" }}
  - name: redisHost
    value: {{ .Values.statestore.redisHost }}
  {{- else if eq .Values.statestore.type "state.azure.cosmosdb" }}
  - name: url
    secretKeyRef:
      name: cosmos-secrets
      key: url
  - name: masterKey
    secretKeyRef:
      name: cosmos-secrets
      key: masterKey
  - name: database
    value: {{ .Values.statestore.database }}
  {{- end }}
  - name: actorStateStore
    value: {{ .Values.statestore.actorStateStore | quote }}
```

```bash
# Deploy with environment-specific values
helm upgrade --install my-app ./helm/dapr-app \
  --namespace production \
  -f helm/dapr-app/values.yaml \
  -f helm/dapr-app/values-production.yaml
```

## Component Scoping to Specific Apps

```yaml
# Restrict which services can use a component
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-secrets
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal.com"
scopes:
- payment-service  # Only payment-service can use this
- fraud-service
```

## Summary

Environment-specific Dapr components are best managed through Kubernetes namespace isolation combined with either Kustomize overlays or Helm values files. Each environment gets the same component names (enabling service code to be environment-agnostic) but with different backend types and credentials. Use the `scopes` field in component definitions to restrict which applications can access sensitive components like payment secret stores.
