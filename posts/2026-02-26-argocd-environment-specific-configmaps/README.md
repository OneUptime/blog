# How to Handle Environment-Specific ConfigMaps in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration Management, Kustomize

Description: Learn how to manage environment-specific ConfigMaps across dev, staging, and production in ArgoCD using Kustomize generators, Helm values, and overlay patterns.

---

ConfigMaps are the standard way to inject non-sensitive configuration into Kubernetes workloads. Unlike Secrets, ConfigMaps can safely live in Git, which makes them a perfect fit for GitOps. The challenge is managing the differences between environments - dev needs debug logging, staging needs test endpoints, and production needs tuned performance settings. This guide covers practical patterns for handling environment-specific ConfigMaps with ArgoCD.

## The Base ConfigMap Pattern

Start by defining a base ConfigMap with default values that work for development:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
data:
  LOG_LEVEL: info
  DATABASE_POOL_SIZE: "5"
  CACHE_TTL: "300"
  FEATURE_NEW_UI: "false"
  CORS_ORIGINS: "*"
  RATE_LIMIT_RPS: "100"
  METRICS_ENABLED: "true"
  TRACING_ENABLED: "false"
```

Reference it in your base kustomization:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

## Using Kustomize Patches for Environment Overrides

The most straightforward approach uses strategic merge patches to override specific ConfigMap values per environment:

```yaml
# overlays/dev/configmap-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
data:
  LOG_LEVEL: debug
  TRACING_ENABLED: "true"
  FEATURE_NEW_UI: "true"
```

```yaml
# overlays/production/configmap-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
data:
  LOG_LEVEL: warn
  DATABASE_POOL_SIZE: "20"
  CACHE_TTL: "3600"
  CORS_ORIGINS: "https://myapp.example.com"
  RATE_LIMIT_RPS: "1000"
  METRICS_ENABLED: "true"
  TRACING_ENABLED: "true"
```

Reference the patches in each overlay's kustomization:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - path: configmap-patch.yaml
```

## Using Kustomize ConfigMap Generators

Kustomize has a built-in ConfigMap generator that creates ConfigMaps from files or literals. The generator adds a unique hash suffix to the ConfigMap name, which triggers a rolling update when values change:

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: dev

configMapGenerator:
  - name: my-app-config
    behavior: merge    # Merge with base ConfigMap
    literals:
      - LOG_LEVEL=debug
      - TRACING_ENABLED=true
      - FEATURE_NEW_UI=true
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production

configMapGenerator:
  - name: my-app-config
    behavior: merge
    literals:
      - LOG_LEVEL=warn
      - DATABASE_POOL_SIZE=20
      - CACHE_TTL=3600
      - CORS_ORIGINS=https://myapp.example.com
      - RATE_LIMIT_RPS=1000
```

The hash suffix behavior is powerful because it ensures pods restart when configuration changes, without needing to manually trigger rollouts.

## Generating ConfigMaps from Files

For complex configuration like application config files, use the file-based generator:

```yaml
# overlays/production/kustomization.yaml
configMapGenerator:
  - name: my-app-config-file
    files:
      - config.yaml=production-config.yaml
```

Where `production-config.yaml` contains the full application configuration:

```yaml
# overlays/production/production-config.yaml
server:
  port: 8080
  readTimeout: 30s
  writeTimeout: 30s

database:
  host: prod-db.internal
  port: 5432
  name: myapp
  maxConnections: 20
  sslMode: require

cache:
  host: prod-redis.internal
  port: 6379
  ttl: 3600

logging:
  level: warn
  format: json
  output: stdout

features:
  newUI: false
  betaAPI: false
```

The dev version would look different:

```yaml
# overlays/dev/dev-config.yaml
server:
  port: 8080
  readTimeout: 60s
  writeTimeout: 60s

database:
  host: localhost
  port: 5432
  name: myapp_dev
  maxConnections: 5
  sslMode: disable

