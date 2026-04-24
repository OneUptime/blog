# How to Configure Kubernetes Application Environment Variables in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Environment Variable, Configuration, DevOps

Description: Learn how to configure environment variables for Kubernetes applications in Portainer using direct values, ConfigMaps, and Secrets.

## Introduction

Environment variables are the primary way to configure containerized applications without rebuilding images. Kubernetes commonly injects environment variables using direct values, ConfigMap references, Secret references, and the Downward API. Portainer's form interface covers the first three directly, and its YAML editor lets you use the Downward API as well. This guide covers configuring environment variables for Kubernetes applications.

## Prerequisites

- Portainer with Kubernetes environment
- An application deployed or being deployed
- ConfigMaps and Secrets created (if using references)

## Method 1: Direct Environment Variable Values

Best for non-sensitive configuration that varies per deployment.

### Via Portainer Form

1. Open **Applications → Add with form** or edit an existing application
2. Scroll to **Environment variables** section
3. Click **+ Add environment variable**
4. Enter name and value:

```text
Name:   NODE_ENV         Value: production
Name:   PORT             Value: 8080
Name:   LOG_LEVEL        Value: info
Name:   FEATURE_FLAGS    Value: "feature-a,feature-b"
```

### Via YAML Manifest

```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "8080"    # Note: must be string in YAML
        - name: LOG_LEVEL
          value: info
        - name: DB_HOST
          value: postgres.production.svc.cluster.local
```

## Method 2: Environment Variables from ConfigMaps

Best for configuration shared across multiple pods or managed separately from the image.

### Create a ConfigMap First

Via Portainer:
1. Go to **ConfigMaps & Secrets → ConfigMaps → Add with form**
2. Add key-value pairs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  NODE_ENV: production
  LOG_LEVEL: info
  MAX_CONNECTIONS: "100"
  CACHE_TTL: "3600"
  DATABASE_HOST: postgres.production.svc.cluster.local
```

### Reference ConfigMap in Application

In Portainer application form, under **ConfigMaps**:

```text
ConfigMap: app-config
Result:    Valid keys are exposed as environment variables
```

### Reference All Keys from ConfigMap (envFrom)

```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      envFrom:
        - configMapRef:
            name: app-config   # Loads valid keys as environment variables
```

### Reference Specific Keys

```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST
              optional: true    # Don't fail if key doesn't exist
```

## Method 3: Environment Variables from Secrets

Best for sensitive data: passwords, API keys, tokens.

### Create a Secret First

Via Portainer:
1. Go to **ConfigMaps & Secrets → Secrets → Add with form**
2. Add key-value pairs:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:    # Plain-text input; Kubernetes stores it in data
  DB_PASSWORD: "MySecurePassword123!"
  DB_USER: appuser
  API_KEY: "sk-xxxxxxxxxxxxxxxxxxxx"
```

### Reference Secret in Application

In Portainer form, under **Secrets**:

```text
Secret: db-credentials
Result: Valid keys are exposed as environment variables
```

### Reference in YAML

```yaml
spec:
  containers:
    - name: app
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_PASSWORD
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: API_KEY
```

### Load All Secret Keys as Environment Variables

```yaml
spec:
  containers:
    - name: app
      envFrom:
        - secretRef:
            name: db-credentials   # Valid keys become env vars
```

## Method 4: Downward API (Pod/Node Information)

Inject pod metadata as environment variables:

```yaml
spec:
  containers:
    - name: app
      env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: MEMORY_LIMIT
          valueFrom:
            resourceFieldRef:
              containerName: app
              resource: limits.memory
```

## Combining Multiple Sources

```yaml
spec:
  containers:
    - name: app
      # Load all from ConfigMap
      envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
      # Override or add specific values
      env:
        - name: NODE_ENV
          value: production     # Overrides any matching key from configMapRef
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

## Environment Variable Ordering

When using `envFrom` and `env` together:
1. If the same key appears in multiple `envFrom` sources, the last source wins
2. Values defined in `env` override values imported through `envFrom`
3. If one `env` entry references another, define the referenced variable earlier in the list

## Verify Environment Variables in Running Pods

```bash
# View all env vars in a running pod

kubectl exec <pod-name> -n production -- env | sort

# Check a specific variable
kubectl exec <pod-name> -n production -- printenv DATABASE_URL
```

In Portainer: navigate to the pod and use the **Console** feature to run `env`.

## Conclusion

Portainer makes it easy to configure direct values, ConfigMap references, and Secret references through the form interface, and its YAML editor lets you use those patterns plus downward API fields. For best practices, store configuration in ConfigMaps, sensitive data in Secrets, and use direct values only for truly static, non-sensitive settings. This separation makes configuration easier to manage, but changes to ConfigMaps or Secrets used as environment variables only take effect after the pod is recreated or restarted.
