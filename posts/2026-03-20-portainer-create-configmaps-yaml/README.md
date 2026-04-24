# How to Create ConfigMaps via YAML Manifest in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, YAML, DevOps

Description: Learn how to create Kubernetes ConfigMaps using YAML manifests in Portainer's editor for complex configurations, configuration files, and GitOps workflows.

## Introduction

While Portainer's form UI is convenient for simple ConfigMaps, YAML manifests offer more control, support for complex configurations, and enable GitOps workflows where configuration is stored and versioned in Git. Portainer's manifest deployment flow supports creating ConfigMaps directly from YAML, and Git-backed manifest deployments fit naturally into GitOps workflows. This guide covers creating ConfigMaps via YAML in Portainer.

## Prerequisites

- Portainer with Kubernetes environment
- An existing target namespace (for example, `production`) if your manifest sets `metadata.namespace`
- Familiarity with basic YAML syntax

## Step 1: Open the Manifest Deployment Flow in Portainer

1. Select your Kubernetes environment
2. Navigate to **ConfigMaps & Secrets** → **ConfigMaps**
3. Click **Create from manifest**
4. Portainer opens the manifest deployment flow. If your YAML sets `metadata.namespace`, leave Namespace set to `default` and enable **Use namespace(s) specified from manifest**
5. Choose **Manifest** and use the **Web editor**

Alternatively, navigate directly to the manifest deployment flow:
1. Go to **Applications**
2. Click **Create from code**
3. Choose **Manifest**, then use the **Web editor**

## Step 2: Basic ConfigMap YAML Structure

A minimal ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: production
  labels:
    app: my-app
    environment: production
data:
  DATABASE_HOST: "postgres.production.svc.cluster.local"
  DATABASE_PORT: "5432"
  APP_ENV: "production"
  LOG_LEVEL: "info"
  CACHE_TTL: "3600"
```

## Step 3: ConfigMap with Configuration Files

Store entire configuration files as ConfigMap values using the literal block scalar (`|`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: production
data:
  nginx.conf: |
    user nginx;
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /var/run/nginx.pid;

    events {
        worker_connections 1024;
    }

    http {
        include /etc/nginx/mime.types;
        default_type application/octet-stream;

        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';

        access_log /var/log/nginx/access.log main;
        sendfile on;
        keepalive_timeout 65;
        include /etc/nginx/conf.d/*.conf;
    }

  default.conf: |
    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://app:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
        }

        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
```

## Step 4: ConfigMap with Application Properties

Java Spring Boot configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spring-config
  namespace: production
data:
  application.yaml: |
    server:
      port: 8080
      shutdown: graceful

    spring:
      datasource:
        url: jdbc:postgresql://postgres:5432/mydb
        driver-class-name: org.postgresql.Driver
        hikari:
          maximum-pool-size: 10
          connection-timeout: 30000
      data:
        redis:
          host: redis
          port: 6379

    management:
      endpoints:
        web:
          exposure:
            include: health,info,metrics,prometheus
      endpoint:
        health:
          show-details: always

    logging:
      level:
        com.company: INFO
        org.springframework: WARN
```

## Step 5: Multiple ConfigMaps for Different Purposes

Separate configuration by concern:

```yaml
# App configuration

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  API_TIMEOUT: "30s"
  MAX_CONNECTIONS: "100"

# Database configuration (non-sensitive)
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-config
  namespace: production
data:
  DB_HOST: "postgres.production.svc.cluster.local"
  DB_PORT: "5432"
  DB_NAME: "myapp"
  DB_MAX_CONNECTIONS: "20"
  DB_SSL_MODE: "require"

# Feature flags
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: production
data:
  FEATURE_NEW_UI: "true"
  FEATURE_BETA_API: "false"
  FEATURE_DARK_MODE: "true"
  FEATURE_ANALYTICS: "true"
```

Paste this entire multi-document YAML into Portainer's Web editor to create all three ConfigMaps at once.

## Step 6: Apply the YAML in Portainer

1. Paste the YAML manifest into Portainer's Web editor
2. Click **Deploy**
3. On a first-time deployment, Portainer shows a deployment summary similar to:
   ```text
   ConfigMap "app-config" created
   ConfigMap "db-config" created
   ConfigMap "feature-flags" created
   ```

## Step 7: Immutable ConfigMaps

For configuration that should not change after creation, use `immutable: true`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v2
  namespace: production
immutable: true
data:
  APP_VERSION: "2.0.0"
  DATABASE_SCHEMA_VERSION: "15"
  API_COMPATIBILITY: "v2"
```

Benefits of immutable ConfigMaps:
- Reduces load on kube-apiserver by closing watches for immutable ConfigMaps
- Prevents accidental modification of critical configuration
- Pods must be recreated to use a new version (use versioned names: `app-config-v2`, `app-config-v3`)

## Step 8: ConfigMap from kubectl (for Reference)

```bash
# Create from literal values
kubectl create configmap my-config \
  --from-literal=DATABASE_HOST=postgres \
  --from-literal=LOG_LEVEL=info \
  -n production

# Create from a file
kubectl create configmap nginx-config \
  --from-file=nginx.conf \
  -n production

# Create from a directory (all files become keys)
kubectl create configmap app-configs \
  --from-file=./config/ \
  -n production

# Create with dry-run to generate YAML (useful for GitOps)
kubectl create configmap my-config \
  --from-literal=KEY=value \
  --dry-run=client -o yaml > configmap.yaml
```

## Conclusion

YAML-based ConfigMap creation in Portainer enables complex configuration scenarios - multi-file configurations, environment-specific settings, and immutable versioned configs. The YAML approach integrates naturally with GitOps workflows where configuration is managed as code. Use separate ConfigMaps for different configuration concerns (app settings, database config, feature flags) to keep configuration modular and easy to update independently.
