# How to Mount ConfigMaps as Volumes with subPath for Single File Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ConfigMaps, Volumes

Description: Learn how to use subPath to mount individual ConfigMap files without overwriting existing directories, enabling targeted configuration updates in Kubernetes pods.

---

When you mount a ConfigMap as a volume, Kubernetes replaces the entire mount point directory with the ConfigMap contents. This creates a problem when you want to add a single configuration file to a directory that already contains other files. The existing files disappear, breaking your application.

The subPath feature solves this by mounting individual files from a ConfigMap without affecting other files in the directory. You can inject configuration files alongside existing application files, update specific settings files, or override individual defaults while preserving everything else.

In this guide, you'll learn how to use subPath effectively, understand its limitations, and implement patterns for targeted configuration management.

## The Problem with Default Volume Mounts

When you mount a ConfigMap as a volume, it replaces the entire directory:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
      listen 80;
      location / {
        root /usr/share/nginx/html;
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        volumeMounts:
        - name: config
          mountPath: /etc/nginx  # This REPLACES everything in /etc/nginx
      volumes:
      - name: config
        configMap:
          name: nginx-config
```

The problem: `/etc/nginx` now only contains `nginx.conf`. All default nginx configuration files like `mime.types`, `fastcgi_params`, etc., are gone.

## Using subPath to Mount Individual Files

The subPath field mounts a single file without affecting the rest of the directory:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/nginx.conf  # Mount to specific file
          subPath: nginx.conf               # Use this file from ConfigMap
      volumes:
      - name: config
        configMap:
          name: nginx-config
```

Now `/etc/nginx/nginx.conf` contains your custom configuration, while all other files in `/etc/nginx` remain untouched.

## Mounting Multiple Files with subPath

Mount several individual files from one ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.conf: |
    debug=true
    log_level=info
  database.conf: |
    host=postgres.example.com
    port=5432
    pool_size=20
  cache.conf: |
    redis_host=redis.example.com
    ttl=3600
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        # Mount each file individually
        - name: config
          mountPath: /etc/app/app.conf
          subPath: app.conf
        - name: config
          mountPath: /etc/app/database.conf
          subPath: database.conf
        - name: config
          mountPath: /etc/app/cache.conf
          subPath: cache.conf
      volumes:
      - name: config
        configMap:
          name: app-config
```

The `/etc/app` directory now contains your three config files plus any files that were already there.

## Overriding Default Configuration Files

Replace specific default files in an application:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    maxmemory 256mb
    maxmemory-policy allkeys-lru
    appendonly yes
    save 900 1
    save 300 10
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  template:
    spec:
      containers:
      - name: redis
        image: redis:7
        command: ["redis-server", "/etc/redis/redis.conf"]
        volumeMounts:
        - name: config
          mountPath: /etc/redis/redis.conf
          subPath: redis.conf
      volumes:
      - name: config
        configMap:
          name: redis-config
```

This overrides the default `/etc/redis/redis.conf` without affecting other files in the Redis image.

## Injecting Files into Application Directories

Add configuration files alongside application code:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-settings
data:
  settings.json: |
    {
      "api_endpoint": "https://api.example.com",
      "timeout": 30,
      "retry_count": 3
    }
  logging.json: |
    {
      "level": "info",
      "format": "json",
      "output": "/var/log/app.log"
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: web-app:latest
        workingDir: /app
        volumeMounts:
        # Inject config files into /app directory alongside code
        - name: settings
          mountPath: /app/config/settings.json
          subPath: settings.json
        - name: settings
          mountPath: /app/config/logging.json
          subPath: logging.json
      volumes:
      - name: settings
        configMap:
          name: app-settings
```

The `/app` directory contains your application code plus the injected config files in `/app/config/`.

## Using subPath with Secrets

The same technique works with Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-cert
type: kubernetes.io/tls
data:
  tls.crt: <base64-cert>
  tls.key: <base64-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        volumeMounts:
        - name: tls
          mountPath: /etc/nginx/ssl/server.crt
          subPath: tls.crt
        - name: tls
          mountPath: /etc/nginx/ssl/server.key
          subPath: tls.key
      volumes:
      - name: tls
        secret:
          secretName: tls-cert
          defaultMode: 0400
```

## Real-World Example: PostgreSQL Custom Configuration

Override specific PostgreSQL config while keeping defaults:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-custom-config
data:
  custom.conf: |
    # Connection settings
    max_connections = 200
    shared_buffers = 256MB

    # Query performance
    work_mem = 4MB
    maintenance_work_mem = 64MB

    # Write performance
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB

    # Logging
    log_destination = 'stderr'
    logging_collector = on
    log_directory = '/var/log/postgresql'
    log_filename = 'postgresql-%Y-%m-%d.log'
    log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        # Mount custom config as additional file
        - name: custom-config
          mountPath: /etc/postgresql/conf.d/custom.conf
          subPath: custom.conf
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: custom-config
        configMap:
          name: postgres-custom-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

PostgreSQL reads configuration from `/etc/postgresql/conf.d/` in addition to the main config file.

## The subPath Update Limitation

WARNING: When using subPath, ConfigMap or Secret updates do NOT automatically propagate to mounted files. The file remains at its original value until the pod restarts.

```yaml
# This ConfigMap update won't be reflected in pods using subPath
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.conf: |
    log_level=debug  # Changed from info to debug
```

Pods with subPath mounts continue using the old value. You must restart pods to pick up changes.

Solutions:

1. **Use Reloader to trigger pod restarts**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  annotations:
    configmap.reloader.stakater.com/reload: "app-config"
spec:
  # ...
```

2. **Use immutable ConfigMaps with versioned names**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v2  # New version
immutable: true
data:
  app.conf: |
    log_level=debug
```

3. **Don't use subPath** if you need automatic updates (use full directory mounts with symlinks instead).

## Alternative: Using Symlinks Without subPath

Kubernetes uses symlinks for volume mounts by default, enabling automatic updates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.conf: |
    log_level=info
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      initContainers:
      - name: copy-defaults
        image: myapp:latest
        command:
        - sh
        - -c
        - |
          # Copy default config to emptyDir
          cp -r /etc/app-defaults/* /etc/app/
        volumeMounts:
        - name: config-dir
          mountPath: /etc/app
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        # Mount ConfigMap to separate directory
        - name: config-override
          mountPath: /etc/app-configmap
        # Mount emptyDir for combined config
        - name: config-dir
          mountPath: /etc/app
      volumes:
      - name: config-override
        configMap:
          name: app-config
      - name: config-dir
        emptyDir: {}
```

Then in the app startup script:

```bash
#!/bin/sh
# Create symlink to ConfigMap file
ln -sf /etc/app-configmap/app.conf /etc/app/app.conf

# Start application
exec /app/start
```

This enables automatic updates because the symlink points to the ConfigMap, which Kubernetes updates automatically.

## Best Practices

1. **Use subPath for static overrides**: When you need to override specific files that don't change frequently.

2. **Avoid subPath for dynamic config**: If configuration changes often, use full directory mounts or other mechanisms.

3. **Document which files use subPath**: Add comments explaining why subPath is necessary.

4. **Use Reloader with subPath**: Always pair subPath mounts with Reloader to ensure pods restart on ConfigMap changes.

5. **Prefer immutable ConfigMaps**: Version ConfigMap names and update deployment references instead of modifying in place.

6. **Test file permissions**: Ensure the mounted file has correct permissions for your application.

7. **Consider init containers**: Use init containers to merge ConfigMap files with defaults when you need more flexibility.

8. **Watch for directory permissions**: When mounting files with subPath, directory permissions come from the container image, not the ConfigMap.

The subPath feature enables surgical configuration injection, letting you add or override specific files without disturbing existing directory contents. While it has limitations around automatic updates, it's the right tool when you need to target individual files in complex application deployments.