cache:
  host: localhost
  port: 6379
  ttl: 60

logging:
  level: debug
  format: text
  output: stdout

features:
  newUI: true
  betaAPI: true
```

## Helm Values Approach for ConfigMaps

If you use Helm, ConfigMap values naturally come from your values files:

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "my-app.fullname" . }}-config
data:
  {{- range $key, $value := .Values.config }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
```

Then each environment's values file provides different configuration:

```yaml
# values-dev.yaml
config:
  LOG_LEVEL: debug
  DATABASE_POOL_SIZE: "5"
  CACHE_TTL: "60"
  FEATURE_NEW_UI: "true"

# values-production.yaml
config:
  LOG_LEVEL: warn
  DATABASE_POOL_SIZE: "20"
  CACHE_TTL: "3600"
  FEATURE_NEW_UI: "false"
```

## Mounting ConfigMaps in Deployments

Your deployment should reference the ConfigMap either as environment variables or as volume mounts:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: myregistry/my-app:latest
          # Load all ConfigMap entries as environment variables
          envFrom:
            - configMapRef:
                name: my-app-config
          # Or mount as a file
          volumeMounts:
            - name: config-volume
              mountPath: /etc/my-app/config.yaml
              subPath: config.yaml
      volumes:
        - name: config-volume
          configMap:
            name: my-app-config-file
```

## Handling ConfigMap Updates Without Restarts

If your application can reload configuration at runtime, you can use a sidecar or annotation-based approach instead of relying on Kustomize hash suffixes:

```yaml
# Add a checksum annotation to trigger rolling update on ConfigMap change
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        checksum/config: '{{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}'
```

This Helm approach recalculates the checksum whenever the ConfigMap template changes, triggering a new rollout.

## Validating ConfigMaps Before Deployment

Add a pre-sync hook to validate configuration before it is applied:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-config
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validator
          image: myregistry/config-validator:latest
          command:
            - /bin/sh
            - -c
            - |
              # Validate that required configuration keys exist
              REQUIRED_KEYS="LOG_LEVEL DATABASE_POOL_SIZE CACHE_TTL"
              for key in $REQUIRED_KEYS; do
                if ! kubectl get configmap my-app-config -n $NAMESPACE -o jsonpath="{.data.$key}" 2>/dev/null; then
                  echo "Missing required config key: $key"
                  exit 1
                fi
              done
              echo "Configuration validation passed"
      restartPolicy: Never
  backoffLimit: 0
```

## Sharing Common Configuration Across Environments

Some configuration values are the same across all environments. Keep these in the base ConfigMap and only override what differs:

```yaml
# base/configmap.yaml - shared values
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
data:
  APP_NAME: my-app
  APP_VERSION: v1.2.3
  METRICS_PORT: "9090"
  HEALTH_CHECK_PATH: /health
  GRACEFUL_SHUTDOWN_TIMEOUT: "30"
  # Environment-specific values have defaults that overlays can override
  LOG_LEVEL: info
  DATABASE_POOL_SIZE: "5"
```

## Best Practices

Keep ConfigMaps focused. Instead of one giant ConfigMap, split configuration into logical groups - application config, feature flags, external service endpoints. This makes it easier to update one concern without touching others.

Use Kustomize hash suffixes in production. They guarantee that pods pick up new configuration. Without them, pods running before a ConfigMap update will keep the old values until they restart.

Document every ConfigMap key. Add comments in your base ConfigMap explaining what each key does, its valid values, and its impact. This helps the team during code reviews of environment-specific overrides.

Test configuration changes in dev first. Even though ConfigMaps are not code, wrong values can break your application just as badly. A misconfigured database pool size or incorrect CORS origin can cause outages.

Managing environment-specific ConfigMaps with ArgoCD is straightforward once you establish a consistent pattern. Kustomize overlays and Helm values both work well. The key is keeping the base DRY and overlays minimal so reviewers can quickly see what differs between environments.
