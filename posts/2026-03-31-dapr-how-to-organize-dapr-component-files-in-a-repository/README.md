# How to Organize Dapr Component Files in a Repository

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Repository Structure, DevOps, Configuration Management, Best Practice

Description: Learn best practices for organizing Dapr component YAML files in a repository, covering directory structures, environment separation, and CI/CD integration.

---

As a Dapr project grows, managing component YAML files can quickly become disorganized. Without a clear structure, developers struggle to find component definitions, configurations drift between environments, and deployments become error-prone. This guide presents practical patterns for organizing Dapr component files in a repository to maximize maintainability and consistency.

## Understanding Dapr Component Files

Dapr components are YAML files that configure the building blocks your application uses: state stores, pub/sub brokers, secret stores, bindings, and middleware. Each component file follows the same structure:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-component
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
```

Components are loaded by the Dapr sidecar either from a local directory (for self-hosted mode) or from Kubernetes custom resources (for Kubernetes mode).

## Recommended Repository Directory Structure

A well-organized repository separates components by environment and groups them logically by type.

```text
my-app/
  dapr/
    base/
      components/
        state/
          redis-statestore.yaml
          postgres-statestore.yaml
        pubsub/
          redis-pubsub.yaml
          kafka-pubsub.yaml
        secrets/
          aws-secrets.yaml
          azure-keyvault.yaml
        bindings/
          cron-trigger.yaml
          s3-output.yaml
        middleware/
          rate-limit.yaml
          oauth2.yaml
      config/
        tracing.yaml
        resiliency.yaml
      subscriptions/
        order-subscriptions.yaml
        payment-subscriptions.yaml
    overlays/
      development/
        kustomization.yaml
        statestore-patch.yaml
        pubsub-patch.yaml
      staging/
        kustomization.yaml
        statestore-patch.yaml
      production/
        kustomization.yaml
        statestore-patch.yaml
        resiliency-patch.yaml
  src/
    ...
  Makefile
  .github/
    workflows/
      deploy.yaml
```

## Structuring Base Component Files

Write base components with environment-agnostic defaults, using placeholders for values that differ between environments.

```yaml
# dapr/base/components/state/redis-statestore.yaml
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
    secretKeyRef:
      name: redis-credentials
      key: password
  - name: actorStateStore
    value: "true"
  - name: keyPrefix
    value: "app"
auth:
  secretStore: local-secrets
```

```yaml
# dapr/base/components/pubsub/redis-pubsub.yaml
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
    secretKeyRef:
      name: redis-credentials
      key: password
  - name: enableTLS
    value: "false"
  - name: maxLenApprox
    value: "10000"
```

```yaml
# dapr/base/config/tracing.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
  features:
  - name: HotReload
    enabled: true
```

## Using Kustomize Overlays for Environment Differences

Kustomize overlays let you patch base components without duplicating the entire file.

```yaml
# dapr/overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: development
resources:
- ../../base/components/state/redis-statestore.yaml
- ../../base/components/pubsub/redis-pubsub.yaml
- ../../base/components/secrets/aws-secrets.yaml
- ../../base/config/tracing.yaml
patches:
- path: statestore-patch.yaml
- path: pubsub-patch.yaml
```

```yaml
# dapr/overlays/development/statestore-patch.yaml
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
```

```yaml
# dapr/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
- ../../base/components/state/redis-statestore.yaml
- ../../base/components/pubsub/kafka-pubsub.yaml
- ../../base/components/secrets/aws-secrets.yaml
- ../../base/config/tracing.yaml
- ../../base/config/resiliency.yaml
patches:
- path: statestore-patch.yaml
- path: resiliency-patch.yaml
```

```yaml
# dapr/overlays/production/statestore-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
  - name: redisHost
    value: "prod-redis-cluster.internal:6379"
  - name: enableTLS
    value: "true"
```

## Naming Conventions for Component Files

Use consistent naming to make components self-documenting:

```text
Pattern: {type}-{provider}.yaml

Examples:
  state/    redis-statestore.yaml
            postgres-statestore.yaml
            cosmosdb-statestore.yaml
  pubsub/   redis-pubsub.yaml
            kafka-pubsub.yaml
            servicebus-pubsub.yaml
  secrets/  aws-secrets.yaml
            azure-keyvault.yaml
            local-file-secrets.yaml
  bindings/ http-input.yaml
            cron-input.yaml
            s3-output.yaml
            kafka-output.yaml
```

For Kubernetes, use a naming label convention in all components:

```yaml
# Consistent labels across all components
metadata:
  name: order-pubsub
  labels:
    app.kubernetes.io/managed-by: "kustomize"
    dapr.io/component-type: "pubsub"
    dapr.io/environment: "production"
    dapr.io/team: "platform"
```

## Makefile Targets for Component Management

Add a `Makefile` to simplify common component operations.

```makefile
# Makefile
ENV ?= development
COMPONENTS_DIR = dapr/overlays/$(ENV)
APP_ID ?= my-app

.PHONY: components-validate components-apply components-dev components-diff components-list

components-validate:
	@echo "Validating components for environment: $(ENV)"
	kustomize build $(COMPONENTS_DIR) | kubectl apply --dry-run=client -f -

components-apply:
	@echo "Applying components for environment: $(ENV)"
	kustomize build $(COMPONENTS_DIR) | kubectl apply -f -

components-dev:
	@echo "Starting Dapr with development components..."
	dapr run \
		--app-id $(APP_ID) \
		--app-port 5000 \
		--resources-path dapr/base/components \
		--config dapr/base/config/tracing.yaml \
		-- python src/app.py

components-diff:
	@echo "Diff between development and production:"
	@diff \
		<(kustomize build dapr/overlays/development) \
		<(kustomize build dapr/overlays/production) || true

components-list:
	@echo "Components in environment $(ENV):"
	kustomize build $(COMPONENTS_DIR) | grep "^  name:" | sort
```

## Automating Component Deployment in CI/CD

Add a GitHub Actions workflow to validate and deploy components on every merge.

```yaml
# .github/workflows/deploy-components.yaml
name: Deploy Dapr Components

on:
  push:
    branches: [main]
    paths:
    - 'dapr/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install Kustomize
      run: |
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/

    - name: Validate staging components
      run: kustomize build dapr/overlays/staging | kubectl apply --dry-run=client -f -
      env:
        KUBECONFIG: ${{ secrets.STAGING_KUBECONFIG }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: validate
    environment: staging
    steps:
    - uses: actions/checkout@v4

    - name: Install Kustomize
      run: |
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/

    - name: Deploy to staging
      run: kustomize build dapr/overlays/staging | kubectl apply -f -
      env:
        KUBECONFIG: ${{ secrets.STAGING_KUBECONFIG }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    steps:
    - uses: actions/checkout@v4

    - name: Install Kustomize
      run: |
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/

    - name: Deploy to production
      run: kustomize build dapr/overlays/production | kubectl apply -f -
      env:
        KUBECONFIG: ${{ secrets.PRODUCTION_KUBECONFIG }}
```

## Summary

A well-organized Dapr component repository uses a base-plus-overlays pattern to separate environment-specific values from shared configuration, groups components by type within subdirectories, and applies consistent naming conventions. You learned how to structure base component files, use Kustomize overlays to patch them per environment, enforce consistent labels, create a Makefile for developer convenience, and automate component validation and deployment through CI/CD. This structure scales from a small team managing a single service to a platform team managing dozens of microservices across multiple environments.
