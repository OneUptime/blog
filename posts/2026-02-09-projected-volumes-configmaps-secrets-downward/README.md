# How to Configure Projected Volumes to Combine ConfigMaps, Secrets, and Downward API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Volumes, ConfigMap, Secrets

Description: Master the use of projected volumes in Kubernetes to combine multiple volume sources including ConfigMaps, Secrets, DownwardAPI, and ServiceAccountToken into a single mounted directory with custom permissions and atomic updates.

---

Projected volumes allow you to combine multiple volume sources into a single directory mount. Instead of mounting several volumes at different paths, you can project ConfigMaps, Secrets, Downward API data, and service account tokens into one unified location.

## Understanding Projected Volumes

A projected volume combines these sources:

1. **Secret** - Sensitive configuration data
2. **ConfigMap** - Application configuration
3. **DownwardAPI** - Pod/container metadata
4. **ServiceAccountToken** - JWT tokens for authentication

Benefits of projected volumes:

- **Single mount point** - Simpler container configuration
- **Atomic updates** - All sources updated together
- **Custom permissions** - Fine-grained file mode control
- **Reduced volume mounts** - Cleaner pod specifications

## Basic Projected Volume

Combine a Secret and ConfigMap into one volume:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.conf: |
    server.port=8080
    server.host=0.0.0.0
  logging.conf: |
    level=INFO
    format=json
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  db-password: "super-secret-password"
  api-key: "sk-1234567890abcdef"
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-projected
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config-and-secrets
      mountPath: /etc/config
      readOnly: true
  volumes:
  - name: config-and-secrets
    projected:
      sources:
      # Project ConfigMap files
      - configMap:
          name: app-config
          items:
          - key: app.conf
            path: application.conf
          - key: logging.conf
            path: logging.conf
      # Project Secret files
      - secret:
          name: app-secrets
          items:
          - key: db-password
            path: secrets/database-password
          - key: api-key
            path: secrets/api-key
```

Deploy and verify:

```bash
kubectl apply -f projected-volume.yaml

# Check the mounted files
kubectl exec app-with-projected -- ls -la /etc/config

# Output shows both ConfigMap and Secret files:
# application.conf (from ConfigMap)
# logging.conf (from ConfigMap)
# secrets/database-password (from Secret)
# secrets/api-key (from Secret)

# Verify content
kubectl exec app-with-projected -- cat /etc/config/application.conf
kubectl exec app-with-projected -- cat /etc/config/secrets/database-password
```

## Adding Downward API Data

Include pod metadata using the Downward API:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-metadata
  labels:
    app: myapp
    version: v1.0.0
  annotations:
    deployment-id: "abc123"
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "200m"
    volumeMounts:
    - name: combined-config
      mountPath: /etc/podinfo
      readOnly: true
  volumes:
  - name: combined-config
    projected:
      sources:
      # Pod metadata
      - downwardAPI:
          items:
          - path: "labels"
            fieldRef:
              fieldPath: metadata.labels
          - path: "annotations"
            fieldRef:
              fieldPath: metadata.annotations
          - path: "pod-name"
            fieldRef:
              fieldPath: metadata.name
          - path: "namespace"
            fieldRef:
              fieldPath: metadata.namespace
          - path: "pod-ip"
            fieldRef:
              fieldPath: status.podIP
          # Container resource info
          - path: "cpu-limit"
            resourceFieldRef:
              containerName: app
              resource: limits.cpu
          - path: "memory-limit"
            resourceFieldRef:
              containerName: app
              resource: limits.memory
      # Application config
      - configMap:
          name: app-config
      # Secrets
      - secret:
          name: app-secrets
```

Access the metadata:

```bash
kubectl apply -f pod-with-downward.yaml

# View pod metadata
kubectl exec app-with-metadata -- cat /etc/podinfo/pod-name
kubectl exec app-with-metadata -- cat /etc/podinfo/namespace
kubectl exec app-with-metadata -- cat /etc/podinfo/labels
kubectl exec app-with-metadata -- cat /etc/podinfo/cpu-limit
```

## Custom File Permissions

Set specific permissions for projected files:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-permissions
spec:
  securityContext:
    fsGroup: 1000
    runAsUser: 1000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: secure-config
      mountPath: /etc/config
      readOnly: true
  volumes:
  - name: secure-config
    projected:
      # Set default mode for all files
      defaultMode: 0440  # r--r-----
      sources:
      - secret:
          name: app-secrets
          items:
          - key: db-password
            path: database-password
            # Override mode for specific file
            mode: 0400  # r--------
          - key: api-key
            path: api-key
            mode: 0400
      - configMap:
          name: app-config
          # ConfigMap files use defaultMode (0440)
```

Verify permissions:

```bash
kubectl exec app-with-permissions -- ls -la /etc/config

# Output shows custom permissions:
# -r--------  database-password (mode 0400)
# -r--------  api-key (mode 0400)
# -r--r-----  app.conf (defaultMode 0440)
```

## Service Account Token Projection

Project custom service account tokens with specific audiences and expiration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sa-token
spec:
  serviceAccountName: my-service-account
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: TOKEN_PATH
      value: /var/run/secrets/tokens/api-token
    volumeMounts:
    - name: projected-tokens
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: projected-tokens
    projected:
      sources:
      # Project service account token with custom audience
      - serviceAccountToken:
          path: api-token
          expirationSeconds: 3600  # 1 hour
          audience: api.mycompany.com
      # Project another token for different service
      - serviceAccountToken:
          path: vault-token
          expirationSeconds: 7200  # 2 hours
          audience: vault.mycompany.com
      # Include CA certificate
      - configMap:
          name: ca-certificates
          items:
          - key: ca.crt
            path: ca.crt
```

