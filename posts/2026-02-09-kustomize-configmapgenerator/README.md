# How to use Kustomize configMapGenerator for dynamic ConfigMap creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Learn how to use Kustomize configMapGenerator to dynamically create ConfigMaps from literals, files, and environment variables with automatic hash suffixes.

---

Kustomize's configMapGenerator automates ConfigMap creation and adds hash suffixes to trigger pod restarts when configuration changes. Instead of manually managing ConfigMaps and updating references, the generator handles both tasks automatically. This eliminates a common source of deployment problems where configuration changes don't propagate to running pods.

## Understanding configMapGenerator

The configMapGenerator creates ConfigMaps from various sources: literal key-value pairs, files, or environment files. Kustomize automatically appends a hash suffix to the generated ConfigMap name and updates all references in your resources. When the source content changes, the hash changes, causing Kubernetes to recognize the configuration update and restart affected pods.

This automatic behavior solves the problem where updating a ConfigMap doesn't trigger pod restarts because Kubernetes treats ConfigMaps as immutable after creation from a pod's perspective.

## Basic literal ConfigMap generation

Create ConfigMaps from literal values:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

configMapGenerator:
- name: app-config
  literals:
  - database_host=postgres.default.svc.cluster.local
  - database_port=5432
  - cache_enabled=true
  - log_level=info
```

This generates a ConfigMap named `app-config-<hash>`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-k8h5t7m9g4
data:
  database_host: postgres.default.svc.cluster.local
  database_port: "5432"
  cache_enabled: "true"
  log_level: info
```

## Referencing generated ConfigMaps

Kustomize automatically updates references:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        envFrom:
        - configMapRef:
            name: app-config  # Kustomize updates this to app-config-k8h5t7m9g4
```

The generated manifest includes the hash suffix automatically.

## Generating from files

Create ConfigMaps from configuration files:

```yaml
# base/kustomization.yaml
configMapGenerator:
- name: app-config
  files:
  - config/application.properties
  - config/logging.yaml
  - nginx.conf=config/nginx/default.conf
```

File contents become ConfigMap data with the filename as the key. Use the `key=filepath` syntax to specify custom keys.

## Combining sources

Mix literals and files in one ConfigMap:

```yaml
configMapGenerator:
- name: mixed-config
  literals:
  - environment=production
  - version=v2.1.0
  files:
  - database.yaml
  - config/features.json
```

All sources merge into a single ConfigMap.

## Generating from env files

Create ConfigMaps from environment files:

```yaml
# base/app.env
DATABASE_HOST=postgres.default.svc
DATABASE_PORT=5432
CACHE_ENABLED=true
REDIS_HOST=redis.default.svc
```

Generate ConfigMap from this file:

```yaml
# base/kustomization.yaml
configMapGenerator:
- name: app-env
  envs:
  - app.env
```

This creates a ConfigMap with each line as a key-value pair.

## Environment-specific ConfigMaps

Override ConfigMap values in overlays:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - database_host=prod-postgres.production.svc.cluster.local
  - log_level=warn
  - cache_enabled=true
  - max_connections=200
```

The `behavior: merge` combines with base ConfigMap values.

## Replacing entire ConfigMaps

Override the complete ConfigMap in an overlay:

```yaml
# overlays/production/kustomization.yaml
configMapGenerator:
- name: app-config
  behavior: replace
  literals:
  - database_host=prod-postgres.production.svc.cluster.local
  - database_port=5432
  - cache_enabled=true
  - log_level=error
  - environment=production
```

The `behavior: replace` ignores base values entirely.

## Binary data in ConfigMaps

Include binary files:

```yaml
configMapGenerator:
- name: app-assets
  files:
  - logo.png
  - favicon.ico
  options:
    disableNameSuffixHash: false
```

Binary data is base64 encoded automatically.

## Disabling hash suffixes

Sometimes you need stable ConfigMap names:

```yaml
configMapGenerator:
- name: app-config
  literals:
  - key=value
  options:
    disableNameSuffixHash: true
```

