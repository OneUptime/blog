# How to Deploy Wasm Plugins to Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASM, Deployment, Envoy, Kubernetes

Description: A practical guide covering different methods of deploying WebAssembly plugins to Istio proxies including OCI registries, HTTP, and local files.

---

Once you have built a Wasm plugin, the next challenge is getting it deployed to your Istio proxies in a reliable and repeatable way. Istio supports several deployment methods for Wasm plugins, each with different tradeoffs around ease of use, security, and production readiness. This post covers all the deployment options and when to use each one.

## Deployment Methods Overview

Istio supports three ways to load Wasm plugins into Envoy:

1. **OCI Registry** - Store the Wasm binary as an OCI artifact in a container registry
2. **HTTP/HTTPS URL** - Serve the Wasm binary from an HTTP server
3. **Local file** - Mount the Wasm binary directly into the proxy container

For production, OCI registries are the recommended approach. HTTP URLs work well for development, and local files are mainly useful for testing.

## Method 1: OCI Registry Deployment

This is the production-grade approach. You package your Wasm binary as an OCI artifact and push it to a container registry that supports OCI artifacts (Docker Hub, GitHub Container Registry, Google Artifact Registry, AWS ECR, etc.).

**Pushing the artifact:**

```bash
# Install ORAS CLI for OCI artifact management
brew install oras  # macOS
# or download from https://oras.land

# Push the Wasm binary to a registry
oras push registry.example.com/my-plugins/auth-filter:v1.0 \
  --artifact-type application/vnd.module.wasm.content.layer.v1+wasm \
  auth-filter.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

**Creating the WasmPlugin resource:**

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-filter
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/my-plugins/auth-filter:v1.0
```

When using a private registry, you need to configure image pull secrets:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-filter
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://private-registry.example.com/my-plugins/auth-filter:v1.0
  imagePullPolicy: IfNotPresent
  imagePullSecret: registry-credentials
```

Create the secret:

```bash
kubectl create secret docker-registry registry-credentials \
  -n my-app \
  --docker-server=private-registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword
```

## Method 2: HTTP URL Deployment

Serve the Wasm binary from any HTTP/HTTPS endpoint:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-filter
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: https://storage.googleapis.com/my-bucket/plugins/auth-filter.wasm
```

You can also serve plugins from within the cluster using a simple nginx deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wasm-server
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: wasm-server
  template:
    metadata:
      labels:
        app: wasm-server
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: wasm-plugins
          mountPath: /usr/share/nginx/html
      volumes:
      - name: wasm-plugins
        configMap:
          name: wasm-plugins
---
apiVersion: v1
kind: Service
metadata:
  name: wasm-server
  namespace: istio-system
spec:
  selector:
    app: wasm-server
  ports:
  - port: 80
```

Then reference it in your WasmPlugin:

```yaml
url: http://wasm-server.istio-system.svc.cluster.local/auth-filter.wasm
```

## Method 3: Local File Deployment

For testing, you can mount the Wasm binary directly into the proxy container using a volume:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-filter
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: file:///var/lib/wasm/auth-filter.wasm
```

To get the file into the proxy container, use an init container or volume mount in your pod spec:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    metadata:
      labels:
        app: api-gateway
      annotations:
        sidecar.istio.io/userVolume: '[{"name":"wasm-plugins","emptyDir":{}}]'
        sidecar.istio.io/userVolumeMount: '[{"name":"wasm-plugins","mountPath":"/var/lib/wasm"}]'
    spec:
      initContainers:
      - name: wasm-loader
        image: curlimages/curl
        command: ["curl", "-o", "/wasm/auth-filter.wasm", "https://storage.example.com/auth-filter.wasm"]
        volumeMounts:
        - name: wasm-plugins
          mountPath: /wasm
      containers:
      - name: app
        image: my-app:latest
        volumeMounts:
        - name: wasm-plugins
          mountPath: /var/lib/wasm
      volumes:
      - name: wasm-plugins
        emptyDir: {}
```

## Image Pull Policy

The `imagePullPolicy` field controls when Istio fetches the Wasm binary:

```yaml
spec:
  imagePullPolicy: IfNotPresent  # Only pull if not cached (default)
  # or
  imagePullPolicy: Always        # Always pull, even if cached
```

For development, use `Always` so changes are picked up immediately. For production, use `IfNotPresent` with versioned tags to avoid unnecessary pulls.

## Verifying Plugin Deployment

After applying the WasmPlugin resource, verify it was deployed correctly:

```bash
# Check the WasmPlugin resource status
kubectl get wasmplugin -n my-app auth-filter -o yaml

# Check if the proxy loaded the plugin
kubectl logs -n my-app -l app=api-gateway -c istio-proxy | grep -i wasm

# Look for successful loading messages
kubectl logs -n my-app -l app=api-gateway -c istio-proxy | grep "Plugin.*loaded\|wasm.*created"
```

If the plugin failed to load, you will see error messages like:

```
Failed to load Wasm module
Failed to create Wasm VM
```

Common causes:
- Wasm binary not found at the URL
- Binary is corrupt or not a valid Wasm module
- Registry authentication failed
- Binary was compiled for the wrong target

## Rolling Out Plugin Updates

To update a deployed plugin, change the version tag in the WasmPlugin URL:

```yaml
# Before
url: oci://registry.example.com/my-plugins/auth-filter:v1.0

# After
url: oci://registry.example.com/my-plugins/auth-filter:v1.1
```

Apply the updated resource:

```bash
kubectl apply -f wasmplugin.yaml
```

Envoy will download the new version and hot-reload the plugin without restarting the proxy pod. This is one of the big advantages of Wasm plugins - you can update filter logic without restarting workloads.

## Deploying to Multiple Workloads

To deploy the same plugin to multiple workloads, you can create multiple WasmPlugin resources or use broader selectors:

```yaml
# Deploy to all workloads in the namespace (no selector)
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: logging-plugin
  namespace: my-app
spec:
  url: oci://registry.example.com/my-plugins/logging:v1.0
```

```yaml
# Deploy to workloads matching a label
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: logging-plugin
  namespace: my-app
spec:
  selector:
    matchLabels:
      logging-enabled: "true"
  url: oci://registry.example.com/my-plugins/logging:v1.0
```

## Deploying to Gateways

To deploy plugins to Istio ingress or egress gateways:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: gateway-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  url: oci://registry.example.com/my-plugins/auth-filter:v1.0
  phase: AUTHN
```

## Summary

Deploying Wasm plugins to Istio proxies can be done through OCI registries (recommended for production), HTTP URLs (good for development), or local files (testing only). Use versioned OCI tags with `imagePullPolicy: IfNotPresent` for production deployments, and configure image pull secrets for private registries. Plugin updates are hot-reloaded by Envoy without pod restarts, making it straightforward to iterate on your custom traffic processing logic.
