# How to Configure All ProxyConfig Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ProxyConfig, Envoy, Performance Tuning, Kubernetes

Description: Complete guide to every ProxyConfig field in Istio for customizing sidecar proxy behavior including concurrency, image settings, environment variables, and more.

---

ProxyConfig controls the behavior of individual Envoy sidecar proxies in your mesh. While MeshConfig sets mesh-wide proxy defaults, ProxyConfig lets you override settings for specific workloads or namespaces. This is useful when different services have different performance characteristics or requirements.

## Where ProxyConfig Lives

ProxyConfig can be set in several places, with increasing specificity:

1. MeshConfig `defaultConfig` - mesh-wide defaults
2. Pod annotation `proxy.istio.io/config` - per-pod override
3. ProxyConfig resource (namespace or workload level)

The ProxyConfig custom resource was introduced as a cleaner alternative to pod annotations. It follows the same selector pattern as other Istio resources.

## Top-Level Structure

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: my-proxy-config
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  concurrency: 2
  image:
    imageType: distroless
  environmentVariables:
    MY_VAR: "my-value"
```

## Selector

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
```

The `selector` targets specific workloads by label. If omitted, the config applies to all workloads in the namespace. Only one ProxyConfig per namespace can omit the selector (it becomes the namespace default).

If both a ProxyConfig resource and a `proxy.istio.io/config` annotation match a workload, Istio merges them and the ProxyConfig resource takes precedence for overlapping fields.

## Concurrency

```yaml
spec:
  concurrency: 2
```

The `concurrency` field sets the number of worker threads Envoy uses. If unset, Istio automatically determines the value based on CPU requests and limits. If explicitly set to 0, Envoy uses all cores on the machine and ignores CPU requests and limits. Setting this explicitly is useful when:

- You want to limit CPU usage regardless of available cores
- Your service has low traffic and does not need multiple threads
- You are running in a resource-constrained environment

A value of 1 means single-threaded operation, which can simplify debugging but limits throughput. For most production workloads, leaving the field unset works well.

## Image

```yaml
spec:
  image:
    imageType: distroless
```

The `image` field controls which proxy image variant is used:

- `imageType` can be `default`, `debug`, or `distroless`

The `distroless` variant is smaller and has a reduced attack surface (no shell, no package manager). The `debug` variant includes a shell and debugging tools, which is helpful during troubleshooting.

```yaml
# Use debug image for a specific workload

spec:
  selector:
    matchLabels:
      app: problematic-service
  image:
    imageType: debug
```

## Environment Variables

```yaml
spec:
  environmentVariables:
    ISTIO_META_DNS_CAPTURE: "true"
    ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    PILOT_CERT_PROVIDER: "istiod"
    PROXY_XDS_VIA_AGENT: "true"
```

The `environmentVariables` field sets environment variables on the proxy container. This is a map of string key-value pairs. These variables affect both the Envoy proxy and the istio-agent process running in the sidecar container.

Common environment variables:

- `ISTIO_META_DNS_CAPTURE` - enables DNS proxying through the sidecar
- `ISTIO_META_DNS_AUTO_ALLOCATE` - automatically allocates VIPs for ServiceEntry hosts
- `ISTIO_META_REQUESTED_NETWORK_VIEW` - limits the networks this proxy can see

You can also pass custom metadata via `ISTIO_META_*` variables:

```yaml
environmentVariables:
  ISTIO_META_CUSTOM_LABEL: "my-value"
```

These show up in Envoy's node metadata and can be referenced in EnvoyFilter or Wasm plugins.

## MeshConfig ProxyConfig Fields

While the ProxyConfig CRD has a focused set of fields, the full ProxyConfig specification in MeshConfig includes many more options. These can also be set via pod annotation `proxy.istio.io/config`. Commonly used options include:

### Tracing

```yaml
# In MeshConfig defaultConfig or pod annotation
tracing:
  zipkin:
    address: zipkin.istio-system:9411
  sampling: 10.0
  tlsSettings:
    mode: DISABLE
  max_path_tag_length: 256
  custom_tags:
    environment:
      literal:
        value: production
```

