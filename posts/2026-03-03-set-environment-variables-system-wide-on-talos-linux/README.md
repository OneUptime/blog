# How to Set Environment Variables System-Wide on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Environment Variables, Machine Configuration, Kubernetes, System Administration

Description: Learn how to set system-wide environment variables on Talos Linux through machine configuration for services and workloads.

---

On a traditional Linux system, setting environment variables is something you do without thinking. You edit `/etc/environment`, add a line to `/etc/profile.d/`, or modify a systemd service file. On Talos Linux, the filesystem is immutable, so you cannot edit these files directly. But you can still set environment variables for both system services and Kubernetes workloads - you just do it through the machine configuration and Kubernetes manifests.

This guide covers every approach to setting environment variables on Talos Linux, from system-level configuration to pod-level settings.

## Setting Environment Variables for Talos System Services

Talos manages its own services (kubelet, etcd, apid, etc.) through the machine configuration. You can pass environment variables to these services through the configuration file.

### Kubelet Environment Variables

The most common use case is setting environment variables for the kubelet:

```yaml
machine:
  kubelet:
    extraArgs:
      # These are command-line arguments, not environment variables
      # But many settings are configured this way
      node-labels: "environment=production,region=us-east"
    extraConfig:
      # kubelet configuration settings
      maxPods: 250
```

For actual environment variables, use the kubelet's environment field:

```yaml
machine:
  env:
    # Environment variables set here apply to the Talos machine context
    HTTPS_PROXY: "http://proxy.company.com:8080"
    HTTP_PROXY: "http://proxy.company.com:8080"
    NO_PROXY: "localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc,.cluster.local"
```

The `machine.env` section sets environment variables that affect Talos system services including the kubelet and container runtime.

### Proxy Configuration

One of the most common reasons to set system-wide environment variables is proxy configuration. Talos has a dedicated mechanism for this:

```yaml
machine:
  env:
    HTTP_PROXY: "http://proxy.company.com:8080"
    HTTPS_PROXY: "http://proxy.company.com:8080"
    NO_PROXY: "localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc,.cluster.local"
```

These variables affect how Talos itself communicates with external services, including pulling container images and accessing the Kubernetes API.

## Applying the Configuration

### For New Nodes

Include the environment variables in your initial machine configuration before applying it:

```bash
# Generate base configuration
talosctl gen config my-cluster https://192.168.1.10:6443

# Edit the generated yaml files to add environment variables
# Then apply to nodes
talosctl apply-config --nodes 192.168.1.10 --file controlplane.yaml --insecure
```

### For Existing Nodes

Patch the running configuration:

```bash
# Create a patch file
cat > env-patch.yaml << 'EOF'
machine:
  env:
    HTTPS_PROXY: "http://proxy.company.com:8080"
    HTTP_PROXY: "http://proxy.company.com:8080"
    NO_PROXY: "localhost,127.0.0.1,10.0.0.0/8"
EOF

# Apply the patch
talosctl patch machineconfig --nodes 192.168.1.10 --patch-file env-patch.yaml
```

Or use inline patching:

```bash
talosctl patch machineconfig --nodes 192.168.1.10 --patch '[
  {
    "op": "add",
    "path": "/machine/env",
    "value": {
      "HTTP_PROXY": "http://proxy.company.com:8080",
      "HTTPS_PROXY": "http://proxy.company.com:8080",
      "NO_PROXY": "localhost,127.0.0.1,10.0.0.0/8"
    }
  }
]'
```

### Verifying the Configuration

After applying, verify the environment variables are set:

```bash
# Check the machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A5 "env:"

# Check the actual environment of a running service
talosctl read --nodes 192.168.1.10 /proc/1/environ
```

## Setting Environment Variables for Kubernetes Pods

For application workloads, set environment variables through Kubernetes manifests:

### Direct Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myapp:latest
      env:
        - name: DATABASE_HOST
          value: "postgres.database.svc.cluster.local"
        - name: LOG_LEVEL
          value: "info"
        - name: APP_PORT
          value: "8080"
```

### Environment Variables from ConfigMaps

For configuration that might change or needs to be shared across multiple pods:

```yaml
# Create a ConfigMap with the environment variables
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  DATABASE_HOST: "postgres.database.svc.cluster.local"
  LOG_LEVEL: "info"
  APP_PORT: "8080"
  CACHE_TTL: "300"
---
# Reference the ConfigMap in a pod
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myapp:latest
      envFrom:
        - configMapRef:
            name: app-config
```

### Environment Variables from Secrets

For sensitive values like passwords and API keys:

```yaml
# Create a Secret
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: "supersecret"
  API_KEY: "abc123def456"
---
# Reference individual secret keys
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myapp:latest
      env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: API_KEY
```

### Environment Variables from Pod Fields

You can inject pod metadata as environment variables:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myapp:latest
      env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
```

## Environment Variables for DaemonSets

If you need certain environment variables available on every node (like for monitoring agents), use a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
        - name: agent
          image: monitoring/agent:latest
          env:
            - name: CLUSTER_NAME
              value: "production-us-east"
            - name: ENVIRONMENT
              value: "production"
          envFrom:
            - configMapRef:
                name: monitoring-config
      tolerations:
        - operator: Exists
```

## Container Runtime Environment Variables

To set environment variables that affect the containerd runtime itself:

```yaml
machine:
  env:
    # These affect containerd behavior
    CONTAINERD_SNAPSHOTTER: "overlayfs"
```

## Environment Variables for etcd

For etcd-specific tuning on control plane nodes:

```yaml
cluster:
  etcd:
    extraArgs:
      # etcd tuning parameters
      quota-backend-bytes: "8589934592"
      auto-compaction-retention: "1"
```

While these are technically command-line arguments rather than environment variables, they achieve the same purpose of configuring etcd behavior.

## Managing Configuration Across Environments

For organizations with multiple clusters (development, staging, production), use a templating approach:

```bash
# Base configuration with environment-specific variables
# development.yaml
machine:
  env:
    HTTP_PROXY: "http://dev-proxy.company.com:8080"
    ENVIRONMENT: "development"

# production.yaml
machine:
  env:
    HTTP_PROXY: "http://prod-proxy.company.com:8080"
    ENVIRONMENT: "production"
```

Apply the appropriate configuration for each environment:

```bash
# Apply development configuration
talosctl apply-config --nodes 192.168.1.10 --file dev-config.yaml

# Apply production configuration
talosctl apply-config --nodes 10.0.1.10 --file prod-config.yaml
```

## Troubleshooting

### Environment Variables Not Taking Effect

If environment variables do not seem to be working:

```bash
# Verify the configuration was applied
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A10 "env:"

# Check service status (a restart may be needed)
talosctl services --nodes 192.168.1.10

# For Kubernetes pods, check the pod spec
kubectl get pod <pod-name> -o yaml | grep -A20 "env:"
```

### Proxy Variables Not Working

If proxy environment variables are set but not working:

```bash
# Verify the no-proxy list includes your internal services
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep NO_PROXY

# Make sure the Kubernetes service CIDR and pod CIDR are in NO_PROXY
# Otherwise, internal cluster communication will go through the proxy
```

## Conclusion

Setting environment variables on Talos Linux requires different approaches depending on the level you are working at. For system services, use the `machine.env` section in the machine configuration. For Kubernetes workloads, use pod environment variables, ConfigMaps, and Secrets. For proxy configuration, Talos provides dedicated support through system-wide environment variables. While the approach is different from editing `/etc/environment`, it results in more reproducible and version-controlled configurations.
