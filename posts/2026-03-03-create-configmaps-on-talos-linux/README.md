# How to Create ConfigMaps on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, ConfigMap, Configuration Management, Cloud Native

Description: A practical guide to creating and managing ConfigMaps on Talos Linux for storing non-confidential configuration data in your Kubernetes clusters.

---

ConfigMaps are one of the most fundamental building blocks in Kubernetes. They let you decouple configuration data from your container images, which means you can update configuration without rebuilding your entire application. On Talos Linux, ConfigMaps work the same way they do on any Kubernetes distribution, but the immutable and API-driven nature of Talos makes them even more important since you cannot just SSH into a node and drop a config file somewhere.

In this guide, we will walk through everything you need to know about creating ConfigMaps on a Talos Linux cluster.

## What Is a ConfigMap?

A ConfigMap is a Kubernetes API object that stores non-confidential data as key-value pairs. Pods can consume ConfigMaps as environment variables, command-line arguments, or as configuration files mounted in a volume. The data stored in a ConfigMap cannot exceed 1 MiB, so keep that in mind when planning your configuration strategy.

Unlike Secrets, ConfigMaps are not designed for sensitive data. They are stored in plain text within etcd, and anyone with the right RBAC permissions can read them.

## Prerequisites

Before you start, make sure you have the following:

- A running Talos Linux cluster (single node or multi-node)
- `kubectl` configured to talk to your cluster
- `talosctl` installed and configured (for cluster management tasks)

You can verify connectivity by running:

```bash
# Check that kubectl can reach your Talos cluster
kubectl cluster-info

# Verify nodes are ready
kubectl get nodes
```

## Creating a ConfigMap from Literal Values

The simplest way to create a ConfigMap is using literal key-value pairs directly from the command line.

```bash
# Create a ConfigMap with two key-value pairs
kubectl create configmap app-config \
  --from-literal=DATABASE_HOST=postgres.default.svc.cluster.local \
  --from-literal=DATABASE_PORT=5432 \
  --from-literal=LOG_LEVEL=info
```

You can verify the ConfigMap was created:

```bash
# View the ConfigMap details
kubectl get configmap app-config -o yaml
```

The output will look something like this:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  DATABASE_HOST: postgres.default.svc.cluster.local
  DATABASE_PORT: "5432"
  LOG_LEVEL: info
```

## Creating a ConfigMap from a File

Often your configuration lives in files. You can create a ConfigMap directly from one or more files.

First, create a configuration file:

```bash
# Create a sample nginx configuration file
cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
    }

    location /health {
        return 200 'healthy';
        add_header Content-Type text/plain;
    }
}
EOF
```

Now create a ConfigMap from that file:

```bash
# Create ConfigMap from the file
kubectl create configmap nginx-config --from-file=nginx.conf

# You can also specify a custom key name
kubectl create configmap nginx-config-custom --from-file=my-nginx.conf=nginx.conf
```

## Creating a ConfigMap from a Directory

If you have multiple configuration files in a directory, you can load them all at once:

```bash
# Create a directory with config files
mkdir -p config-dir
echo "key1=value1" > config-dir/app.properties
echo "feature_flag=true" > config-dir/features.properties

# Create ConfigMap from the entire directory
kubectl create configmap dir-config --from-file=config-dir/
```

Each file in the directory becomes a key in the ConfigMap, with the filename as the key and the file contents as the value.

## Creating a ConfigMap with YAML Manifest

For production workloads, you should define ConfigMaps declaratively using YAML manifests. This approach is version-controllable and reproducible.

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webapp-config
  namespace: default
  labels:
    app: webapp
    environment: production
data:
  # Simple key-value pairs
  APP_NAME: "my-webapp"
  APP_ENV: "production"
  MAX_CONNECTIONS: "100"

  # Multi-line configuration file
  app.properties: |
    server.port=8080
    server.host=0.0.0.0
    cache.ttl=3600
    cache.max-size=1000

  # JSON configuration
  config.json: |
    {
      "database": {
        "host": "postgres.default.svc.cluster.local",
        "port": 5432,
        "name": "myapp"
      },
      "redis": {
        "host": "redis.default.svc.cluster.local",
        "port": 6379
      }
    }
```

Apply it to your Talos cluster:

```bash
# Apply the ConfigMap manifest
kubectl apply -f configmap.yaml

# Verify it was created
kubectl describe configmap webapp-config
```

## Using ConfigMaps in Pods

Once your ConfigMap exists, you can reference it from your Pod spec. Here is a quick example using environment variables:

```yaml
# pod-with-configmap.yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  containers:
  - name: webapp
    image: nginx:1.25
    envFrom:
    - configMapRef:
        name: webapp-config
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: webapp-config
      items:
      - key: config.json
        path: config.json
```

## Updating ConfigMaps

One of the nice things about ConfigMaps is that you can update them without restarting your pods (though some applications need a restart to pick up changes).

```bash
# Edit a ConfigMap directly
kubectl edit configmap app-config

# Or replace it with an updated file
kubectl apply -f updated-configmap.yaml

# You can also patch specific values
kubectl patch configmap app-config --type merge -p '{"data":{"LOG_LEVEL":"debug"}}'
```

When a ConfigMap is mounted as a volume, Kubernetes will eventually update the files inside the pod. The update delay depends on the kubelet sync period and cache propagation delay, which is typically around 60 seconds on Talos Linux with default settings.

## ConfigMap Best Practices on Talos Linux

Since Talos Linux is an immutable operating system, you cannot store configuration files on the host filesystem like you might on a traditional Linux distribution. This makes ConfigMaps even more central to your workflow. Here are some best practices:

1. **Use namespaces to organize ConfigMaps.** Group related ConfigMaps in the same namespace as the workloads that consume them.

2. **Keep ConfigMaps small.** The 1 MiB limit is a hard ceiling, but even before you hit that, large ConfigMaps can slow down the API server.

3. **Version your ConfigMaps.** Instead of updating a ConfigMap in place, consider creating new versions (like `app-config-v2`) and updating your Deployment to reference the new version. This makes rollbacks straightforward.

4. **Use labels and annotations.** Tag your ConfigMaps with metadata so you can find and manage them easily.

5. **Prefer declarative management.** Store your ConfigMap YAML files in Git and apply them through a CI/CD pipeline. This is especially important on Talos Linux where the entire system philosophy revolves around declarative configuration.

```bash
# List all ConfigMaps with a specific label
kubectl get configmaps -l app=webapp

# Delete a ConfigMap you no longer need
kubectl delete configmap old-config
```

## Troubleshooting Common Issues

If your pod cannot find a ConfigMap, check these things:

```bash
# Make sure the ConfigMap exists in the right namespace
kubectl get configmap app-config -n your-namespace

# Check if the pod events show any mounting errors
kubectl describe pod your-pod-name

# Verify the ConfigMap data looks correct
kubectl get configmap app-config -o jsonpath='{.data}'
```

A common mistake is creating the ConfigMap in the `default` namespace while the pod runs in a different namespace. ConfigMaps are namespace-scoped, so they must exist in the same namespace as the pod that references them.

## Wrapping Up

ConfigMaps are a simple but powerful way to manage configuration on Talos Linux. Because Talos does not allow direct filesystem access on nodes, ConfigMaps (along with Secrets) become the primary mechanism for injecting configuration into your workloads. Start with simple literal values for basic settings, move to file-based ConfigMaps for more involved configurations, and always keep your manifests in version control for a clean, reproducible setup.
