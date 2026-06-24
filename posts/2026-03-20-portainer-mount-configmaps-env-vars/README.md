# How to Mount ConfigMaps as Environment Variables in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, Environment Variable, DevOps

Description: Learn how to inject ConfigMap data as environment variables into Kubernetes pods using Portainer, enabling dynamic configuration without rebuilding container images.

## Introduction

Injecting ConfigMap data as environment variables is one of the most common ways to configure containerized applications in Kubernetes. This pattern decouples configuration from code, allowing the same image to run across environments with different settings. Portainer supports configuring environment variable injection from ConfigMaps through its application form and manifest editor. This guide covers both approaches.

## Prerequisites

- Portainer with Kubernetes environment
- An existing ConfigMap with configuration data
- A deployment or pod spec to configure

## Step 1: Create a ConfigMap First

Before using it, ensure the ConfigMap exists:

```bash
# Verify the ConfigMap exists

kubectl get configmap my-app-config -n production

# View its contents
kubectl describe configmap my-app-config -n production
```

Example ConfigMap:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: production
data:
  DATABASE_HOST: "postgres.production.svc.cluster.local"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
  APP_ENV: "production"
  CACHE_TTL: "3600"
  API_BASE_URL: "https://api.production.company.com"
```

## Step 2: Use ConfigMap in Portainer Form

When creating or editing an application in Portainer:

1. Navigate to **Applications** → **Add with form** (or edit existing)
2. Find the **ConfigMaps** section
3. Select `my-app-config`
4. Portainer exposes all keys from the selected ConfigMap as environment variables by default
5. If you need only specific keys or custom environment variable names, use a manifest with `env` / `configMapKeyRef` as shown below

Use the **Override** option only if you want to change a key from an environment variable to a filesystem mount.

## Step 3: Inject All ConfigMap Keys at Once (envFrom)

To inject all keys from a ConfigMap as environment variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          # Inject ALL ConfigMap keys as environment variables
          envFrom:
            - configMapRef:
                name: my-app-config
```

With `envFrom`, every key in `my-app-config` becomes an environment variable. If `my-app-config` has `DATABASE_HOST`, the container gets `DATABASE_HOST` set automatically.

## Step 4: Inject Specific Keys with Custom Names

Map specific ConfigMap keys to environment variables with different names:

```yaml
spec:
  containers:
    - name: my-app
      image: my-app:latest
      env:
        # Map ConfigMap key to a differently-named env var
        - name: DB_HOST        # env var name in container
          valueFrom:
            configMapKeyRef:
              name: my-app-config   # ConfigMap name
              key: DATABASE_HOST    # key in ConfigMap

        - name: DB_PORT
          valueFrom:
            configMapKeyRef:
              name: my-app-config
              key: DATABASE_PORT

        - name: LOGGING_LEVEL
          valueFrom:
            configMapKeyRef:
              name: my-app-config
              key: LOG_LEVEL

        # Static value mixed with ConfigMap values
        - name: APP_VERSION
          value: "2.0.0"
```

## Step 5: Combine Multiple ConfigMaps

Inject from multiple ConfigMaps in the same pod:

```yaml
spec:
  containers:
    - name: my-app
      image: my-app:latest
      envFrom:
        # Load all keys from app config
        - configMapRef:
            name: app-config
        # Load all keys from database config
        - configMapRef:
            name: db-config
        # Load all keys from feature flags
        - configMapRef:
            name: feature-flags
      env:
        # Override a specific value after envFrom
        - name: LOG_LEVEL
          value: "debug"    # This overrides LOG_LEVEL from app-config
```

Note: If multiple `envFrom` sources have the same key, the last one wins. Explicit `env` entries override `envFrom` values.

## Step 6: Make ConfigMap Keys Optional

Handle cases where a ConfigMap key might not exist:

```yaml
spec:
  containers:
    - name: my-app
      env:
        - name: OPTIONAL_FEATURE_FLAG
          valueFrom:
            configMapKeyRef:
              name: feature-flags
              key: FEATURE_NEW_UI
              optional: true  # Pod starts even if key doesn't exist
```

## Step 7: Add a Prefix to envFrom Keys

Use `prefix` to namespace environment variables from different ConfigMaps:

```yaml
spec:
  containers:
    - name: my-app
      envFrom:
        - prefix: "APP_"           # All keys get APP_ prefix
          configMapRef:
            name: app-config
        - prefix: "DB_"            # All keys get DB_ prefix
          configMapRef:
            name: db-config
```

Result: `DATABASE_HOST` from `db-config` becomes `DB_DATABASE_HOST` in the container.

## Step 8: Verify Environment Variables in a Running Pod

```bash
# Open a shell in the pod
kubectl exec -it <pod-name> -n production -- /bin/sh

# List all environment variables
env

# Check specific variable
echo $DATABASE_HOST
echo $LOG_LEVEL

# List variables with a grep filter
env | grep -i database

# Exit the shell
exit
```

Or via kubectl without an interactive shell:

```bash
# Get specific env var value
kubectl exec <pod-name> -n production -- \
  printenv DATABASE_HOST

# List all env vars non-interactively
kubectl exec <pod-name> -n production -- \
  printenv | sort
```

## Step 9: Update ConfigMap and Restart

After updating a ConfigMap, pods that use ConfigMap-backed environment variables must restart to get new values:

```bash
# Update ConfigMap value
kubectl patch configmap my-app-config -n production \
  --type merge \
  -p '{"data":{"LOG_LEVEL":"debug"}}'

# Restart deployment to pick up new values
kubectl rollout restart deployment/my-app -n production

# Watch rollout progress
kubectl rollout status deployment/my-app -n production
```

## Conclusion

Using ConfigMaps as environment variables is one of the simplest ways to inject configuration into Kubernetes applications. Use `envFrom` for bulk injection of all ConfigMap keys, and `env.valueFrom.configMapKeyRef` for selective key mapping with custom names. Combine multiple ConfigMaps and use prefixes to organize configuration from different sources. Always restart affected pods after ConfigMap updates when using environment variable injection, as environment variables are set at container startup and do not update dynamically.
