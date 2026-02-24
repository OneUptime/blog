# How to Configure Tracing Using Pod Annotations in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pod Annotations, Tracing, Sidecar Configuration, Kubernetes

Description: How to use Kubernetes pod annotations to customize Istio tracing behavior for individual workloads without changing global mesh settings.

---

Sometimes you need to tweak tracing for a single deployment without touching the mesh-wide configuration. Maybe you're debugging a specific service and want to temporarily increase the sampling rate, or you want one service to use different custom tags. Istio's pod annotations let you override tracing settings at the individual workload level, and the changes take effect when the pod restarts - no changes to MeshConfig or Telemetry resources required.

## The proxy.istio.io/config Annotation

The primary annotation for customizing sidecar proxy configuration is `proxy.istio.io/config`. This annotation accepts a YAML string that overrides the mesh-wide `defaultConfig` for that specific pod:

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
          tracing:
            sampling: 100
    spec:
      containers:
        - name: my-service
          image: my-service:latest
```

This sets the sampling rate to 100% for just this deployment. All other workloads in the mesh keep their default sampling rate.

## Available Tracing Configuration Options

Within the `proxy.istio.io/config` annotation, you can configure these tracing-related fields:

### Sampling Rate

```yaml
annotations:
  proxy.istio.io/config: |
    tracing:
      sampling: 50.0
```

Values range from 0 to 100. A value of 50 means 50% of requests are traced.

### Custom Tags with Literal Values

```yaml
annotations:
  proxy.istio.io/config: |
    tracing:
      sampling: 10
      customTags:
        deployment.version:
          literal:
            value: canary-v2
        team:
          literal:
            value: platform
```

### Custom Tags from Request Headers

```yaml
annotations:
  proxy.istio.io/config: |
    tracing:
      customTags:
        tenant.id:
          header:
            name: x-tenant-id
            defaultValue: unknown
        api.version:
          header:
            name: x-api-version
            defaultValue: v1
```

### Custom Tags from Environment Variables

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
          tracing:
            customTags:
              pod.name:
                environment:
                  name: POD_NAME
                  defaultValue: unknown
              node.name:
                environment:
                  name: NODE_NAME
                  defaultValue: unknown
    spec:
      containers:
        - name: my-service
          image: my-service:latest
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
```

The environment variables are available to the Envoy sidecar, which runs in the same pod and shares the environment.

## Use Case: Temporary Debug Tracing

When investigating a production issue, you often want to increase the sampling rate for a specific service temporarily. Rather than changing the mesh-wide Telemetry resource (which affects everything), use an annotation:

```bash
# Add the annotation to increase sampling
kubectl patch deployment my-service -p '
{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "proxy.istio.io/config": "tracing:\n  sampling: 100\n"
        }
      }
    }
  }
}'
```

This triggers a rolling restart of the deployment with the new sampling rate. When you're done debugging, remove the annotation:

```bash
# Remove the annotation
kubectl patch deployment my-service -p '
{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "proxy.istio.io/config": null
        }
      }
    }
  }
}'
```

## Use Case: Canary Deployment Tagging

When running canary deployments, tag spans with the deployment version so you can compare performance in your tracing backend:

```yaml
# Stable deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-stable
spec:
  replicas: 9
  template:
    metadata:
      labels:
        app: my-service
        version: v1
      annotations:
        proxy.istio.io/config: |
          tracing:
            customTags:
              deployment.track:
                literal:
                  value: stable
              deployment.version:
                literal:
                  value: v1.2.3
    spec:
      containers:
        - name: my-service
          image: my-service:v1.2.3
---
# Canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-canary
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: my-service
        version: v2
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 100
            customTags:
              deployment.track:
                literal:
                  value: canary
              deployment.version:
                literal:
                  value: v1.3.0-rc1
    spec:
      containers:
        - name: my-service
          image: my-service:v1.3.0-rc1
```

The canary deployment gets 100% sampling (to capture all canary traffic) and tags identifying it as canary. The stable deployment uses the default sampling rate with its own version tags.

## Use Case: Per-Team Configuration

Different teams might want different tracing configurations for their services:

