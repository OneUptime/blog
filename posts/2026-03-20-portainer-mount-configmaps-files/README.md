# How to Mount ConfigMaps as Files in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, Volumes, Configuration, DevOps

Description: Learn how to mount Kubernetes ConfigMaps as files inside containers using Portainer, enabling configuration file injection for applications that read from disk.

## Introduction

Many applications read configuration from files rather than environment variables - Nginx reads `nginx.conf`, databases read `postgresql.conf`, and Java apps read `application.yaml`. ConfigMaps can be mounted as volumes, creating files inside containers at a specified path. This allows you to manage configuration files in Kubernetes without rebuilding images. Portainer supports configuring volume mounts through both its form UI and YAML editor.

## Prerequisites

- Portainer with Kubernetes environment
- A ConfigMap containing configuration file content
- A deployment to configure

## Step 1: Create a ConfigMap with File Contents

First, create a ConfigMap that stores configuration file content:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: production
data:
  default.conf: |
    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://app-backend:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /health {
            return 200 'healthy';
            add_header Content-Type text/plain;
        }
    }
```

## Step 2: Mount ConfigMap as Volume in Portainer Form

When creating or editing a Portainer application:

1. Find the **ConfigMaps** section
2. Select `nginx-config`
3. Click **Override** for the `default.conf` key and set a filesystem mount path such as `/etc/nginx/conf.d/default.conf`
4. Save or deploy the application

With the override in place, Portainer mounts the key as a file:
- `default.conf` → `/etc/nginx/conf.d/default.conf`

## Step 3: Mount ConfigMap via YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.24-alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-config-volume
              mountPath: /etc/nginx/conf.d
              readOnly: true
      volumes:
        - name: nginx-config-volume
          configMap:
            name: nginx-config
```

## Step 4: Mount Specific Keys as Named Files

By default, all ConfigMap keys become files. To mount only specific keys or rename them:

```yaml
volumes:
  - name: app-config-volume
    configMap:
      name: app-config
      items:
        - key: application.yaml     # ConfigMap key
          path: config.yaml         # File name in container (can differ)
        - key: log4j2.xml
          path: log4j2.xml
        # Other keys in the ConfigMap are NOT mounted
```

```yaml
volumeMounts:
  - name: app-config-volume
    mountPath: /app/config
    readOnly: true
```

Result: `/app/config/config.yaml` and `/app/config/log4j2.xml`

## Step 5: Mount Single File Without Overwriting Directory

To mount a single ConfigMap key as a file without replacing the entire directory:

```yaml
volumeMounts:
  - name: custom-nginx-config
    mountPath: /etc/nginx/conf.d/custom.conf   # Single file path
    subPath: custom.conf                        # ConfigMap key to use

volumes:
  - name: custom-nginx-config
    configMap:
      name: nginx-extra-config
```

Using `subPath` lets you inject a single file into a directory without overwriting other files. This is essential when you want to add a config file to a directory that already has content. Note: a container using a ConfigMap as a `subPath` volume mount does not receive live ConfigMap updates; restart the pod or roll out the workload after changing the ConfigMap.

## Step 6: Set File Permissions

Configure file permissions with `defaultMode`:

```yaml
volumes:
  - name: script-volume
    configMap:
      name: init-scripts
      defaultMode: 0755    # rwxr-xr-x - executable scripts
```

```yaml
volumes:
  - name: config-volume
    configMap:
      name: app-config
      defaultMode: 0644    # rw-r--r-- - readable config files (default)
```

## Step 7: Verify File Mounts

Check that files are mounted correctly in running pods:

```bash
# Open a shell in the pod

kubectl exec -it <pod-name> -n production -- /bin/sh

# List mounted config files
ls -la /etc/nginx/conf.d/

# View a config file
cat /etc/nginx/conf.d/default.conf

# Exit
exit
```

Or non-interactively:

```bash
# List files in the mount directory
kubectl exec <pod-name> -n production -- \
  ls -la /etc/nginx/conf.d/

# Check file contents
kubectl exec <pod-name> -n production -- \
  cat /etc/nginx/conf.d/default.conf
```

## Step 8: Dynamic Updates - ConfigMap Volume Auto-Sync

Unlike environment variables, standard ConfigMap volume mounts (not `subPath` mounts) eventually reflect ConfigMap changes. The delay can be as long as the kubelet sync period (1 minute by default) plus the ConfigMap cache TTL (1 minute by default):

```bash
# Update ConfigMap
kubectl edit configmap nginx-config -n production
# or
kubectl apply -f updated-nginx-config.yaml

# Wait up to ~2 minutes, then verify the file updated
kubectl exec <pod-name> -n production -- \
  cat /etc/nginx/conf.d/default.conf

# Note: the application must also reload its config
# For nginx, send a reload signal:
kubectl exec <pod-name> -n production -- \
  nginx -s reload

# Or restart the deployment
# Required if you mounted the file with subPath in Step 5
kubectl rollout restart deployment/nginx -n production
```

## Common Use Cases

Typical applications that benefit from ConfigMap file mounts:

```text
nginx/apache       - Virtual host configuration
PostgreSQL         - postgresql.conf, pg_hba.conf
Prometheus         - prometheus.yml, alert rules
Grafana            - datasource.yaml, dashboard provisioning
Fluentd            - fluent.conf
Java (Spring Boot) - application.yaml, logback.xml
Python             - gunicorn.conf.py, logging.conf
Redis              - redis.conf
```

## Conclusion

Mounting ConfigMaps as files provides a clean way to inject configuration files into containers without embedding them in images. Use `subPath` to inject individual files without overwriting directories, set `defaultMode` for script permissions, and rely on auto-sync for full ConfigMap volume mounts when applications can reload configuration at runtime. For `subPath` mounts, restart the pod or workload to pick up ConfigMap changes. This pattern is particularly valuable for applications like Nginx, Prometheus, and Fluentd that have rich file-based configuration systems.
