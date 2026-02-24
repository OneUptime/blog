# How to Configure Proxy Annotations in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy Annotations, Sidecar, Kubernetes, Configuration

Description: A comprehensive reference and guide to Istio sidecar proxy annotations for controlling injection, resource limits, traffic interception, and proxy behavior.

---

Istio uses Kubernetes annotations extensively to configure how the sidecar proxy behaves for individual workloads. These annotations give you fine-grained control without modifying global mesh settings. They are processed by the sidecar injector webhook during pod creation, so changes require a pod restart to take effect.

## How Sidecar Injection Annotations Work

When a pod is created in a namespace with injection enabled, the Istio mutating webhook intercepts the pod creation request and modifies the pod spec to add the sidecar container. Annotations on the pod template control what the webhook does. The annotations go on the pod template inside your Deployment (under `spec.template.metadata.annotations`), not on the Deployment itself.

## Injection Control Annotations

The most basic annotations control whether injection happens at all:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: my-app
        image: nginx:1.25
```

Setting `sidecar.istio.io/inject` to `"false"` skips injection for that pod, even if the namespace has injection enabled. This is useful for jobs, init-only pods, or services that should not be in the mesh.

## Resource Annotations

Control CPU and memory for the sidecar proxy:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyCPULimit: "2000m"
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyMemoryLimit: "1024Mi"
```

These map directly to the resource requests and limits on the `istio-proxy` container. Setting appropriate values here is critical for production. Too low, and the proxy gets throttled or OOMKilled. Too high, and you waste cluster resources.

For the init container, separate annotations exist:

```yaml
metadata:
  annotations:
    sidecar.istio.io/initCPU: "100m"
    sidecar.istio.io/initCPULimit: "2000m"
    sidecar.istio.io/initMemory: "128Mi"
    sidecar.istio.io/initMemoryLimit: "1024Mi"
```

## Traffic Interception Annotations

Control how the sidecar captures traffic:

```yaml
metadata:
  annotations:
    sidecar.istio.io/interceptionMode: "REDIRECT"
```

The interception mode can be `REDIRECT` (iptables REDIRECT) or `TPROXY` (iptables TPROXY). REDIRECT is the default and works in most cases. TPROXY preserves the original source IP but requires kernel support and specific capabilities.

**Excluding ports from interception:**

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "8081,8082"
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379"
```

This is really useful when you have ports that should bypass the mesh entirely. Common examples include database connections where mTLS might cause issues, or metrics endpoints that should be accessible without going through the proxy.

**Including specific ports only:**

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeInboundPorts: "8080,8443"
    traffic.sidecar.istio.io/includeOutboundPorts: "80,443"
```

If you set `includeInboundPorts`, only those ports will be intercepted. All other inbound traffic bypasses the sidecar. The default behavior is to intercept all ports.

**Excluding IP ranges:**

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8,172.16.0.0/12"
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.96.0.0/12"
```

This controls which outbound IP ranges go through the sidecar. Use `excludeOutboundIPRanges` to bypass the proxy for specific destinations, or `includeOutboundIPRanges` to only proxy traffic to specific ranges.

## Proxy Configuration Annotation

The `proxy.istio.io/config` annotation lets you set any ProxyConfig option:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      concurrency: 2
      drainDuration: 45s
      terminationDrainDuration: 5s
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
```

This is a powerful catch-all that accepts any field from the ProxyConfig protobuf. Some commonly used options:

- `concurrency` - number of worker threads (0 means use all CPUs)
- `drainDuration` - time to wait for active connections to complete during shutdown
- `terminationDrainDuration` - additional drain time before the proxy exits
- `holdApplicationUntilProxyStarts` - delay the app container until the proxy is ready

## Status Port and Readiness

```yaml
metadata:
  annotations:
    status.sidecar.istio.io/port: "15021"
    readiness.status.sidecar.istio.io/applicationPorts: "8080"
    readiness.status.sidecar.istio.io/initialDelaySeconds: "5"
    readiness.status.sidecar.istio.io/periodSeconds: "10"
    readiness.status.sidecar.istio.io/failureThreshold: "30"
```

The status port annotation sets where the proxy exposes its health status. The readiness annotations configure the health check that Kubernetes uses to determine if the sidecar is ready to receive traffic.

## Proxy Image Annotations

Override the proxy image for specific workloads:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyImage: "docker.io/istio/proxyv2:1.20.0"
```

This lets you pin a specific proxy version for a workload, which can be useful during upgrades when you want to test a new proxy version on specific services before rolling it out mesh-wide.

## Log Level Annotations

Control the verbosity of sidecar logs:

```yaml
metadata:
  annotations:
    sidecar.istio.io/logLevel: "warning"
    sidecar.istio.io/componentLogLevel: "misc:error,rbac:debug,filter:info"
```

The `logLevel` sets the default log level for all components. The `componentLogLevel` lets you set different levels for specific Envoy components. This is extremely helpful when debugging. You can set `rbac:debug` to troubleshoot authorization issues without flooding your logs with debug output from every other component.

## Volumes and Volume Mounts

Mount additional volumes into the sidecar container:

```yaml
metadata:
  annotations:
    sidecar.istio.io/userVolume: '[{"name":"custom-certs","secret":{"secretName":"my-certs"}}]'
    sidecar.istio.io/userVolumeMount: '[{"name":"custom-certs","mountPath":"/etc/custom-certs","readOnly":true}]'
```

This is used when the sidecar needs access to additional certificates, configuration files, or other data that isn't provided by the standard injection.

## A Complete Example

Here is a production-ready deployment with comprehensive proxy annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
      annotations:
        sidecar.istio.io/inject: "true"
        sidecar.istio.io/proxyCPU: "200m"
        sidecar.istio.io/proxyCPULimit: "1000m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
        sidecar.istio.io/logLevel: "warning"
        traffic.sidecar.istio.io/excludeOutboundPorts: "5432"
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
          terminationDrainDuration: 10s
    spec:
      containers:
      - name: payment-service
        image: payment-service:2.1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

## Verifying Annotations Took Effect

After deploying, check that annotations were applied:

```bash
POD=$(kubectl get pod -l app=payment-service -o jsonpath='{.items[0].metadata.name}')

# Check resource limits on the proxy
kubectl get pod $POD -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}' | jq .

# Check environment variables
kubectl exec $POD -c istio-proxy -- env | sort

# Check the proxy configuration
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /config_dump | jq . | head -50
```

## Common Gotchas

1. Annotations go on the pod template, not on the Deployment metadata
2. Changes require a pod restart (delete the pod or do a rollout restart)
3. String values need to be quoted in YAML (like `"true"` not `true` for the inject annotation)
4. The `proxy.istio.io/config` annotation uses YAML format, not JSON, for the value
5. Resource annotations are strings, so write `"128Mi"` not `128Mi` without quotes

Proxy annotations are the most granular way to tune Istio's behavior per workload. Use them when you need specific settings that differ from your mesh-wide defaults, and remember that they only take effect when pods are created or restarted.
