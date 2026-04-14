# How to Use Kustomize Overlays for Dapr Environment Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kustomize, Kubernetes, Configuration Management, DevOps, Environment Management

Description: Learn how to use Kustomize overlays to manage Dapr component configuration across development, staging, and production environments without duplication.

---

Managing Dapr component configurations across multiple environments is a common challenge in platform engineering. You want a single source of truth for component structure but need to vary connection strings, credentials, and tuning parameters per environment. Kustomize overlays provide an elegant solution: define base components once and layer environment-specific patches on top, keeping your configurations DRY and auditable.

## Why Kustomize for Dapr Components

Kustomize is built into `kubectl` and Kubernetes toolchains, making it a natural fit for Dapr on Kubernetes. It works by:
- Defining base YAML resources that are shared across all environments
- Writing overlays that patch specific fields for each environment
- Using `kustomization.yaml` to declare which resources and patches to apply
- Producing fully rendered YAML at deploy time without templating engines

This approach avoids the complexity of Helm for pure configuration management while still preventing copy-paste drift between environment files.

## Project Layout

Organize your repository with a clear base-and-overlay structure:

```text
dapr-configs/
  base/
    kustomization.yaml
    statestore.yaml
    pubsub.yaml
    secrets.yaml
    resiliency.yaml
    config.yaml
  overlays/
    development/
      kustomization.yaml
      statestore-patch.yaml
      pubsub-patch.yaml
      secrets-patch.yaml
    staging/
      kustomization.yaml
      statestore-patch.yaml
      pubsub-patch.yaml
    production/
      kustomization.yaml
      statestore-patch.yaml
      pubsub-patch.yaml
      resiliency-patch.yaml
      replicas-patch.yaml
```

## Writing the Base Resources

Base resources define the component structure with sensible defaults that work in development.

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- statestore.yaml
- pubsub.yaml
- secrets.yaml
- resiliency.yaml
- config.yaml

commonLabels:
  app.kubernetes.io/managed-by: kustomize
  dapr.io/environment: base
```

```yaml
# base/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    value: ""
  - name: actorStateStore
    value: "true"
  - name: keyPrefix
    value: "app"
  - name: ttlInSeconds
    value: "0"
```

```yaml
# base/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
  - name: maxLenApprox
    value: "10000"
```

```yaml
# base/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
  namespace: default
spec:
  policies:
    retries:
      DefaultRetryPolicy:
        policy: constant
        duration: 1s
        maxRetries: 3
    timeouts:
      DefaultTimeoutPolicy: 5s
    circuitBreakers:
      DefaultCircuitBreaker:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures > 5
  targets:
    components:
      statestore:
        outbound:
          retry: DefaultRetryPolicy
          timeout: DefaultTimeoutPolicy
```

## Creating the Development Overlay

The development overlay uses local infrastructure with no TLS and relaxed settings.

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: development

resources:
- ../../base

commonLabels:
  dapr.io/environment: development

patches:
- path: statestore-patch.yaml
- path: pubsub-patch.yaml
- path: secrets-patch.yaml
```

```yaml
# overlays/development/statestore-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: keyPrefix
    value: "dev"
```

```yaml
# overlays/development/pubsub-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
spec:
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: maxLenApprox
    value: "1000"
```

```yaml
# overlays/development/secrets-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./secrets/dev-secrets.json"
  - name: nestedSeparator
    value: "."
```

## Creating the Production Overlay

The production overlay switches to managed cloud services with TLS, higher scale limits, and strict resiliency policies.

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- ../../base

commonLabels:
  dapr.io/environment: production

patches:
- path: statestore-patch.yaml
- path: pubsub-patch.yaml
- path: resiliency-patch.yaml
```

```yaml
# overlays/production/statestore-patch.yaml
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
      name: cosmos-url
      key: url
  - name: masterKey
    secretKeyRef:
      name: cosmos-credentials
      key: masterKey
  - name: database
    value: "production-db"
  - name: collection
    value: "orders"
  - name: keyPrefix
    value: "prod"
auth:
  secretStore: azure-keyvault
```

```yaml
# overlays/production/pubsub-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    secretKeyRef:
      name: kafka-brokers
      key: brokers
  - name: saslUsername
    secretKeyRef:
      name: kafka-credentials
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-credentials
      key: password
  - name: enableTLS
    value: "true"
  - name: maxMessageBytes
    value: "1048576"
  - name: compressionCodec
    value: "snappy"
auth:
  secretStore: azure-keyvault
```

```yaml
# overlays/production/resiliency-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
spec:
  policies:
    retries:
      DefaultRetryPolicy:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
    timeouts:
      DefaultTimeoutPolicy: 10s
    circuitBreakers:
      DefaultCircuitBreaker:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures > 3
```

## Previewing and Applying Overlays

Use `kustomize build` to preview the fully rendered configuration before applying it.

```bash
# Preview development configuration
kustomize build overlays/development

# Preview production configuration
kustomize build overlays/production

# Diff between environments
diff \
  <(kustomize build overlays/development) \
  <(kustomize build overlays/production)

# Apply to the cluster
kustomize build overlays/production | kubectl apply -f -

# Or use kubectl directly
kubectl apply -k overlays/production
```

Validate before applying:

```bash
# Dry-run to catch errors without changing cluster state
kustomize build overlays/production | kubectl apply --dry-run=client -f -

# Server-side dry-run for webhook validation
kustomize build overlays/production | kubectl apply --dry-run=server -f -
```

## Automating in CI/CD Pipelines

```yaml
# .github/workflows/deploy-dapr-components.yaml
name: Deploy Dapr Components

on:
  push:
    branches: [main]
    paths:
    - 'dapr-configs/**'

env:
  KUSTOMIZE_VERSION: 5.3.0

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install kustomize
      run: |
        curl -sL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize/v${KUSTOMIZE_VERSION}/kustomize_v${KUSTOMIZE_VERSION}_linux_amd64.tar.gz" | tar -xz
        sudo mv kustomize /usr/local/bin/
    - name: Validate production overlay
      run: kustomize build dapr-configs/overlays/production | kubectl apply --dry-run=client -f -
      env:
        KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }}

  deploy:
    runs-on: ubuntu-latest
    needs: validate
    environment: production
    steps:
    - uses: actions/checkout@v4
    - name: Install kustomize
      run: |
        curl -sL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize/v${KUSTOMIZE_VERSION}/kustomize_v${KUSTOMIZE_VERSION}_linux_amd64.tar.gz" | tar -xz
        sudo mv kustomize /usr/local/bin/
    - name: Apply production overlay
      run: kustomize build dapr-configs/overlays/production | kubectl apply -f -
      env:
        KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }}
```

## Summary

Kustomize overlays bring order to Dapr environment configuration by establishing a single base layer and patching only what differs per environment. You learned how to organize base resources and overlays in a clear directory structure, write targeted patches that override specific component fields without duplicating the entire file, switch component types between environments (Redis in dev, Cosmos DB in production), preview and validate rendered configurations before applying them, and automate deployment through CI/CD pipelines. This approach ensures your Dapr component configuration is consistent, auditable, and easy to maintain as environments evolve.
