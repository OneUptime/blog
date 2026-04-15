# How to Configure Dapr for Staging Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Staging, Configuration, Kubernetes, Environment

Description: Configure Dapr for a staging Kubernetes environment with namespace isolation, environment-specific components, reduced replicas, and production-like security settings.

---

## Staging Environment Goals

A staging environment should mirror production as closely as possible while remaining cost-effective. For Dapr in staging:
- Use the same component types as production (not Redis for state in prod while using it in staging if prod uses Cosmos DB)
- Apply security (mTLS, access control) the same as production
- Use reduced replica counts and resource limits
- Connect to separate, isolated infrastructure instances

## Namespace-Based Isolation

```bash
# Create staging namespace
kubectl create namespace staging

# Install Dapr in staging namespace scope
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.logAsJson=true \
  --set dapr_placement.replicaCount=1 \
  --set dapr_sentry.replicaCount=1 \
  --set dapr_operator.replicaCount=1 \
  --wait
```

## Staging Component Definitions

```yaml
# staging/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: staging
  labels:
    environment: staging
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    secretKeyRef:
      name: staging-secrets
      key: cosmos-url
  - name: masterKey
    secretKeyRef:
      name: staging-secrets
      key: cosmos-key
  - name: database
    value: "staging-db"
  - name: collection
    value: "state"
  scopes:
  - order-service
  - payment-service
```

```yaml
# staging/components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: staging
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: staging-secrets
      key: servicebus-connection-string
  - name: consumerID
    value: "staging-consumer"
  - name: maxDeliveryCount
    value: "5"
```

## Staging Kubernetes Deployment

```yaml
# staging/deployments/order-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: staging
spec:
  replicas: 1  # Reduced vs production
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
        dapr.io/config: "staging-config"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-cpu-limit: "200m"
        dapr.io/sidecar-memory-request: "128Mi"
        dapr.io/sidecar-memory-limit: "256Mi"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:staging
        env:
        - name: APP_ENV
          value: staging
        - name: LOG_LEVEL
          value: info
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

## Staging Dapr Configuration

```yaml
# staging/config/dapr-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: staging-config
  namespace: staging
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
  tracing:
    samplingRate: "0.1"  # 10% sampling in staging
    zipkin:
      endpointAddress: http://zipkin.monitoring:9411/api/v2/spans
  accessControl:
    defaultAction: allow  # More permissive than production for debugging
```

## Staging Secrets Management

```bash
# Create staging secrets from environment-specific vault
kubectl create secret generic staging-secrets \
  --namespace staging \
  --from-literal=cosmos-url="https://staging-cosmos.documents.azure.com:443/" \
  --from-literal=cosmos-key="staging-key-here" \
  --from-literal=servicebus-connection-string="staging-sb-conn-string"

# Or use External Secrets Operator with staging vault path
```

```yaml
# external-secrets for staging
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: staging-dapr-secrets
  namespace: staging
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault
  target:
    name: staging-secrets
  data:
  - secretKey: cosmos-key
    remoteRef:
      key: staging/dapr/cosmos
      property: key
```

## Summary

Staging Dapr configuration mirrors production by using the same component types and security settings, but with namespace isolation, reduced replica counts, lighter resource limits, and separate infrastructure credentials. Keeping component types identical between staging and production ensures that serialization, connection behavior, and message ordering are tested accurately before production deployment. Use mTLS in staging even though it adds operational complexity - the goal is to catch security misconfigurations before they reach production.
