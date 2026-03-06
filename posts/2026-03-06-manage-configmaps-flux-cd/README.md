# How to Manage ConfigMaps with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, ConfigMap, Configuration Management, GitOps, Kustomize

Description: A practical guide to managing Kubernetes ConfigMaps with Flux CD, including templating, environment-specific configs, and automatic rollouts on config changes.

---

## Introduction

ConfigMaps store non-confidential configuration data in Kubernetes as key-value pairs. When managed through Flux CD, your application configuration becomes version-controlled, auditable, and consistently deployed across environments.

This guide covers practical patterns for managing ConfigMaps with Flux CD, including environment-specific configurations, automatic pod restarts on config changes, and advanced templating techniques.

## Prerequisites

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  production/
    apps.yaml
  staging/
    apps.yaml
apps/
  myapp/
    base/
      kustomization.yaml
      configmap.yaml
      deployment.yaml
    overlays/
      production/
        kustomization.yaml
        configmap-patch.yaml
      staging/
        kustomization.yaml
        configmap-patch.yaml
```

## Basic ConfigMap Management

```yaml
# apps/myapp/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp
  labels:
    app: myapp
    app.kubernetes.io/managed-by: flux
data:
  # Simple key-value configuration
  APP_PORT: "8080"
  LOG_LEVEL: "info"
  CACHE_TTL: "300"
  MAX_CONNECTIONS: "100"

  # Multi-line configuration file
  app.yaml: |
    server:
      port: 8080
      host: 0.0.0.0
      readTimeout: 30s
      writeTimeout: 30s
    database:
      maxOpenConns: 25
      maxIdleConns: 5
      connMaxLifetime: 5m
    logging:
      level: info
      format: json
      output: stdout
    features:
      caching: true
      rateLimit: true
      metrics: true
```

## Using ConfigMaps in Deployments

```yaml
# apps/myapp/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry.io/myapp:v1.5.0
          ports:
            - containerPort: 8080
          # Load individual keys as environment variables
          env:
            - name: APP_PORT
              valueFrom:
                configMapKeyRef:
                  name: myapp-config
                  key: APP_PORT
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: myapp-config
                  key: LOG_LEVEL
          # Load all keys as environment variables
          envFrom:
            - configMapRef:
                name: myapp-env
          # Mount configuration files
          volumeMounts:
            - name: config
              mountPath: /etc/myapp/
              readOnly: true
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
      volumes:
        - name: config
          configMap:
            name: myapp-config
            items:
              # Only mount the YAML config file
              - key: app.yaml
                path: app.yaml
```

## Automatic Rollouts on ConfigMap Changes

Kubernetes does not automatically restart pods when a ConfigMap changes. Use Kustomize's configMapGenerator to append a hash to the ConfigMap name:

```yaml
# apps/myapp/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - namespace.yaml

# Generate ConfigMaps with a hash suffix
# When content changes, a new ConfigMap is created with a new hash
# This triggers a rolling update of the Deployment
configMapGenerator:
  - name: myapp-config
    namespace: myapp
    files:
      - app.yaml=configs/app.yaml
    literals:
      - APP_PORT=8080
      - LOG_LEVEL=info
      - CACHE_TTL=300

  - name: myapp-env
    namespace: myapp
    literals:
      - DATABASE_HOST=postgres.database.svc.cluster.local
      - DATABASE_PORT=5432
      - REDIS_HOST=redis.cache.svc.cluster.local
      - REDIS_PORT=6379
```

Place your configuration files in the repository:

```yaml
# apps/myapp/base/configs/app.yaml
server:
  port: 8080
  host: 0.0.0.0
  readTimeout: 30s
  writeTimeout: 30s
database:
  maxOpenConns: 25
  maxIdleConns: 5
  connMaxLifetime: 5m
logging:
  level: info
  format: json
```

## Environment-Specific Configuration

### Production Overlay

```yaml
# apps/myapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

# Override ConfigMap values for production
configMapGenerator:
  - name: myapp-config
    namespace: myapp
    behavior: merge
    files:
      - app.yaml=configs/app-production.yaml
    literals:
      - APP_PORT=8080
      - LOG_LEVEL=warn
      - CACHE_TTL=3600
      - MAX_CONNECTIONS=500

  - name: myapp-env
    namespace: myapp
    behavior: merge
    literals:
      - DATABASE_HOST=prod-postgres.database.svc.cluster.local
      - DATABASE_PORT=5432
      - REDIS_HOST=prod-redis.cache.svc.cluster.local
      - REDIS_PORT=6379
