# How to Configure Proxy Environment Variables in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy Proxy, Environment Variable, Kubernetes, Configuration

Description: A practical guide to setting custom environment variables on the Istio sidecar proxy using pod annotations and mesh-wide configuration options.

---

Every workload in an Istio mesh gets a sidecar proxy container (Envoy) injected alongside the application container. Sometimes you need to pass custom environment variables to this proxy. Maybe you need to tune Envoy's behavior, configure a custom logging format, or set variables that a WebAssembly plugin expects. Istio provides several ways to do this, from per-pod annotations to mesh-wide settings.

## Why You Would Set Proxy Environment Variables

There are several situations where you need to customize the sidecar's environment:

- Setting `ISTIO_META_*` variables to pass metadata to the proxy
- Configuring DNS resolution behavior
- Tuning Envoy internal settings like concurrency or drain duration
- Passing configuration to custom Envoy filters or WASM plugins
- Setting HTTP proxy variables for outbound connections through a corporate proxy

## Method 1: Pod Annotations

The simplest way to set environment variables on the sidecar proxy is through pod annotations. You add `proxy.istio.io/config` with a JSON or YAML value:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            CUSTOM_VAR: "my-value"
            ISTIO_META_DNS_CAPTURE: "true"
            ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    spec:
      containers:
      - name: my-app
        image: nginx:1.25
        ports:
        - containerPort: 80
```

The `proxyMetadata` field sets environment variables on the sidecar container. Apply and verify:

```bash
kubectl apply -f my-app.yaml

# Check the env vars on the sidecar container
kubectl get pod -l app=my-app -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].env}' | jq .
```

## Method 2: ProxyConfig Resource

For Istio 1.13 and later, you can use the ProxyConfig custom resource. This gives you a cleaner way to configure proxy settings per workload, namespace, or mesh-wide:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: my-app-proxy-config
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  environmentVariables:
    MY_CUSTOM_ENV: "hello"
    PROXY_XDS_VIA_AGENT: "true"
```

```bash
kubectl apply -f proxy-config.yaml
```

The ProxyConfig resource is namespace-scoped and uses label selectors to target specific workloads. If you omit the selector, it applies to all workloads in the namespace.

## Method 3: Mesh-Wide Configuration

To set environment variables on every sidecar proxy in the mesh, use the IstioOperator or the `meshConfig` in your Istio configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
        BOOTSTRAP_XDS_AGENT: "true"
```

Apply with istioctl:

```bash
istioctl install -f istio-config.yaml
```

You can also set this through the `istio` ConfigMap:

```bash
kubectl edit configmap istio -n istio-system
```

Find the `defaultConfig` section in the mesh configuration and add your `proxyMetadata` entries there.

## Common Environment Variables

Here are environment variables that you will commonly need to set:

**DNS-related:**

```yaml
proxyMetadata:
  ISTIO_META_DNS_CAPTURE: "true"
  ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

These enable Istio's DNS proxying, which lets the sidecar handle DNS resolution. This is useful for ServiceEntry resources that define external services.

**Concurrency:**

```yaml
proxyMetadata:
  ISTIO_META_PROXY_CONCURRENCY: "2"
```

Controls how many worker threads Envoy uses. Default is 2 on most installations. Setting it to 0 means Envoy will use all available CPU cores.

**Proxy metadata for telemetry:**

```yaml
proxyMetadata:
  ISTIO_META_MESH_ID: "my-mesh"
  ISTIO_META_CLUSTER_ID: "cluster-1"
  ISTIO_META_NETWORK: "network-1"
```

These are used in multi-cluster setups to identify which mesh, cluster, and network a proxy belongs to.

**HTTP proxy for outbound traffic:**

```yaml
proxyMetadata:
  HTTP_PROXY: "http://corporate-proxy.internal:3128"
  HTTPS_PROXY: "http://corporate-proxy.internal:3128"
  NO_PROXY: "localhost,127.0.0.1,.svc.cluster.local"
```

If your cluster sits behind a corporate proxy and external traffic needs to go through it, these variables tell the sidecar where to route outbound connections.

## Using sidecar.istio.io/proxyImage Annotation

While not exactly an environment variable, you can also control the proxy container settings through annotations. For custom environment variables that aren't covered by `proxyMetadata`, you can use the `sidecar.istio.io/inject` annotation in combination with a custom injection template:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-sidecar-injector
  namespace: istio-system
data:
  values: |-
    {
      "global": {
        "proxy": {
          "env": {
            "CUSTOM_ENVOY_VAR": "custom-value"
          }
        }
      }
    }
```

## Verifying Environment Variables

After deploying your workload, verify the environment variables are set correctly:

```bash
# List all env vars on the istio-proxy container
POD_NAME=$(kubectl get pod -l app=my-app -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD_NAME -c istio-proxy -- env | sort

# Check a specific variable
kubectl exec $POD_NAME -c istio-proxy -- env | grep CUSTOM_VAR

# You can also check the pod spec directly
kubectl get pod $POD_NAME -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].env[*].name}'
```

## Priority and Override Order

When the same environment variable is set at multiple levels, there is a precedence order:

1. Pod annotations (highest priority)
2. ProxyConfig with workload selector
3. ProxyConfig without selector (namespace-wide)
4. MeshConfig defaultConfig (lowest priority)

This means a pod-level annotation always wins over mesh-wide settings. This is useful when you need to override a global default for a specific workload.

## Setting Variables for the Init Container

The init container (`istio-init`) that sets up iptables rules is separate from the sidecar. To set environment variables on the init container, use:

```yaml
metadata:
  annotations:
    sidecar.istio.io/interceptionMode: REDIRECT
```

Most init container configuration is handled through specific annotations rather than generic environment variables.

## Troubleshooting

If your environment variables aren't showing up:

```bash
# Check if sidecar injection happened
kubectl get pod -l app=my-app -o jsonpath='{.items[0].spec.containers[*].name}'

# Look at the istio-proxy container spec
kubectl get pod -l app=my-app -o yaml | grep -A 50 "name: istio-proxy"

# Check the sidecar injector webhook configuration
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml

# Restart the pod to pick up new ProxyConfig changes
kubectl rollout restart deployment my-app
```

Remember that changes to ProxyConfig or mesh configuration require pod restarts to take effect. The sidecar gets its environment variables at injection time, so existing pods won't pick up changes automatically.

Environment variables give you a flexible way to customize the sidecar proxy behavior without building custom images or writing complex Envoy configurations. Start with pod-level annotations for targeted changes and move to ProxyConfig or mesh-wide settings when you need broader coverage.
