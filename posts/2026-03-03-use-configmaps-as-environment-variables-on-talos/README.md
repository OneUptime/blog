# How to Use ConfigMaps as Environment Variables on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, ConfigMap, Environment Variables, Container Configuration

Description: Step-by-step guide on injecting ConfigMap data as environment variables into your Kubernetes pods running on Talos Linux.

---

Environment variables are probably the simplest way to pass configuration to containerized applications. On Talos Linux, where the host operating system is locked down and immutable, Kubernetes ConfigMaps become your go-to tool for managing application settings. Instead of baking configuration into your container images, you can pull values from ConfigMaps and inject them as environment variables at runtime.

This guide walks through all the ways you can use ConfigMaps as environment variables in pods running on a Talos Linux cluster.

## When to Use Environment Variables vs Volume Mounts

Before diving in, it helps to know when environment variables make sense:

- Your application reads settings from environment variables (most 12-factor apps do)
- The configuration values are short strings or numbers
- You need simple key-value pairs rather than structured config files
- You want immediate availability at container startup without waiting for file mounts

Volume mounts are better when you have large, multi-line configuration files. Environment variables are better for straightforward settings like database URLs, feature flags, and log levels.

## Creating a ConfigMap

Let us start by creating a ConfigMap that we will reference in our pod specifications:

```yaml
# app-settings.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-settings
  namespace: default
data:
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "myapp"
  LOG_LEVEL: "info"
  CACHE_TTL: "3600"
  APP_ENV: "production"
  MAX_RETRIES: "3"
```

```bash
# Apply the ConfigMap to your Talos cluster
kubectl apply -f app-settings.yaml
```

## Referencing Individual Keys with valueFrom

The most explicit approach is to reference specific keys from a ConfigMap using `valueFrom`. This gives you full control over which ConfigMap keys map to which environment variable names:

```yaml
# pod-valuefrom.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    env:
    # Map a ConfigMap key to an environment variable
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: app-settings
          key: DATABASE_HOST
    # You can rename the variable
    - name: DB_PORT
      valueFrom:
        configMapKeyRef:
          name: app-settings
          key: DATABASE_PORT
    # Mark a key as optional - pod starts even if key is missing
    - name: FEATURE_FLAG
      valueFrom:
        configMapKeyRef:
          name: app-settings
          key: FEATURE_FLAG
          optional: true
```

```bash
# Deploy the pod
kubectl apply -f pod-valuefrom.yaml

# Verify the environment variables are set
kubectl exec myapp -- env | grep DB_
```

The `optional: true` field is worth noting. Without it, the pod will fail to start if the referenced key does not exist in the ConfigMap. With it, the environment variable simply will not be set, and the pod continues normally.

## Loading All Keys with envFrom

When you want to inject every key from a ConfigMap as an environment variable, use `envFrom`. Each key in the ConfigMap becomes an environment variable with the same name:

```yaml
# pod-envfrom.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-all-env
spec:
  containers:
  - name: myapp
    image: myapp:latest
    envFrom:
    - configMapRef:
        name: app-settings
```

```bash
# Deploy and check
kubectl apply -f pod-envfrom.yaml
kubectl exec myapp-all-env -- env | sort
```

This will create environment variables named `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `LOG_LEVEL`, `CACHE_TTL`, `APP_ENV`, and `MAX_RETRIES` - matching the keys in your ConfigMap exactly.

## Adding a Prefix with envFrom

Sometimes you want to add a prefix to all injected variables to avoid naming collisions, especially when you load from multiple ConfigMaps:

```yaml
# pod-prefixed.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-prefixed
spec:
  containers:
  - name: myapp
    image: myapp:latest
    envFrom:
    # All keys from this ConfigMap get a "MYAPP_" prefix
    - configMapRef:
        name: app-settings
      prefix: MYAPP_
    # All keys from this ConfigMap get a "CACHE_" prefix
    - configMapRef:
        name: cache-settings
      prefix: CACHE_