```

```yaml
# apps/myapp/overlays/production/configs/app-production.yaml
server:
  port: 8080
  host: 0.0.0.0
  readTimeout: 60s
  writeTimeout: 60s
database:
  maxOpenConns: 100
  maxIdleConns: 25
  connMaxLifetime: 10m
logging:
  level: warn
  format: json
features:
  caching: true
  rateLimit: true
  metrics: true
  debugEndpoints: false
```

### Staging Overlay

```yaml
# apps/myapp/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

configMapGenerator:
  - name: myapp-config
    namespace: myapp
    behavior: merge
    files:
      - app.yaml=configs/app-staging.yaml
    literals:
      - APP_PORT=8080
      - LOG_LEVEL=debug
      - CACHE_TTL=60
      - MAX_CONNECTIONS=50

  - name: myapp-env
    namespace: myapp
    behavior: merge
    literals:
      - DATABASE_HOST=staging-postgres.database.svc.cluster.local
      - DATABASE_PORT=5432
      - REDIS_HOST=staging-redis.cache.svc.cluster.local
      - REDIS_PORT=6379
```

## Flux Kustomization per Environment

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/myapp/overlays/production
  prune: true
  wait: true
  timeout: 5m
---
# clusters/staging/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/myapp/overlays/staging
  prune: true
  wait: true
  timeout: 5m
```

## ConfigMaps with Flux Variable Substitution

Use Flux post-build variable substitution for dynamic values:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/myapp/base
  prune: true
  # Substitute variables from ConfigMaps and Secrets
  postBuild:
    substitute:
      CLUSTER_NAME: "production-us-east-1"
      ENVIRONMENT: "production"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
      - kind: Secret
        name: cluster-secrets
```

```yaml
# apps/myapp/base/configmap.yaml (with variable placeholders)
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp
data:
  APP_PORT: "8080"
  LOG_LEVEL: "${LOG_LEVEL:=info}"
  CLUSTER_NAME: "${CLUSTER_NAME}"
  ENVIRONMENT: "${ENVIRONMENT}"
  # Default value if variable is not set
  FEATURE_FLAG: "${FEATURE_FLAG:=false}"
```

```yaml
# Cluster-level variables ConfigMap
# clusters/production/cluster-vars.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-vars
  namespace: flux-system
data:
  LOG_LEVEL: "warn"
  FEATURE_FLAG: "true"
  REGION: "us-east-1"
```

## Nginx Configuration via ConfigMap

A practical example of managing Nginx configuration:

```yaml
# apps/nginx/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: web
data:
  nginx.conf: |
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /tmp/nginx.pid;

    events {
        worker_connections 1024;
    }

    http {
        include       /etc/nginx/mime.types;
        default_type  application/octet-stream;

        # Logging format
        log_format main '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent"';

        access_log /var/log/nginx/access.log main;

        sendfile        on;
        keepalive_timeout  65;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript;

        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

        server {
            listen 8080;
            server_name _;

            location / {
                root /usr/share/nginx/html;
                index index.html;
                try_files $uri $uri/ /index.html;
            }

            location /api/ {
                limit_req zone=api burst=20 nodelay;
                proxy_pass http://api-service:8080/;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }

            location /health {
                return 200 'OK';
                add_header Content-Type text/plain;
            }
        }
    }
```

## Immutable ConfigMaps

For configuration that should never change once deployed:

```yaml
# apps/myapp/static-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-static-config
  namespace: myapp
# Immutable ConfigMaps cannot be updated - only deleted and recreated
# This improves cluster performance for large ConfigMaps
immutable: true
data:
  SCHEMA_VERSION: "3"
  API_VERSION: "v2"
  FEATURE_SET: "standard"
```

## Monitoring ConfigMap Changes

```yaml
# clusters/my-cluster/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: config-change-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: myapp
  summary: "Application configuration change detected"
```

## Summary

Managing ConfigMaps with Flux CD provides a robust, auditable configuration management workflow:

- Use Kustomize configMapGenerator with hash suffixes to trigger automatic pod rollouts on config changes
- Leverage overlays to maintain environment-specific configurations without duplication
- Use Flux post-build variable substitution for cluster-specific dynamic values
- Mark static configuration as immutable for performance and safety
- Mount configuration files as volumes for complex multi-line configs
- Use envFrom to load all ConfigMap keys as environment variables
- Set up notifications to track configuration changes in real time
