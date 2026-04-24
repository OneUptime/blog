# How to Create ConfigMaps via Form in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, Configuration, DevOps

Description: Learn how to create Kubernetes ConfigMaps using Portainer's form-based interface for storing non-sensitive application configuration data.

## Introduction

ConfigMaps store non-sensitive configuration data as key-value pairs in Kubernetes. They decouple configuration from container images, allowing the same image to run in different environments with different configurations. Portainer provides a form-based interface for creating ConfigMaps without writing YAML directly. This guide walks through creating ConfigMaps using the Portainer form UI.

## Prerequisites

- Portainer with Kubernetes environment
- A namespace where you want to create the ConfigMap

## What ConfigMaps Store

ConfigMaps hold non-sensitive data such as:

```text
Application settings     - database URLs (not passwords), feature flags
Configuration files      - nginx.conf, app.properties, application.yaml
Environment-specific     - API endpoints, log levels, timeouts
Script content           - initialization scripts, migration files
```

For sensitive data (passwords, tokens, keys), use Secrets instead.

## Step 1: Navigate to ConfigMaps in Portainer

1. Select your Kubernetes environment in Portainer
2. In the sidebar, navigate to **ConfigMaps & Secrets**
3. Click on the **ConfigMaps** tab
4. Click **Add with form**

## Step 2: Fill in the ConfigMap Form

The ConfigMap creation form has the following fields:

```text
Name:              my-app-config
Namespace:         production        (selected in the form)

Data entries:
  Key: DATABASE_HOST    Value: postgres.production.svc.cluster.local
  Key: DATABASE_PORT    Value: 5432
  Key: APP_ENV          Value: production
  Key: LOG_LEVEL        Value: info
  Key: CACHE_TTL        Value: 3600
  Key: FEATURE_FLAGS    Value: new-ui=true,beta-api=false
```

Click **+ Add entry** to add more key-value pairs.

## Step 3: Add Multi-line Values

For configuration files stored in a ConfigMap, switch the Data section to **Advanced mode** and enter the values as YAML:

```yaml
nginx.conf: |
  server {
      listen 80;
      server_name _;
      location / {
          proxy_pass http://app:8080;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
      }
  }
```

```yaml
application.properties: |
  spring.datasource.url=jdbc:postgresql://postgres:5432/mydb
  spring.datasource.driver-class-name=org.postgresql.Driver
  server.port=8080
  logging.level.com.company=INFO
```

## Step 4: Create the ConfigMap

After filling in all key-value pairs:

1. Review the entries for accuracy
2. Click **Create ConfigMap**
3. Portainer confirms creation and redirects to the ConfigMap list

## Step 5: Verify the ConfigMap

After creation, verify via Portainer or kubectl:

```bash
# List ConfigMaps in the namespace

kubectl get configmaps -n production

# View ConfigMap contents
kubectl describe configmap my-app-config -n production

# Get specific values
kubectl get configmap my-app-config -n production \
  -o jsonpath='{.data.DATABASE_HOST}'

# View all data as JSON
kubectl get configmap my-app-config -n production -o json | jq '.data'
```

## Step 6: Use the ConfigMap in a Deployment

Reference the ConfigMap in your application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          # Method 1: All ConfigMap keys as environment variables
          envFrom:
            - configMapRef:
                name: my-app-config
          # Method 2: Specific keys as environment variables
          env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: my-app-config
                  key: DATABASE_HOST
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: my-app-config
                  key: LOG_LEVEL
```

## Step 7: Update a ConfigMap via Form

To modify an existing ConfigMap in Portainer:

1. Navigate to **ConfigMaps & Secrets** → **ConfigMaps**
2. Find the ConfigMap and click **Edit**
3. Modify key-value pairs
4. Click **Update ConfigMap**

Note: Updating a ConfigMap does not automatically restart pods. Pods using ConfigMaps for environment variables (`env` or `envFrom`) do not see updates automatically. Mounted ConfigMaps are updated eventually, except when mounted with `subPath`. To apply changes immediately:

```bash
# Restart the deployment to pick up new ConfigMap values
kubectl rollout restart deployment/my-app -n production

# Watch the rollout
kubectl rollout status deployment/my-app -n production
```

## Step 8: Delete a ConfigMap

Before deleting a ConfigMap, ensure no pods reference it:

```bash
# Check which pods use the ConfigMap
kubectl get pods -n production -o json | \
  jq -r '.items[] | select(
    any((.spec.initContainers // [])[]?; any((.envFrom // [])[]?; .configMapRef.name? == "my-app-config") or any((.env // [])[]?; .valueFrom.configMapKeyRef.name? == "my-app-config"))
    or any((.spec.containers // [])[]?; any((.envFrom // [])[]?; .configMapRef.name? == "my-app-config") or any((.env // [])[]?; .valueFrom.configMapKeyRef.name? == "my-app-config"))
    or any((.spec.volumes // [])[]?; .configMap.name? == "my-app-config" or any((.projected.sources // [])[]?; .configMap.name? == "my-app-config"))
  ) | .metadata.name'
```

In Portainer: select the ConfigMap, click **Remove**, and confirm.

## Conclusion

Portainer's form-based ConfigMap creation makes it easy to store application configuration without writing YAML. Use ConfigMaps for non-sensitive configuration data that varies across environments, such as database hostnames, feature flags, and configuration files. Always separate configuration from container images to enable a single image to run across development, staging, and production environments with environment-appropriate settings.