```yaml
# Team Alpha's service - verbose tracing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: team-alpha
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 50
            customTags:
              team:
                literal:
                  value: alpha
              service.tier:
                literal:
                  value: critical
---
# Team Beta's service - minimal tracing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendation-service
  namespace: team-beta
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 1
            customTags:
              team:
                literal:
                  value: beta
              service.tier:
                literal:
                  value: standard
```

## Priority and Override Order

When tracing configuration exists at multiple levels, the most specific wins:

1. **Pod annotation** (`proxy.istio.io/config`) - Highest priority
2. **Workload-level Telemetry** (Telemetry with selector.matchLabels)
3. **Namespace-level Telemetry** (Telemetry in the workload's namespace)
4. **Mesh-wide Telemetry** (Telemetry in istio-system)
5. **MeshConfig defaultConfig** - Lowest priority

If you set sampling to 100% in a pod annotation and 1% in the namespace Telemetry, the pod gets 100%.

Important nuance: The Telemetry API and pod annotations configure tracing at slightly different levels. The Telemetry API's `randomSamplingPercentage` is applied by the Envoy's tracing extension, while the annotation's `tracing.sampling` is set in the bootstrap configuration. In practice, the more specific configuration wins, but if you're mixing both approaches, test to confirm the expected behavior.

## Verifying Annotation-Based Configuration

After applying the annotation and waiting for pods to restart:

```bash
# Check that the annotation is set
kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.annotations.proxy\.istio\.io/config}'

# Verify the proxy bootstrap config
istioctl proxy-config bootstrap deploy/my-service -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
tracing = data.get('bootstrap', {}).get('tracing', {})
print(json.dumps(tracing, indent=2))
"

# Check if custom tags are present
istioctl proxy-config bootstrap deploy/my-service -o json | grep -A5 customTags
```

## Other Tracing-Related Annotations

Beyond `proxy.istio.io/config`, there are a few other annotations that affect tracing behavior:

### Disabling Sidecar Injection

If you don't want a sidecar at all (and thus no automatic tracing):

```yaml
annotations:
  sidecar.istio.io/inject: "false"
```

### Excluding Ports from Interception

If certain ports shouldn't be intercepted by the sidecar (and thus won't generate spans):

```yaml
annotations:
  traffic.sidecar.istio.io/excludeOutboundPorts: "9411,4317"
```

This is useful for excluding traffic to the tracing backend itself, preventing tracing the trace export calls.

### Proxy Resource Configuration

While not directly tracing-related, adjusting sidecar resources can affect tracing performance:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "200m"
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyCPULimit: "500m"
  sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

Under-provisioned sidecars might drop spans under high load.

## Formatting Tips

The annotation value must be valid YAML. Common mistakes:

Wrong (missing newline in multi-line):
```yaml
annotations:
  proxy.istio.io/config: "tracing: sampling: 100"
```

Right (using the pipe for multi-line):
```yaml
annotations:
  proxy.istio.io/config: |
    tracing:
      sampling: 100
```

Right (single-line JSON):
```yaml
annotations:
  proxy.istio.io/config: '{"tracing":{"sampling":100}}'
```

When using kubectl patch, be careful with escaping:

```bash
kubectl patch deployment my-service -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"proxy.istio.io/config\":\"tracing:\\n  sampling: 100\\n\"}}}}}"
```

## When to Use Annotations vs Telemetry API

**Use annotations when:**
- Making temporary changes for debugging
- Configuring per-deployment settings in CI/CD
- Teams want to manage their own tracing config alongside deployment manifests
- You need settings that only take effect after a pod restart

**Use Telemetry API when:**
- You want dynamic changes without pod restarts
- Managing configuration across multiple workloads
- Setting namespace-wide policies
- Using CEL-based filtering

## Summary

Pod annotations give you fine-grained, per-workload control over Istio tracing without touching global configuration. Use `proxy.istio.io/config` to override sampling rates, add custom tags, and configure per-deployment tracing behavior. This is particularly useful for canary deployments, temporary debugging sessions, and team-level customization. Remember that annotations require a pod restart to take effect, and they take priority over both Telemetry API and MeshConfig settings.
