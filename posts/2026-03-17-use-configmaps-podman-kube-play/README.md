# How to Use ConfigMaps with podman kube play

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, ConfigMap, YAML

Description: Learn how to define and use Kubernetes ConfigMaps with podman kube play to inject configuration data into containers.

---

> ConfigMaps let you decouple configuration from container images, and podman kube play supports them natively.

When deploying applications with `podman kube play`, you often need to pass configuration data such as environment variables, command-line arguments, or configuration files. Kubernetes ConfigMaps provide a standard way to manage this non-sensitive configuration, and Podman supports them directly in your YAML manifests.

---

## Creating a ConfigMap in YAML

Define a ConfigMap alongside your Pod specification in a single YAML file.

```yaml
# app-config.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "db.example.com"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
  app.conf: |
    server.port=8080
    server.host=0.0.0.0
    cache.ttl=300
```

## Using ConfigMap as Environment Variables

Reference the ConfigMap in your Pod spec to inject values as environment variables.

```yaml
# pod-with-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "db.example.com"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: app
      image: docker.io/library/python:3.12-slim
      envFrom:
        # Load all keys from the ConfigMap as environment variables
        - configMapRef:
            name: app-config
      command: ["sleep", "infinity"]
```

## Deploying with podman kube play

```bash
# Deploy the Pod with ConfigMap
podman kube play pod-with-configmap.yaml

# Verify the environment variables are set
podman exec myapp-app env | grep DATABASE
# Output:
# DATABASE_HOST=db.example.com
# DATABASE_PORT=5432
```

## Using ConfigMap as a Volume Mount

```yaml
# pod-with-config-file.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
        listen 80;
        server_name localhost;
        location / {
            root /usr/share/nginx/html;
        }
    }
---
apiVersion: v1
kind: Pod
metadata:
  name: webserver
spec:
  containers:
    - name: nginx
      image: docker.io/library/nginx:alpine
      volumeMounts:
        - name: config-volume
          mountPath: /etc/nginx/conf.d
  volumes:
    - name: config-volume
      configMap:
        name: nginx-config
```

```bash
# Deploy the webserver with mounted config
podman kube play pod-with-config-file.yaml

# Verify the config file is mounted
podman exec webserver-nginx cat /etc/nginx/conf.d/nginx.conf
```

## Tearing Down

```bash
# Remove all resources created by the YAML
podman kube play --down pod-with-config-file.yaml
```

## Summary

Podman kube play supports Kubernetes ConfigMaps for injecting environment variables and mounting configuration files into containers. Define the ConfigMap and Pod in the same YAML file, and Podman handles the wiring automatically.
