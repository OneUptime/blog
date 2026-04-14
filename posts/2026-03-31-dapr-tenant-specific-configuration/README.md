# How to Implement Tenant-Specific Configuration with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Multi-Tenancy, Kubernetes, Feature Flag

Description: Implement tenant-specific Dapr configuration by deploying namespace-scoped Configuration CRDs to control tracing, middleware, metrics, and feature flags per tenant.

---

## Dapr Configuration Scope

Dapr's Configuration CRD controls runtime behavior for all apps that reference it: tracing sampling rates, middleware pipelines, mTLS settings, and feature flags. In a multi-tenant system, each tenant may need different configuration - for example, a premium tenant with higher trace sampling or different rate limiting.

## Creating Tenant-Specific Configuration CRDs

Deploy a Configuration resource per tenant namespace:

```yaml
# Tenant A - premium plan, full tracing
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tenant-config
  namespace: tenant-a
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.observability:9411/api/v2/spans"
  metrics:
    enabled: true
  features:
  - name: HotReload
    enabled: true
```

```yaml
# Tenant B - basic plan, reduced overhead
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tenant-config
  namespace: tenant-b
spec:
  tracing:
    samplingRate: "0.1"
  metrics:
    enabled: false
  features:
  - name: HotReload
    enabled: false
```

Both use the same config name `tenant-config` but live in different namespaces.

## Referencing the Configuration from Applications

Apps reference the configuration by name - namespace is inferred from the pod's namespace:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "orders-api"
  dapr.io/config: "tenant-config"
```

## Adding Tenant-Specific Middleware

Configure different middleware pipelines per tenant using the Configuration's HTTP pipeline:

```yaml
# Tenant A - with rate limiting middleware
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tenant-config
  namespace: tenant-a
spec:
  httpPipeline:
    handlers:
    - name: ratelimit
      type: middleware.http.ratelimit
    - name: oauth2
      type: middleware.http.oauth2
```

Deploy the corresponding middleware components in the same namespace:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
  namespace: tenant-a
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: "100"
```

## Implementing Feature Flags via Configuration

Use Dapr's alpha feature flags to enable/disable capabilities per tenant:

```yaml
spec:
  features:
  - name: ActorStateTTL
    enabled: true
  - name: WorkflowsClusteredDeployment
    enabled: false
```

Note that Dapr's Configuration CRD settings are applied at sidecar startup and cannot be queried at runtime via an HTTP API. The `/v1.0/configuration/` API endpoint is for the Configuration building block, which reads from external configuration stores — not the sidecar's own Configuration CRD.

## Automating Configuration Deployment

Use a Helm chart per tenant to deploy namespace + Configuration together:

```bash
helm install tenant-a ./tenant-chart \
  --set tenant.id=tenant-a \
  --set tenant.plan=premium \
  --set tracing.samplingRate=1 \
  --namespace tenant-a \
  --create-namespace
```

## Summary

Dapr's namespace-scoped Configuration CRD enables per-tenant runtime behavior including tracing rates, middleware pipelines, and feature flags. Deploy identical CRD names in each tenant namespace so applications use consistent references while getting tenant-specific behavior. Use Helm charts to manage the lifecycle of tenant configurations consistently across environments.
