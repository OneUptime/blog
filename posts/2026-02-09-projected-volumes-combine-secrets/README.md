# How to Use Projected Volumes to Combine Secrets from Multiple Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Volumes, Secrets

Description: Learn how to use Kubernetes projected volumes to combine multiple Secrets, ConfigMaps, and downward API data into a single mount point for simplified configuration management.

---

Applications often need configuration from multiple sources - database credentials from one Secret, API keys from another, application config from a ConfigMap, and pod metadata from the downward API. Mounting each source separately creates clutter with multiple volume mounts and complex path management.

Projected volumes solve this by combining multiple sources into a single directory. You can merge Secrets, ConfigMaps, downward API fields, and service account tokens into one mount point, simplifying your pod configuration and making file paths predictable.

In this guide, you'll learn how to create projected volumes, combine different source types, handle file conflicts, and implement practical patterns for multi-source configuration.

## Understanding Projected Volumes

A projected volume is a special volume type that projects multiple volume sources into the same directory. Each source can be:

- Secret
- ConfigMap
- Downward API
- Service account token

All files appear in a single directory with configurable paths and permissions.

## Basic Projected Volume Example

Combine a Secret and ConfigMap:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: "dbuser"
  password: "SecurePass123"
  host: "postgres.example.com"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  config.yaml: |
    log_level: info
    max_connections: 100
    timeout: 30
  features.json: |
    {
      "darkMode": true,
      "analytics": false
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: web-app:latest
        volumeMounts:
        - name: combined-config
          mountPath: /etc/app-config
          readOnly: true
      volumes:
      - name: combined-config
        projected:
          sources:
          - secret:
              name: database-credentials
          - configMap:
              name: app-config
```

The `/etc/app-config` directory contains:

```
/etc/app-config/
├── username          (from Secret)
├── password          (from Secret)
├── host              (from Secret)
├── config.yaml       (from ConfigMap)
└── features.json     (from ConfigMap)
```

## Combining Multiple Secrets

Merge secrets from different sources:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-secrets
type: Opaque
stringData:
  db-password: "DBPassword123"
  db-host: "postgres.example.com"
---
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
type: Opaque
stringData:
  stripe-key: "sk_live_abc123"
  sendgrid-key: "SG.xyz789"
---
apiVersion: v1
kind: Secret
metadata:
  name: oauth-secrets
type: Opaque
stringData:
  client-id: "oauth-client-id"
  client-secret: "oauth-client-secret"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        image: api-server:latest
        volumeMounts:
        - name: all-secrets
          mountPath: /etc/secrets
          readOnly: true
      volumes:
      - name: all-secrets
        projected:
          sources:
          - secret:
              name: database-secrets
          - secret:
              name: api-secrets
          - secret:
              name: oauth-secrets
```

All secrets appear in `/etc/secrets`:

```
/etc/secrets/
├── db-password
├── db-host
├── stripe-key
├── sendgrid-key
├── client-id
└── client-secret
```

## Custom File Paths with items

Control where each file appears:

```yaml
volumes:
- name: structured-config
  projected:
    sources:
    - secret:
        name: database-secrets
        items:
        - key: db-password
          path: database/password
        - key: db-host
          path: database/host
    - secret:
        name: api-secrets
        items:
        - key: stripe-key
          path: api-keys/stripe
        - key: sendgrid-key
          path: api-keys/sendgrid
    - configMap:
        name: app-config
        items:
        - key: config.yaml
          path: config/app.yaml
```

Creates a structured directory:

```
/etc/app-config/
├── database/
│   ├── password
│   └── host
├── api-keys/
│   ├── stripe
│   └── sendgrid
└── config/
    └── app.yaml
```

## Setting File Permissions

Configure permissions for sensitive files:

```yaml
volumes:
- name: secure-config
  projected:
    defaultMode: 0400  # Read-only for owner
    sources:
    - secret:
        name: database-secrets
        items:
        - key: db-password
          path: db-password
          mode: 0400  # Override for specific file
    - configMap:
        name: app-config
        items:
        - key: config.yaml
          path: config.yaml
          mode: 0644  # Readable by all
```

## Combining with Downward API

Include pod metadata alongside secrets:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    metadata:
      labels:
        app: web-app
        version: v2.0.0
      annotations:
        deployment-id: "20260209-1030"
    spec:
      containers:
      - name: app
        image: web-app:latest
        volumeMounts:
        - name: combined-config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: combined-config
        projected:
          sources:
          # Secrets
          - secret:
              name: app-secrets
          # ConfigMap
          - configMap:
              name: app-config
          # Downward API
          - downwardAPI:
              items:
              - path: pod-name
                fieldRef:
                  fieldPath: metadata.name
              - path: pod-namespace
                fieldRef:
                  fieldPath: metadata.namespace
              - path: pod-ip
                fieldRef:
                  fieldPath: status.podIP
              - path: node-name
                fieldRef:
                  fieldPath: spec.nodeName
              - path: labels
                fieldRef:
                  fieldPath: metadata.labels
              - path: annotations
                fieldRef:
                  fieldPath: metadata.annotations
```

The combined directory:

```
/etc/config/
├── stripe-key          (from Secret)
├── config.yaml         (from ConfigMap)
├── pod-name            (from Downward API)
├── pod-namespace       (from Downward API)
├── pod-ip              (from Downward API)
├── node-name           (from Downward API)
├── labels              (from Downward API)
└── annotations         (from Downward API)
```

Your application can read pod information directly from files:

```python
# Read pod name
with open('/etc/config/pod-name', 'r') as f:
    pod_name = f.read().strip()

# Read labels
with open('/etc/config/labels', 'r') as f:
    labels = f.read()  # Key-value pairs
```

## Including Service Account Token

Combine service account token with other configuration:

```yaml
volumes:
- name: app-config
  projected:
    sources:
    - secret:
        name: app-secrets
    - configMap:
        name: app-config
    - serviceAccountToken:
        path: token
        expirationSeconds: 3600
        audience: "my-api"
```

Access the token:

```bash
TOKEN=$(cat /etc/config/token)
curl -H "Authorization: Bearer $TOKEN" https://api.example.com
```

## Real-World Example: Complete Application Config

Combine all configuration sources for a microservice:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:
  username: "appuser"
  password: "SecurePass123"
---
apiVersion: v1
kind: Secret
metadata:
  name: external-api-keys
  namespace: production
type: Opaque
stringData:
  stripe: "sk_live_abc123"
  datadog: "dd_api_xyz789"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: application-config
  namespace: production
data:
  config.yaml: |
    server:
      port: 8080
      timeout: 30
    logging:
      level: info
      format: json
    features:
      rate_limiting: true
      caching: true
  database.yaml: |
    pool:
      min: 5
      max: 20
    timeout: 30
    ssl: true
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        version: v2.1.0
    spec:
      serviceAccountName: api-service
      containers:
      - name: api
        image: api-service:v2.1.0
        volumeMounts:
        - name: app-config
          mountPath: /etc/app
          readOnly: true
        command:
        - /app/server
        - --config=/etc/app/config/config.yaml
        - --db-config=/etc/app/config/database.yaml
        - --credentials=/etc/app/secrets/credentials
        env:
        # Reference files in projected volume
        - name: CONFIG_DIR
          value: "/etc/app"
      volumes:
      - name: app-config
        projected:
          defaultMode: 0400
          sources:
          # Database credentials
          - secret:
              name: db-credentials
              items:
              - key: username
                path: secrets/credentials/db-username
              - key: password
                path: secrets/credentials/db-password
          # API keys
          - secret:
              name: external-api-keys
              items:
              - key: stripe
                path: secrets/api-keys/stripe
              - key: datadog
                path: secrets/api-keys/datadog
          # Application configuration
          - configMap:
              name: application-config
              items:
              - key: config.yaml
                path: config/config.yaml
                mode: 0644
              - key: database.yaml
                path: config/database.yaml
                mode: 0644
          # Pod metadata
          - downwardAPI:
              items:
              - path: metadata/pod-name
                fieldRef:
                  fieldPath: metadata.name
              - path: metadata/namespace
                fieldRef:
                  fieldPath: metadata.namespace
              - path: metadata/labels
                fieldRef:
                  fieldPath: metadata.labels
```

Directory structure:

```
/etc/app/
├── secrets/
│   ├── credentials/
│   │   ├── db-username
│   │   └── db-password
│   └── api-keys/
│       ├── stripe
│       └── datadog
├── config/
│   ├── config.yaml
│   └── database.yaml
└── metadata/
    ├── pod-name
    ├── namespace
    └── labels
```

## Handling File Name Conflicts

If multiple sources have the same key, the last one wins:

```yaml
volumes:
- name: config-with-override
  projected:
    sources:
    - configMap:
        name: default-config
        items:
        - key: app.yaml
          path: config.yaml
    - configMap:
        name: environment-override
        items:
        - key: app.yaml
          path: config.yaml  # Overrides previous config.yaml
```

Use subdirectories to avoid conflicts:

```yaml
volumes:
- name: config-no-conflict
  projected:
    sources:
    - configMap:
        name: default-config
        items:
        - key: app.yaml
          path: default/config.yaml
    - configMap:
        name: environment-override
        items:
        - key: app.yaml
          path: override/config.yaml
```

## Using with Init Containers

Prepare configuration in init containers:

```yaml
spec:
  initContainers:
  - name: config-merger
    image: busybox
    command:
    - sh
    - -c
    - |
      # Merge configurations
      cat /config/base/app.yaml /config/override/app.yaml > /merged/config.yaml
    volumeMounts:
    - name: projected-config
      mountPath: /config
    - name: merged-config
      mountPath: /merged
  containers:
  - name: app
    image: app:latest
    volumeMounts:
    - name: merged-config
      mountPath: /etc/app
  volumes:
  - name: projected-config
    projected:
      sources:
      - configMap:
          name: base-config
          items:
          - key: app.yaml
            path: base/app.yaml
      - configMap:
          name: override-config
          items:
          - key: app.yaml
            path: override/app.yaml
  - name: merged-config
    emptyDir: {}
```

## Best Practices

1. **Use projected volumes for related configuration**: Group related Secrets and ConfigMaps together.

2. **Structure paths logically**: Create subdirectories like `secrets/`, `config/`, `metadata/` for clarity.

3. **Set appropriate permissions**: Use restrictive permissions (0400) for sensitive files.

4. **Document file locations**: Add comments explaining the source of each file.

5. **Avoid file name conflicts**: Use subdirectories or unique names when combining multiple sources.

6. **Keep volumes read-only**: Always mount projected volumes as `readOnly: true` for security.

7. **Use items to select specific keys**: Don't expose unnecessary configuration in the projected volume.

8. **Version your ConfigMaps and Secrets**: Include version numbers in names for better change tracking.

Projected volumes simplify configuration management by combining multiple sources into a single mount point. This reduces clutter in pod specifications, creates predictable file paths, and makes it easier to manage complex configurations from multiple Secrets, ConfigMaps, and other sources.
