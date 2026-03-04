# How to Mount ConfigMaps as Volumes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, ConfigMap, Volumes, Container Configuration

Description: Learn how to mount Kubernetes ConfigMaps as volumes in your pods on Talos Linux to provide configuration files to your applications.

---

When you run applications on Talos Linux, you often need to provide configuration files to your containers. Since Talos is an immutable operating system with no SSH access and no writable host filesystem for user data, you cannot just place files on the node and mount them. Instead, you use Kubernetes-native approaches, and mounting ConfigMaps as volumes is one of the most practical methods available.

This guide covers the different ways to mount ConfigMaps as volumes in pods running on Talos Linux, including partial mounts, permission settings, and live update behavior.

## Why Mount ConfigMaps as Volumes?

While you can expose ConfigMap data as environment variables, there are several situations where volume mounts are the better choice:

- Your application reads configuration from files on disk (like nginx.conf or application.yaml)
- The configuration data is multi-line or structured (JSON, YAML, TOML, INI files)
- You want configuration changes to propagate to running pods without a restart
- The configuration is too large or complex to fit comfortably in environment variables

## Basic Volume Mount

Let us start with a simple example. First, create a ConfigMap that holds a configuration file:

```yaml
# app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  application.yaml: |
    server:
      port: 8080
      host: 0.0.0.0
    database:
      url: jdbc:postgresql://postgres:5432/mydb
      pool-size: 10
    logging:
      level: INFO
      format: json
```

Apply the ConfigMap:

```bash
# Create the ConfigMap in your Talos cluster
kubectl apply -f app-config.yaml
```

Now create a pod that mounts this ConfigMap as a volume:

```yaml
# pod-with-volume.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /etc/myapp
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

```bash
# Deploy the pod
kubectl apply -f pod-with-volume.yaml

# Verify the file is mounted correctly
kubectl exec myapp -- ls -la /etc/myapp/
kubectl exec myapp -- cat /etc/myapp/application.yaml
```

Inside the container, you will find the file `/etc/myapp/application.yaml` with the contents from your ConfigMap. Each key in the ConfigMap's `data` field becomes a file in the mounted directory.

## Mounting Specific Keys

Sometimes your ConfigMap contains multiple keys, but you only want to mount specific ones. Use the `items` field to select which keys to include and what filenames they should have:

```yaml
# selective-mount.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: multi-config
data:
  nginx.conf: |
    server {
        listen 80;
        server_name localhost;
        location / {
            root /usr/share/nginx/html;
        }
    }
  mime.types: |
    text/html html htm;
    text/css css;
    application/javascript js;
  extra-settings.conf: |
    client_max_body_size 10m;
    keepalive_timeout 65;
---
apiVersion: v1
kind: Pod
metadata:
  name: nginx-selective
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/conf.d
  volumes:
  - name: nginx-config
    configMap:
      name: multi-config
      items:
      # Only mount nginx.conf, rename it to default.conf
      - key: nginx.conf
        path: default.conf
      # Also mount extra settings
      - key: extra-settings.conf
        path: extra.conf
```

In this case, only `default.conf` and `extra.conf` will appear in `/etc/nginx/conf.d/`. The `mime.types` key is excluded from the mount.

## Mounting to a Specific File Path with SubPath

By default, mounting a ConfigMap volume to a directory replaces everything in that directory. This can be problematic if the directory already contains files your application needs. The `subPath` field solves this by mounting a single file without overwriting the rest of the directory:

```yaml
# subpath-mount.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-subpath
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    # Mount only the config file, preserving other files in /etc/myapp
    - name: config-volume
      mountPath: /etc/myapp/application.yaml
      subPath: application.yaml
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

There is an important caveat with `subPath`: files mounted this way do not receive automatic updates when the ConfigMap changes. If you need live updates, use a full directory mount instead.

## Setting File Permissions

You can control the file permissions of mounted ConfigMap files using the `defaultMode` field. This is useful when your application expects specific permissions:

```yaml
# permissions-mount.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-permissions
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /etc/myapp
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      # Set permissions to 0644 (owner read/write, group/others read)
      defaultMode: 0644
```

You can also set permissions on individual items:

```yaml
volumes:
- name: config-volume
  configMap:
    name: multi-config
    items:
    - key: nginx.conf
      path: nginx.conf
      mode: 0644
    - key: extra-settings.conf
      path: extra.conf
      mode: 0600
```

## Using ConfigMap Volumes in Deployments

In production on Talos Linux, you will typically use Deployments rather than bare Pods. Here is a complete example:

```yaml
# deployment-with-configmap.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: nginx:1.25
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d/default.conf
          subPath: default.conf
        - name: app-settings
          mountPath: /etc/app
          readOnly: true
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
      - name: app-settings
        configMap:
          name: app-settings
```

## Live Update Behavior

One of the useful properties of ConfigMap volume mounts (when not using subPath) is that Kubernetes will automatically update the mounted files when the ConfigMap changes. On Talos Linux, the update process works like this:

1. You update the ConfigMap (via `kubectl apply` or `kubectl edit`)
2. The kubelet detects the change during its sync cycle
3. The mounted files get updated atomically using symlinks
4. Your application can watch for file changes and reload

The propagation delay is typically up to 60 seconds, depending on the kubelet's `--sync-frequency` and the ConfigMap cache TTL. You can verify updates with:

```bash
# Update the ConfigMap
kubectl patch configmap app-config --type merge \
  -p '{"data":{"application.yaml":"server:\n  port: 9090\n"}}'

# Watch the file inside the pod (give it a minute)
kubectl exec myapp -- cat /etc/myapp/application.yaml
```

## Monitoring Mounted Volumes

On Talos Linux, you can check that your ConfigMap volumes are properly mounted using standard Kubernetes commands:

```bash
# Check volume mount status in pod description
kubectl describe pod myapp | grep -A 10 "Mounts:"

# Verify file contents inside the container
kubectl exec myapp -- find /etc/myapp -type f -exec echo "---{}---" \; -exec cat {} \;

# Check events for any mount failures
kubectl get events --field-selector involvedObject.name=myapp
```

## Common Pitfalls

A few things to watch out for when mounting ConfigMaps as volumes on Talos Linux:

**Directory replacement.** Unless you use subPath, mounting a ConfigMap to a directory replaces all existing contents. This can break applications that expect default files to be present.

**Binary data.** ConfigMaps are designed for text data. If you need to mount binary files, use the `binaryData` field instead of `data`, and base64-encode the content.

**Size limits.** Remember that ConfigMaps cannot exceed 1 MiB. For larger configuration needs, consider splitting your configuration across multiple ConfigMaps or using a different approach entirely.

**Symlink awareness.** Kubernetes uses symlinks internally to manage ConfigMap volume mounts. Some applications may not follow symlinks correctly, which can cause unexpected behavior.

## Wrapping Up

Mounting ConfigMaps as volumes is a natural fit for Talos Linux, where the immutable filesystem means you need Kubernetes-native solutions for configuration management. Whether you need simple file mounts, selective key mounting, or live configuration updates, ConfigMap volumes give you the flexibility to handle it all. Start with basic mounts, add permission controls as needed, and use subPath only when you must preserve existing directory contents.