Use the projected tokens:

```bash
# View the token
kubectl exec app-with-sa-token -- cat /var/run/secrets/tokens/api-token

# Decode the JWT to see claims
kubectl exec app-with-sa-token -- cat /var/run/secrets/tokens/api-token | \
  cut -d'.' -f2 | base64 -d | jq .

# Output shows custom audience:
# {
#   "aud": ["api.mycompany.com"],
#   "exp": 1707476400,
#   "iat": 1707472800,
#   ...
# }
```

## Complete Application Configuration

Combine all sources for a production application:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    worker_processes auto;
    events { worker_connections 1024; }
    http {
      server {
        listen 8080;
        location / {
          root /usr/share/nginx/html;
        }
      }
    }
---
apiVersion: v1
kind: Secret
metadata:
  name: nginx-tls
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
---
apiVersion: v1
kind: Pod
metadata:
  name: nginx-server
  labels:
    app: nginx
    tier: frontend
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 8080
    volumeMounts:
    - name: config-volume
      mountPath: /etc/nginx
      readOnly: true
    - name: tls-certs
      mountPath: /etc/nginx/tls
      readOnly: true
    - name: pod-info
      mountPath: /usr/share/nginx/html/info
      readOnly: true
  volumes:
  # Main nginx configuration
  - name: config-volume
    projected:
      sources:
      - configMap:
          name: nginx-config
  # TLS certificates with restricted permissions
  - name: tls-certs
    projected:
      defaultMode: 0400
      sources:
      - secret:
          name: nginx-tls
  # Pod metadata for debugging
  - name: pod-info
    projected:
      sources:
      - downwardAPI:
          items:
          - path: "labels"
            fieldRef:
              fieldPath: metadata.labels
          - path: "name"
            fieldRef:
              fieldPath: metadata.name
          - path: "namespace"
            fieldRef:
              fieldPath: metadata.namespace
```

## Dynamic Configuration Updates

Projected volumes automatically update when sources change:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dynamic-config
data:
  feature-flags.json: |
    {
      "new-ui": false,
      "beta-features": false
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feature-flag-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feature-app
  template:
    metadata:
      labels:
        app: feature-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: CONFIG_PATH
          value: /etc/config/feature-flags.json
        command:
        - /bin/sh
        - -c
        - |
          # Watch for config changes and reload
          while true; do
            echo "Loading config from $CONFIG_PATH"
            # Your app should reload when config changes
            inotifywait -e modify,create $CONFIG_PATH
            echo "Config updated, reloading..."
          done
        volumeMounts:
        - name: config
          mountPath: /etc/config
      volumes:
      - name: config
        projected:
          sources:
          - configMap:
              name: dynamic-config
```

Update the ConfigMap:

```bash
# Update feature flags
kubectl patch configmap dynamic-config --patch '
{
  "data": {
    "feature-flags.json": "{\"new-ui\": true, \"beta-features\": true}"
  }
}'

# ConfigMap changes propagate to pods (may take up to 60 seconds)
# Watch the app reload
kubectl logs -f deployment/feature-flag-app
```

## Multi-Environment Configuration

Use projected volumes for environment-specific configs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: base-config
data:
  app.conf: |
    app_name=myapp
    log_level=INFO
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prod-config
data:
  env.conf: |
    environment=production
    replicas=5
---
apiVersion: v1
kind: Secret
metadata:
  name: prod-secrets
stringData:
  database-url: "postgresql://prod-db:5432/myapp"
  api-key: "prod-api-key-xyz"
---
apiVersion: v1
kind: Pod
metadata:
  name: prod-app
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config
      mountPath: /etc/config
      readOnly: true
  volumes:
  - name: config
    projected:
      sources:
      # Base configuration (shared across environments)
      - configMap:
          name: base-config
      # Environment-specific configuration
      - configMap:
          name: prod-config
          items:
          - key: env.conf
            path: environment.conf
      # Environment-specific secrets
      - secret:
          name: prod-secrets
      # Pod metadata for logging context
      - downwardAPI:
          items:
          - path: pod-info.txt
            fieldRef:
              fieldPath: metadata.name
```

## Monitoring Projected Volumes

Track volume sources and updates:

```bash
# List pods using projected volumes
kubectl get pods -o json | jq -r '.items[] |
  select(.spec.volumes[]?.projected != null) |
  {
    pod: .metadata.name,
    namespace: .metadata.namespace,
    projectedVolumes: [.spec.volumes[] | select(.projected != null) | .name]
  }'

# Check volume source details
kubectl get pod app-with-projected -o json | \
  jq '.spec.volumes[] | select(.projected != null) | .projected.sources'

# Monitor ConfigMap/Secret updates
kubectl get events --field-selector involvedObject.kind=ConfigMap -w
```

## Best Practices

1. **Combine related configs** into single projected volumes
2. **Set appropriate permissions** with defaultMode and per-file modes
3. **Use Downward API** for dynamic pod metadata
4. **Project service account tokens** with specific audiences
5. **Watch for updates** if your app needs live config reloads
6. **Organize paths logically** within the projected volume
7. **Document volume structure** for team clarity
8. **Test permission changes** before deploying to production

Projected volumes simplify pod configuration by combining multiple sources into a single mount point, reducing complexity while providing flexible control over file permissions and updates.
