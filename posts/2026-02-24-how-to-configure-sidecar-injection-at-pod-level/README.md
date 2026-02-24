# How to Configure Sidecar Injection at Pod Level

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Kubernetes, Pod Configuration, Service Mesh

Description: How to control Istio sidecar injection and configuration at the individual pod level using annotations for fine-grained mesh control.

---

While namespace-level injection is the default approach for most Istio deployments, there are plenty of situations where you need finer control. Maybe one pod in a namespace needs different sidecar resources. Maybe a job should opt out of injection. Maybe a specific deployment needs a custom proxy configuration.

Pod-level injection gives you this control through annotations on the pod template. These annotations override namespace-level settings and let you customize sidecar behavior per workload.

## Enabling and Disabling Injection per Pod

The most basic pod-level control is the injection toggle:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

Setting `sidecar.istio.io/inject: "true"` forces injection even if the namespace does not have injection enabled. Setting it to `"false"` prevents injection even if the namespace has it enabled.

This is especially useful for:

- Enabling injection for specific pods in a non-injected namespace
- Disabling injection for specific pods that should not be in the mesh (like batch jobs or init pods)
- Overriding namespace-level settings for individual workloads

## Customizing Sidecar Resources

Each pod can have its own sidecar CPU and memory configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-api
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "200m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyCPULimit: "1"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
      - name: high-traffic-api
        image: high-traffic-api:latest
```

These annotations override the global proxy resource settings from the IstioOperator configuration.

For a low-traffic admin service in the same namespace:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-dashboard
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "10m"
        sidecar.istio.io/proxyMemory: "40Mi"
        sidecar.istio.io/proxyCPULimit: "100m"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
    spec:
      containers:
      - name: admin-dashboard
        image: admin-dashboard:latest
```

## Configuring Proxy Concurrency

The number of Envoy worker threads affects both performance and memory usage:

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 4
```

Set higher concurrency for high-throughput services and lower (or 1) for low-traffic services. Each worker thread adds memory overhead.

## Custom Proxy Configuration

The `proxy.istio.io/config` annotation accepts a full ProxyConfig YAML block:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 2
          holdApplicationUntilProxyStarts: true
          terminationDrainDuration: 15s
          tracing:
            sampling: 100.0
            zipkin:
              address: otel-collector.monitoring:9411
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

This sets the proxy concurrency to 2, holds the application startup until the proxy is ready, configures a 15-second drain on shutdown, and sets 100% trace sampling for this specific service.

## Controlling Traffic Interception

By default, the sidecar intercepts all inbound and outbound traffic. You can customize this per pod.

**Exclude specific outbound ports from interception:**

```yaml
annotations:
  traffic.sidecar.istio.io/excludeOutboundPorts: "3306,6379,27017"
```

This is useful when connecting to databases or caches where you do not want the sidecar overhead. Traffic to ports 3306 (MySQL), 6379 (Redis), and 27017 (MongoDB) bypasses the sidecar entirely.

**Exclude specific inbound ports:**

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "9090"
```

This is useful for Prometheus scraping endpoints. Port 9090 traffic goes directly to the application without passing through the sidecar.

**Include only specific outbound ports** (instead of intercepting all):

```yaml
annotations:
  traffic.sidecar.istio.io/includeOutboundIPRanges: "10.0.0.0/8"
```

This intercepts outbound traffic only to the 10.0.0.0/8 range (typically your cluster network). Traffic to external IPs bypasses the sidecar.

**Exclude specific outbound IP ranges:**

```yaml
annotations:
  traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32"
```

This is commonly needed for the AWS metadata endpoint (169.254.169.254). Without this exclusion, IMDS calls get routed through the sidecar, which can cause issues with IAM roles for service accounts.

## Controlling Sidecar Image

Override the sidecar image per pod:

```yaml
annotations:
  sidecar.istio.io/proxyImage: "my-registry.example.com/istio/proxyv2:1.20.0-custom"
```

This is useful when you need a custom Envoy build (for example, with FIPS-compliant cryptography or additional Envoy filters).

## Configuring Startup and Readiness

**Hold application until proxy starts:**

```yaml
annotations:
  proxy.istio.io/config: |
    holdApplicationUntilProxyStarts: true
```

This prevents the race condition where your application starts before the sidecar is ready.

**Custom readiness probe on the sidecar:**

The sidecar exposes a health endpoint at port 15021. You can add readiness dependencies in your application that check this endpoint:

```yaml
containers:
- name: my-service
  readinessProbe:
    httpGet:
      path: /healthz/ready
      port: 15021
    initialDelaySeconds: 1
    periodSeconds: 2
```

Wait, that checks the sidecar readiness from the application container's probe. Actually, the standard approach is to rely on `holdApplicationUntilProxyStarts` rather than custom probes.

## Configuring Log Level

Debug sidecar issues by increasing the log level for a specific pod:

```yaml
annotations:
  sidecar.istio.io/logLevel: debug
```

Valid values are `trace`, `debug`, `info`, `warning`, `error`, `critical`, `off`.

You can also set the component-level log output:

```yaml
annotations:
  sidecar.istio.io/componentLogLevel: "upstream:debug,connection:debug,http:debug"
```

This gives you debug logging for connection handling and HTTP processing without flooding the logs with every other component.

## Interception Mode

Control how traffic is redirected to the sidecar:

```yaml
annotations:
  sidecar.istio.io/interceptionMode: REDIRECT
```

Valid values are `REDIRECT` (iptables REDIRECT) and `TPROXY` (iptables TPROXY). REDIRECT is the default and works everywhere. TPROXY preserves the original source IP but requires kernel support and specific capabilities.

## Status Annotation

After injection, the pod gets a status annotation that records what was injected:

```bash
kubectl get pod my-pod -o jsonpath='{.metadata.annotations.sidecar\.istio\.io/status}' | jq .
```

This returns:

```json
{
  "initContainers": ["istio-init"],
  "containers": ["istio-proxy"],
  "volumes": ["istio-envoy", "istio-data", "istio-podinfo", "istio-token", "istiod-ca-cert"],
  "imagePullSecrets": null,
  "revision": "default"
}
```

This is useful for debugging to confirm what was injected and which revision was used.

## Complete Example: Production API Service

Here is a fully annotated pod template for a production API service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
        version: v2
      annotations:
        sidecar.istio.io/inject: "true"
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
        traffic.sidecar.istio.io/excludeOutboundPorts: "5432"
        proxy.istio.io/config: |
          concurrency: 2
          holdApplicationUntilProxyStarts: true
          terminationDrainDuration: 15s
    spec:
      serviceAccountName: payment-api
      containers:
      - name: payment-api
        image: payment-api:v2.3.1
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
```

This configuration:
- Forces sidecar injection
- Sets appropriate sidecar resources for a medium-traffic service
- Excludes PostgreSQL port (5432) from interception (the database connection does not benefit from the sidecar)
- Uses 2 Envoy worker threads
- Holds the application startup until the sidecar is ready
- Configures a 15-second drain on shutdown

## Summary

Pod-level injection annotations give you precise control over sidecar behavior. Use them to customize resources per workload, exclude specific traffic from interception, tune proxy settings, and debug injection issues. The annotations override namespace-level defaults, so you can have a baseline configuration at the namespace level and fine-tune individual workloads as needed.