The tracing section configures trace collection:

- `zipkin.address` - the Zipkin collector endpoint
- `sampling` - percentage of requests to sample (0-100)
- `tlsSettings` - TLS configuration for the tracing backend connection
- `max_path_tag_length` - maximum length of the URL path tag in spans
- `custom_tags` - additional tags to add to every span

### Stats Tags and Inclusion

```yaml
extraStatTags:
  - "custom_dimension_1"
  - "custom_dimension_2"

proxyStatsMatcher:
  inclusionRegexps:
    - ".*circuit_breakers.*"
    - ".*upstream_rq_retry.*"
  inclusionPrefixes:
    - "cluster.outbound"
  inclusionSuffixes:
    - "upstream_cx_active"
```

`extraStatTags` adds custom dimensions to Envoy-generated metrics. The `proxyStatsMatcher` controls which internal Envoy statistics are exposed:

- `inclusionRegexps` - regex patterns for stats to include
- `inclusionPrefixes` - prefix-based matching
- `inclusionSuffixes` - suffix-based matching

This is useful for debugging because Envoy generates thousands of internal stats, but only a subset is exposed by default.

### Discovery Address

```yaml
discoveryAddress: istiod.istio-system.svc:15012
```

The address of the xDS (configuration) server. In a standard installation, this is istiod's address. You might change this in multi-cluster setups or when using a custom control plane.

### Proxy Admin Port

```yaml
proxyAdminPort: 15000
```

The port for Envoy's admin interface. Default is 15000. You can access it from within the pod for debugging:

```bash
kubectl exec <pod> -c istio-proxy -- curl localhost:15000/config_dump
```

### Status Port

```yaml
statusPort: 15020
```

The port for the proxy agent's health check endpoint.

### Drain Duration

```yaml
drainDuration: 45s
```

How long Envoy waits for active connections to complete during a graceful shutdown. Default is 45 seconds. Increase this for services with long-lived connections.

### Termination Drain Duration

```yaml
terminationDrainDuration: 5s
```

The amount of time allowed for connections to complete after the proxy receives SIGTERM or SIGINT. After this duration, istio-agent kills any remaining active Envoy processes.

### Hold Application Until Proxy Starts

```yaml
holdApplicationUntilProxyStarts: true
```

When true, Istio delays application startup until the sidecar proxy is ready to accept traffic. This prevents the application from making network calls before the proxy is ready. Very useful for apps that make external calls during startup.

### Interception Mode

```yaml
interceptionMode: REDIRECT
```

How traffic is intercepted by the sidecar:

- `REDIRECT` - use iptables REDIRECT (default)
- `TPROXY` - use iptables TPROXY (preserves source IP)

`TPROXY` is useful when your application needs to see the real client IP address, but it requires additional kernel capabilities.

### Configuring via Pod Annotation

Many ProxyConfig fields can be set via annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        proxy.istio.io/config: |
          concurrency: 2
          holdApplicationUntilProxyStarts: true
          drainDuration: 60s
          proxyStatsMatcher:
            inclusionPrefixes:
              - "cluster.outbound"
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

## Full ProxyConfig Resource Example

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: high-performance-proxy
  namespace: production
spec:
  selector:
    matchLabels:
      app: high-traffic-api
  concurrency: 4
  image:
    imageType: distroless
  environmentVariables:
    ISTIO_META_DNS_CAPTURE: "true"
    ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

And the matching deployment with additional annotation-based settings:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: high-traffic-api
  template:
    metadata:
      labels:
        app: high-traffic-api
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
          drainDuration: 120s
          terminationDrainDuration: 10s
          proxyStatsMatcher:
            inclusionPrefixes:
              - "cluster.outbound"
              - "listener"
    spec:
      containers:
        - name: api
          image: high-traffic-api:latest
          resources:
            requests:
              cpu: "2"
              memory: "1Gi"
```

ProxyConfig is the tool for fine-tuning proxy behavior at the workload level. Combine it with MeshConfig defaults for a layered configuration approach where most workloads use sensible defaults and specific services get the tuning they need.
