# How to Manage Dapr Configuration Across Multiple Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Environment, Kubernetes, DevOps

Description: Learn how to manage Dapr configuration files across dev, staging, and production environments using namespaces, overlays, and environment-specific component files.

---

Managing Dapr configuration across multiple environments is one of the first challenges teams face when moving from a local setup to a real deployment pipeline. Dev, staging, and production environments often need different connection strings, different resource limits, and different resiliency policies. Dapr's component model makes this manageable without duplicating everything.

## Organize by Namespace or Directory

The simplest approach is to keep environment-specific component files in separate directories and apply them per environment.

```text
components/
  dev/
    statestore.yaml
    pubsub.yaml
  staging/
    statestore.yaml
    pubsub.yaml
  production/
    statestore.yaml
    pubsub.yaml
```

Each file targets the same component name but points to a different backend. For example, dev might use an in-memory store while production uses Redis.

```yaml
# components/dev/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: dev
spec:
  type: state.in-memory
  version: v1
  metadata: []
```

```yaml
# components/production/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-master.production.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Use Kubernetes Namespaces for Isolation

Deploying each environment into a separate Kubernetes namespace gives you clean isolation. Dapr components are namespace-scoped, so a component in the `dev` namespace does not affect `production`.

```bash
# Apply dev components
kubectl apply -f components/dev/ -n dev

# Apply production components
kubectl apply -f components/production/ -n production
```

## Use Environment Variables for Dynamic Values

Dapr component metadata supports referencing Kubernetes secrets, but you can also use ConfigMaps and environment variables to inject values at deploy time.

```yaml
spec:
  metadata:
    - name: redisHost
      value: "${REDIS_HOST}"
```

Use a tool like `envsubst` or a CI pipeline step to substitute values before applying:

```bash
export REDIS_HOST="redis.production.svc.cluster.local:6379"
envsubst < components/statestore.template.yaml | kubectl apply -f -
```

## Dapr Configuration CRD Per Environment

Beyond components, the Dapr Configuration CRD controls tracing, middleware, and resiliency policies. Keep a separate Configuration object per environment.

```yaml
# config/production/dapr-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: production
spec:
  tracing:
    samplingRate: "1"
  metrics:
    enabled: true
```

Reference the configuration from your deployment:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Validate Before Applying

Use a dry-run to validate component files against the Kubernetes API before deploying to any environment:

```bash
kubectl apply --dry-run=client -f components/production/statestore.yaml
```

## Summary

Managing Dapr configuration across environments works best when you combine namespace isolation, directory-based file organization, and secret references for sensitive values. Keeping environment-specific files separate prevents accidental cross-environment pollution and makes promotion pipelines predictable.
