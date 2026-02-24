# How to Configure Sidecar Injection for Windows Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Windows Containers, Sidecar Injection, Kubernetes, Service Mesh

Description: Understanding the current state and workarounds for Istio sidecar injection with Windows container pods in Kubernetes.

---

If you have landed on this post, you are probably trying to get Istio sidecar injection working with Windows pods and running into problems. The short answer is that native sidecar injection into Windows pods is not supported in Istio as of version 1.22. But there are workarounds that let you get many of the same benefits. This post explains the situation and walks through practical alternatives.

## Why Sidecar Injection Does Not Work on Windows

The Istio sidecar injection process adds two components to a pod: an init container (`istio-init`) that sets up iptables rules, and the sidecar container (`istio-proxy`) that runs Envoy. Both are Linux binaries. When these get injected into a Windows pod, the init container fails immediately because it tries to run Linux executables on a Windows node.

Even if you could run Envoy on Windows (there is experimental Windows support in the Envoy project), the traffic interception mechanism relies on iptables, which is a Linux kernel feature. Windows uses HNS (Host Networking Service) and different mechanisms for packet redirection.

## Preventing Injection Failures

The first step is to make sure Istio does not try to inject sidecars into Windows pods. There are several ways to do this:

### Method 1: Namespace-Level Control

Keep Windows workloads in namespaces that do not have injection enabled:

```bash
# Linux namespace with injection
kubectl create namespace linux-apps
kubectl label namespace linux-apps istio-injection=enabled

# Windows namespace without injection
kubectl create namespace windows-apps
# No injection label
```

### Method 2: Pod Annotation

If you have mixed Linux and Windows pods in the same namespace, use annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
  namespace: mixed-apps
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: app
          image: my-windows-app:latest
          ports:
            - containerPort: 80
```

### Method 3: Webhook Selector

Configure the injection webhook to automatically skip Windows pods:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      neverInjectSelector:
        - matchExpressions:
            - key: kubernetes.io/os
              operator: In
              values:
                - windows
```

This is the cleanest approach because it prevents injection globally without needing per-pod annotations.

## Alternative: Gateway Proxy Pattern

Instead of sidecar injection, use a dedicated gateway proxy that sits in front of your Windows services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-api-proxy
  namespace: windows-apps
spec:
  replicas: 2
  selector:
    matchLabels:
      app: windows-api-proxy
  template:
    metadata:
      labels:
        app: windows-api-proxy
        sidecar.istio.io/inject: "true"
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      containers:
        - name: envoy
          image: envoyproxy/envoy:v1.30-latest
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: envoy-config
              mountPath: /etc/envoy
      volumes:
        - name: envoy-config
          configMap:
            name: windows-api-proxy-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: windows-api-proxy-config
  namespace: windows-apps
data:
  envoy.yaml: |
    static_resources:
      listeners:
        - name: listener_0
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 8080
          filter_chains:
            - filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: ingress_http
                    route_config:
                      name: local_route
                      virtual_hosts:
                        - name: backend
                          domains: ["*"]
                          routes:
                            - match:
                                prefix: "/"
                              route:
                                cluster: windows_backend
                    http_filters:
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
      clusters:
        - name: windows_backend
          connect_timeout: 5s
          type: STRICT_DNS
          load_assignment:
            cluster_name: windows_backend
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: windows-api-internal
                          port_value: 80
```

This approach puts a Linux-based proxy with an Istio sidecar in front of your Windows service. The proxy runs on a Linux node, gets full mesh capabilities, and forwards traffic to the Windows backend.

## Alternative: Service Mesh Through Istio VirtualService

A simpler approach is to use Istio's traffic management features from the calling side:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: windows-api
  namespace: windows-apps
spec:
  hosts:
    - windows-api
  http:
    - route:
        - destination:
            host: windows-api
            port:
              number: 80
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: connect-failure,refused-stream,unavailable
      fault:
        delay:
          percentage:
            value: 0
          fixedDelay: 0s
```

When Linux pods with sidecars call this service, the calling sidecar applies the timeout, retry, and fault injection policies. The Windows pod does not need its own sidecar for this to work.

## Alternative: Using a Service Entry for Windows Services

If your Windows services are deployed outside the typical mesh namespace, register them as ServiceEntry resources:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: windows-backend
  namespace: linux-apps
spec:
  hosts:
    - windows-backend.windows-apps.svc.cluster.local
  location: MESH_INTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: windows-backend.windows-apps.svc.cluster.local
```

This makes the Windows service discoverable in the mesh, allowing Linux services to apply Istio policies when communicating with it.

## Configuring DestinationRules for Windows Services

Since Windows pods have no sidecar, disable mTLS for traffic going to them:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: windows-api-dr
  namespace: windows-apps
spec:
  host: windows-api.windows-apps.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Future: Istio Ambient Mode and Windows

Ambient mode might eventually provide a better path for Windows support. Since ambient mode does not use per-pod sidecars but instead uses a per-node ztunnel proxy, it could theoretically support Windows once ztunnel is ported to Windows. However, as of now this is not available.

Keep an eye on the Istio and Envoy projects for updates on Windows support:

```bash
# Check your current Istio version
istioctl version

# Check for ambient mode support
istioctl install --set profile=ambient --dry-run 2>&1 | head -20
```

## Testing Your Windows Integration

Verify that traffic management works for Windows services:

```bash
# From a Linux pod with sidecar, call the Windows service
kubectl exec -n linux-apps deploy/linux-client -c app -- \
  curl -s -w "\nHTTP Code: %{http_code}\nTime: %{time_total}s\n" \
  http://windows-api.windows-apps/

# Check proxy stats on the calling side
kubectl exec -n linux-apps deploy/linux-client -c istio-proxy -- \
  pilot-agent request GET /stats | grep windows-api

# Verify outlier detection works
kubectl exec -n linux-apps deploy/linux-client -c istio-proxy -- \
  pilot-agent request GET /clusters | grep windows-api
```

While native sidecar injection for Windows pods is not yet possible, you can still get significant value from Istio in mixed clusters. Use caller-side sidecar enforcement, gateway proxy patterns, and proper DestinationRules to bring traffic management, observability, and partial security to your Windows workloads.
