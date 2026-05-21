# How to Configure Trace Span Tags in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tracing, Span Tags, Custom Tags, Observability

Description: How to add custom tags and attributes to trace spans in Istio for richer context when debugging distributed systems.

---

The default trace spans that Istio generates include basic information like HTTP method, status code, and duration. That's a good start, but real debugging often requires more context. What tenant does this request belong to? Which API version is being called? What deployment version handled the request? Custom span tags let you attach this kind of metadata to every trace span, making your traces much more useful for root cause analysis.

## Default Span Tags

Out of the box, Envoy and your tracing backend commonly expose metadata like this on spans. The exact tag names can vary by tracing provider and exporter:

- `http.method` - GET, POST, PUT, etc.
- `http.url` - The full request URL
- `http.status_code` - Response status code
- `upstream_cluster` - The Envoy cluster that handled the request
- `upstream_cluster.name` - Short name of the destination cluster
- `response_size` - Size of the response body
- `request_size` - Size of the request body
- `response_flags` - Envoy response flags (e.g., UO for upstream overflow)
- `guid:x-request-id` - The Envoy request ID
- `node_id` - The sidecar's node identifier
- `peer.address` - The address of the peer

## Adding Custom Tags via the Telemetry API

The Telemetry API supports custom tags through the `customTags` field. You can add literal values, environment variables, or request header values:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-span-tags
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 10
      customTags:
        environment:
          literal:
            value: production
        cluster_name:
          literal:
            value: us-east-1-prod
        app_version:
          header:
            name: x-app-version
            defaultValue: unknown
        tenant_id:
          header:
            name: x-tenant-id
            defaultValue: unknown
        proxy_cluster_name:
          environment:
            name: CLUSTER_NAME
            defaultValue: unknown
```

This configuration adds five custom tags to every span:

- `environment` - A static literal value
- `cluster_name` - Another literal, useful for multi-cluster setups
- `app_version` - Extracted from the `X-App-Version` request header
- `tenant_id` - Extracted from the `X-Tenant-Id` request header
- `proxy_cluster_name` - Extracted from the `CLUSTER_NAME` environment variable available to the sidecar

## Making Environment Variables Available

For environment variable-based tags to work, the workload proxy needs access to the variable. Setting an environment variable on your application container does not automatically make it available to the Istio sidecar. For mesh-wide proxy environment variables, add them to the proxy metadata in `MeshConfig`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        POD_NAMESPACE: "production"
        CLUSTER_NAME: "us-east-1-prod"
```

After changing this proxy configuration, restart workloads so new sidecars are injected with the updated proxy environment. If you need dynamic Kubernetes field values such as the pod name or namespace, inject them into the proxy environment explicitly, or use a header tag populated by your application, rather than assuming the sidecar can read the application container's environment.

## Per-Workload Custom Tags

You can apply different tags to different services:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-tags
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
    - providers:
        - name: zipkin
      customTags:
        payment_provider:
          header:
            name: x-payment-provider
            defaultValue: stripe
        idempotency_key:
          header:
            name: idempotency-key
            defaultValue: none
        transaction_type:
          header:
            name: x-transaction-type
            defaultValue: unknown
```

The payment service gets tags specific to payment processing, while other services use the mesh-wide defaults.

## Adding Tags via MeshConfig

You can also configure default tags through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10
        custom_tags:
          cluster:
            literal:
              value: production-us-east-1
          mesh_id:
            literal:
              value: mesh-prod-01
```

## Adding Tags via Pod Annotations

For per-pod customization, use the `proxy.istio.io/config` annotation:

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
          proxyMetadata:
            BUILD_HASH: "abc123def"
          tracing:
            custom_tags:
              canary:
                literal:
                  value: "true"
              build_hash:
                environment:
                  name: BUILD_HASH
                  defaultValue: dev
    spec:
      containers:
        - name: my-service
          image: my-service:latest
```

## Header-Based Tags for Multi-Tenant Systems

If your system is multi-tenant, adding the tenant ID to every span is incredibly useful. First, make sure your ingress gateway or frontend service sets the tenant header. If you want Istio to add a fixed request header on a route, use `headers.request.set`:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend
spec:
  hosts:
    - "*.example.com"
  gateways:
    - main-gateway
  http:
    - headers:
        request:
          set:
            x-tenant-id: tenant-a
      route:
        - destination:
            host: frontend
```

Then configure the span tag to capture it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tenant-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      customTags:
        tenant.id:
          header:
            name: x-tenant-id
            defaultValue: unknown
        tenant.tier:
          header:
            name: x-tenant-tier
            defaultValue: standard
```

Now you can filter traces by tenant ID in your tracing backend, which makes debugging tenant-specific issues much faster.

## Tags for Canary Deployments

When running canary deployments, tag spans with the version so you can compare traces between stable and canary:

```yaml
# Stable deployment

apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-stable
spec:
  template:
    metadata:
      labels:
        app: my-service
        version: v1
      annotations:
        proxy.istio.io/config: |
          tracing:
            custom_tags:
              deployment_version:
                literal:
                  value: stable-v1
    spec:
      containers:
        - name: my-service
          image: my-service:v1
---
# Canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-canary
spec:
  template:
    metadata:
      labels:
        app: my-service
        version: v2
      annotations:
        proxy.istio.io/config: |
          tracing:
            custom_tags:
              deployment_version:
                literal:
                  value: canary-v2
    spec:
      containers:
        - name: my-service
          image: my-service:v2
```

## Verifying Custom Tags

After applying the configuration, generate a trace and check it:

```bash
# Generate a request with custom headers
kubectl exec deploy/sleep -- curl -s \
  -H "X-Tenant-Id: acme-corp" \
  -H "X-App-Version: 2.5.1" \
  http://my-service:8080/api/test

# Check Jaeger/Zipkin for the trace
# The custom tags should appear as span attributes
```

You can also verify the proxy config:

```bash
istioctl proxy-config bootstrap deploy/my-service -o json | grep -A20 "custom_tags\|customTags"
```

## Tag Naming Best Practices

A few guidelines for naming your custom tags:

- Use dot notation for namespacing: `tenant.id`, `deployment.version`, `request.priority`
- Keep names consistent across services
- Use lowercase with dots or underscores, not camelCase
- Avoid overly long tag names since they add overhead to every span
- Don't put high-cardinality values (like user IDs) as tags unless your backend handles it well - some tracing backends create indexes per unique tag value

## Performance Considerations

Each custom tag adds a small amount of data to every span. With reasonable tag counts (5-10 custom tags), the overhead is negligible. But if you add 50 custom tags each containing long header values, the per-span size increases noticeably.

Header-based tags are slightly more expensive than literal tags because Envoy has to look up the header value for each request. Environment variable tags are evaluated once at startup and cached.

## Summary

Custom span tags turn generic traces into rich, searchable debugging tools. Use the Telemetry API for mesh-wide and namespace-level tags, pod annotations for deployment-specific tags, and header-based tags for request-level context like tenant IDs and API versions. The tags you add should reflect the dimensions you actually use when debugging - think about what you filter by when investigating production issues, and make sure those values are captured in your spans.