Use this carefully as configuration changes won't trigger automatic pod restarts.

## Adding labels and annotations

Customize generated ConfigMap metadata:

```yaml
configMapGenerator:
- name: app-config
  literals:
  - database_host=postgres
  options:
    labels:
      app: web-app
      tier: backend
    annotations:
      config-version: "v2.1"
      managed-by: kustomize
```

Labels and annotations help with organization and tracking.

## Immutable ConfigMaps

Create immutable ConfigMaps for better performance:

```yaml
configMapGenerator:
- name: app-config
  literals:
  - database_host=postgres
  options:
    immutable: true
```

Kubernetes can optimize immutable ConfigMaps by not watching for changes.

## Multi-file ConfigMap generation

Generate from an entire directory:

```yaml
configMapGenerator:
- name: nginx-config
  files:
  - configs/nginx/nginx.conf
  - configs/nginx/mime.types
  - configs/nginx/fastcgi.conf
```

Or use a pattern:

```bash
# Generate from all .conf files
files:
- configs/*.conf
```

## Environment file with custom keys

Override keys from environment files:

```yaml
# base/database.env
HOST=postgres
PORT=5432
USER=app

# base/kustomization.yaml
configMapGenerator:
- name: db-config
  envs:
  - database.env
  literals:
  - password=placeholder  # Override in overlay
```

## Layering ConfigMaps

Build ConfigMaps across multiple layers:

```yaml
# base/kustomization.yaml
configMapGenerator:
- name: app-config
  literals:
  - app_name=myapp
  - version=1.0.0

# overlays/staging/kustomization.yaml
configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - environment=staging
  - debug=true

# overlays/production/kustomization.yaml
configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - environment=production
  - debug=false
  - replicas=10
```

Each layer adds or overrides specific values.

## Using generated ConfigMaps in volumes

Mount generated ConfigMaps as files:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        volumeMounts:
        - name: config
          mountPath: /etc/config
      volumes:
      - name: config
        configMap:
          name: app-config  # Automatically updated with hash
```

Kustomize handles the name reference update.

## ConfigMap for entire configuration files

Generate from JSON or YAML configurations:

```yaml
# base/app-config.yaml
database:
  host: postgres
  port: 5432
  pool_size: 10
cache:
  enabled: true
  ttl: 3600
features:
  new_ui: false
  api_v2: true

# base/kustomization.yaml
configMapGenerator:
- name: full-config
  files:
  - application.yaml=app-config.yaml
```

## Rolling restarts on config changes

The hash suffix automatically triggers restarts:

```bash
# Update config
echo "new_setting=enabled" >> base/app.env

# Rebuild
kustomize build base/

# New hash is generated: app-config-7gh9k2m3f8
# All pods using this ConfigMap will restart
```

This ensures configuration changes propagate immediately.

## Validation and testing

Test generated ConfigMaps:

```bash
# View generated ConfigMap
kustomize build base/ | kubectl get -f - configmap -o yaml

# Check hash generation
kustomize build base/ | grep "name: app-config-"

# Verify data contents
kustomize build base/ | yq eval '.data' -

# Apply dry run
kustomize build base/ | kubectl apply --dry-run=client -f -
```

## Best practices

Keep ConfigMap sizes manageable. Kubernetes limits ConfigMaps to 1MB. For larger configurations, consider splitting into multiple ConfigMaps or using external configuration stores.

Use literals for simple key-value pairs and files for complex structured data. This keeps your kustomization files readable.

Always use hash suffixes in production unless you have a specific reason not to. The automatic restart behavior prevents configuration drift.

## Conclusion

Kustomize configMapGenerator simplifies ConfigMap management by automatically creating them from various sources and handling hash suffixes for automatic pod restarts. Whether you are working with literal values, files, or environment variables, the generator provides a declarative way to manage configuration that changes across environments. The automatic hash suffix behavior ensures your configuration changes propagate reliably to running workloads.
