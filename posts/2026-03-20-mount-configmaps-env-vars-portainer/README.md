# How to Mount ConfigMaps as Environment Variables in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, Environment Variable, Configuration

Description: Learn how to inject Kubernetes ConfigMap data into application containers as environment variables in Portainer.

## Overview

ConfigMaps can be consumed by pods in two ways: as environment variables or as mounted files. This guide covers the environment variable injection approach, which is ideal for application configuration settings.

## Method 1: Inject All ConfigMap Keys as Environment Variables

This injects every key in the ConfigMap as a separate environment variable:

```yaml
spec:
  containers:
    - name: my-app
      image: my-app:latest
      envFrom:
        # All keys from app-config become environment variables
        - configMapRef:
            name: app-config
          # Optional: add a prefix to all keys
          # prefix: "APP_"
```

With a ConfigMap containing `DB_HOST=postgres` and `LOG_LEVEL=info`, the container gets `DB_HOST` and `LOG_LEVEL` as env vars.

## Method 2: Inject Specific Keys from a ConfigMap

For precise control, inject only specific keys:

```yaml
spec:
  containers:
    - name: my-app
      image: my-app:latest
      env:
        # Inject a specific key as a specific env var name
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: app-config      # ConfigMap name
              key: database_url     # Key within the ConfigMap
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: log_level
              optional: true        # Don't fail if key doesn't exist
```

## Configuring in Portainer

When deploying or editing an application:

1. Scroll to **Environment variables**.
2. Click **Add environment variable**.
3. Select **From ConfigMap** as the source.
4. Choose the ConfigMap from the dropdown.
5. Select:
   - **All keys** to inject the entire ConfigMap.
   - **Specific key** and enter the key name to inject one value.
6. Optionally set a custom **name** for the environment variable.

## Combining Multiple ConfigMaps

```yaml
# Inject from multiple ConfigMaps in one container

envFrom:
  - configMapRef:
      name: app-config          # Application settings
  - configMapRef:
      name: feature-flags       # Feature flag settings
  - configMapRef:
      name: database-config     # Database settings
```

## Verifying the Environment Variables

```bash
# Check what environment variables are set in a running pod
kubectl exec -it <pod-name> --namespace=production \
  -- env | grep -E "DB_|LOG_|APP_"

# Or print all environment variables
kubectl exec -it <pod-name> --namespace=production -- printenv
```

## Important Limitation

Environment variables are set at pod startup time. If you update a ConfigMap, existing pods do **not** automatically pick up the changes. You must restart the pods:

```bash
# Force a rolling restart to apply ConfigMap changes
kubectl rollout restart deployment/my-app --namespace=production
```

## Conclusion

Injecting ConfigMaps as environment variables is the most straightforward way to configure Kubernetes applications. Portainer's UI makes the process visual - just select the ConfigMap and the keys, and Portainer handles the YAML generation.