```

With this setup, `DATABASE_HOST` from the `app-settings` ConfigMap becomes `MYAPP_DATABASE_HOST` inside the container, and keys from `cache-settings` get the `CACHE_` prefix.

## Combining ConfigMaps and Direct Values

In practice, you will often mix ConfigMap references with hardcoded values and Secret references:

```yaml
# pod-mixed.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-mixed
spec:
  containers:
  - name: myapp
    image: myapp:latest
    env:
    # Direct value
    - name: APP_VERSION
      value: "2.1.0"
    # From ConfigMap
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: app-settings
          key: DATABASE_HOST
    # From Secret (for sensitive data)
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password
    # From Pod metadata
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    envFrom:
    # Load remaining config
    - configMapRef:
        name: app-settings
```

The order matters here. If you define `DB_HOST` in both the `env` section and via `envFrom`, the explicit `env` entry takes precedence.

## Using ConfigMap Values in Deployments

For production workloads on Talos Linux, here is how you would wire up ConfigMaps in a Deployment:

```yaml
# deployment-with-env.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
      annotations:
        # Add a checksum to trigger rollout on config changes
        checksum/config: "initial"
    spec:
      containers:
      - name: webapp
        image: webapp:latest
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: app-settings
        env:
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
```

## Important: Environment Variables Do Not Auto-Update

Unlike volume-mounted ConfigMaps, environment variables set from ConfigMaps are resolved at pod startup and do not change afterwards. If you update the ConfigMap, existing pods will keep the old values. You need to restart the pods to pick up changes:

```bash
# Update the ConfigMap
kubectl patch configmap app-settings --type merge \
  -p '{"data":{"LOG_LEVEL":"debug"}}'

# Restart the deployment to pick up changes
kubectl rollout restart deployment webapp

# Watch the rollout
kubectl rollout status deployment webapp
```

A common pattern is to add a hash of the ConfigMap content as a pod annotation. When the ConfigMap changes, you update the annotation, which triggers a rolling update automatically. Tools like Helm and Kustomize can automate this.

## Validating Environment Variables

After deploying your pods, always verify that the environment variables are set correctly:

```bash
# Check all env vars in a running pod
kubectl exec -it webapp-xxxxx -- env | sort

# Check a specific variable
kubectl exec webapp-xxxxx -- printenv DATABASE_HOST

# Debug a pod that won't start due to missing ConfigMap
kubectl describe pod webapp-xxxxx | grep -A 5 "Events"
```

## Handling Invalid Keys

ConfigMap keys become environment variable names, so they must follow certain rules. Environment variable names can only contain letters, digits, and underscores, and cannot start with a digit. If your ConfigMap has keys with dots or dashes (like `app.name` or `cache-ttl`), they will cause issues when loaded via `envFrom`.

```yaml
# This ConfigMap has keys that won't work as env vars
apiVersion: v1
kind: ConfigMap
metadata:
  name: problematic-config
data:
  app.name: "myapp"          # Dot is not valid in env var names
  cache-ttl: "3600"           # Dash is not valid in env var names
  VALID_KEY: "this-works"     # This one is fine
```

When you use `envFrom` with this ConfigMap, Kubernetes will skip the invalid keys and log a warning event. You can still access them via `valueFrom` with explicit variable naming:

```yaml
env:
- name: APP_NAME
  valueFrom:
    configMapKeyRef:
      name: problematic-config
      key: app.name
```

## Summary

Using ConfigMaps as environment variables on Talos Linux is straightforward and fits perfectly with the platform's API-driven approach to configuration. Use `valueFrom` when you need explicit control over variable naming, use `envFrom` when you want to bulk-load configuration, and remember that environment variables are set at startup time and will not update automatically. For production deployments, combine ConfigMaps with proper rollout strategies to ensure your applications always run with the correct configuration.
