# How to Use ConfigMaps with Environment Variables in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ConfigMaps, Environment Variables, Configuration, DevOps

Description: Learn how to inject ConfigMap data as environment variables in Kubernetes pods. This guide covers single values, bulk injection, and best practices for configuration management.

---

ConfigMaps store non-sensitive configuration data that your applications need. While you can mount ConfigMaps as files, injecting them as environment variables is often simpler for applications that read configuration from the environment. This guide shows you multiple ways to use ConfigMap data as environment variables.

## Create a ConfigMap

First, create a ConfigMap with your configuration:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  # Simple key-value pairs
  LOG_LEVEL: info
  DATABASE_HOST: postgres.database.svc.cluster.local
  DATABASE_PORT: "5432"
  CACHE_ENABLED: "true"
  MAX_CONNECTIONS: "100"
```

Apply it:

```bash
kubectl apply -f configmap.yaml
```

Or create imperatively:

```bash
# From literals
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=DATABASE_HOST=postgres.database.svc.cluster.local \
  --from-literal=DATABASE_PORT=5432

# From a file
kubectl create configmap app-config --from-env-file=config.env
```

## Method 1: Inject All ConfigMap Values

Use `envFrom` to inject all key-value pairs as environment variables:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    envFrom:
    # All keys from app-config become environment variables
    - configMapRef:
        name: app-config
```

Inside the container:

```bash
echo $LOG_LEVEL        # info
echo $DATABASE_HOST    # postgres.database.svc.cluster.local
echo $DATABASE_PORT    # 5432
```

### Add a Prefix

Avoid naming conflicts by adding a prefix:

```yaml
envFrom:
- configMapRef:
    name: app-config
  prefix: APP_  # All vars get APP_ prefix
```

Result:

```bash
echo $APP_LOG_LEVEL       # info
echo $APP_DATABASE_HOST   # postgres.database.svc.cluster.local
```

## Method 2: Select Specific Values

Use `valueFrom` to inject specific ConfigMap keys:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    env:
    # Single value from ConfigMap
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: LOG_LEVEL
    # Different env var name than ConfigMap key
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: DATABASE_HOST
```

This gives you control over:
- Which values to include
- The environment variable names

## Method 3: Mix ConfigMaps, Secrets, and Literals

Combine multiple sources:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    env:
    # Static value
    - name: APP_VERSION
      value: "1.2.3"
    # From ConfigMap
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: LOG_LEVEL
    # From Secret
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secrets
          key: password
    # From pod metadata
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    envFrom:
    # Bulk inject remaining config
    - configMapRef:
        name: app-config
        optional: true  # Pod starts even if ConfigMap missing
```

## Method 4: Multiple ConfigMaps

Combine multiple ConfigMaps:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    envFrom:
    # Database configuration
    - configMapRef:
        name: db-config
      prefix: DB_
    # Cache configuration
    - configMapRef:
        name: cache-config
      prefix: CACHE_
    # Feature flags
    - configMapRef:
        name: feature-flags
      prefix: FEATURE_
```

## Practical Example: Complete Deployment

```yaml
# configmaps.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-settings
data:
  LOG_LEVEL: info
  LOG_FORMAT: json
  API_TIMEOUT: "30"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: database-config
data:
  HOST: postgres.database.svc.cluster.local
  PORT: "5432"
  NAME: myapp
  SSL_MODE: require
---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: mycompany/api-server:1.0
        ports:
        - containerPort: 8080
        env:
        # Pod identity
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        envFrom:
        # Application settings
        - configMapRef:
            name: app-settings
        # Database settings with prefix
        - configMapRef:
            name: database-config
          prefix: DATABASE_
        # Secrets for sensitive data
        - secretRef:
            name: api-secrets
```

## Handling Updates

ConfigMap changes are not automatically reflected in running pods when using environment variables. You need to restart pods:

```bash
# Restart deployment to pick up ConfigMap changes
kubectl rollout restart deployment/api-server

# Or delete pods to trigger recreation
kubectl delete pods -l app=api-server
```

For automatic restarts, use annotations with checksums:

```yaml
# In deployment template
metadata:
  annotations:
    checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

Or use tools like Reloader:

```bash
# Install Reloader
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml

# Add annotation to deployment
kubectl annotate deployment api-server reloader.stakater.com/auto="true"
```

## Debugging Environment Variables

Verify environment variables are set correctly:

```bash
# List all environment variables in a pod
kubectl exec my-app -- env

# Check specific variable
kubectl exec my-app -- printenv LOG_LEVEL

# Or in shell
kubectl exec -it my-app -- sh -c 'echo $LOG_LEVEL'
```

## Common Patterns

### Environment-Specific ConfigMaps

Use different ConfigMaps per environment:

```bash
# Development
kubectl create configmap app-config --from-env-file=config.dev.env -n dev

# Production
kubectl create configmap app-config --from-env-file=config.prod.env -n prod
```

### Optional ConfigMaps

Make ConfigMap references optional so pods start even if ConfigMap is missing:

```yaml
envFrom:
- configMapRef:
    name: app-config
    optional: true  # Pod starts without this ConfigMap
```

### Immutable ConfigMaps

For ConfigMaps that should not change (better performance, prevents accidental changes):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v1
data:
  LOG_LEVEL: info
immutable: true  # Cannot be changed after creation
```

## Best Practices

1. **Use descriptive key names** - `DATABASE_CONNECTION_TIMEOUT` is better than `TIMEOUT`
2. **Keep values as strings** - ConfigMap values must be strings, use quotes for numbers
3. **Separate concerns** - Different ConfigMaps for different purposes
4. **Use prefixes** - Prevent naming conflicts when combining ConfigMaps
5. **Version ConfigMaps** - For immutable configs, include version in name
6. **Document expected variables** - Make it clear what your app expects

```yaml
# Good: Clear, organized ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-server-config-v2
data:
  # Logging configuration
  LOG_LEVEL: info
  LOG_FORMAT: json

  # Server settings
  SERVER_PORT: "8080"
  SERVER_TIMEOUT_SECONDS: "30"

  # Feature flags
  FEATURE_NEW_AUTH: "true"
  FEATURE_METRICS: "enabled"
```

## Summary

ConfigMaps provide a clean way to inject configuration as environment variables. Use `envFrom` with `configMapRef` to inject all values at once, or `env` with `valueFrom` for selective injection. Add prefixes to avoid naming conflicts when combining multiple ConfigMaps. Remember that environment variables from ConfigMaps are set at pod creation time, so you need to restart pods to pick up changes. For sensitive data, use Secrets instead of ConfigMaps.
