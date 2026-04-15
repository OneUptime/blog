# How to Write Dapr Configuration YAML Specifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, YAML, Tracing, Middleware

Description: Learn how to write Dapr Configuration YAML specifications to control tracing, metrics, middleware, and feature flags for your Dapr runtime.

---

## What Is a Dapr Configuration Resource?

A Dapr `Configuration` YAML lets you customize the behavior of the Dapr sidecar for one or more applications. It covers tracing settings, metrics, API access, middleware pipelines, and secret store defaults.

## Minimal Configuration YAML

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: production
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin.monitoring:9411/api/v2/spans
```

Reference the configuration from your Deployment pod annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "appconfig"
```

## Enabling Metrics

```yaml
spec:
  metrics:
    enabled: true
    http:
      increasedCardinality: false
      pathMatching:
        - /healthz
        - /orders/{id}
      excludeVerbs: false
```

## Configuring Middleware Pipelines

Middleware chains run on HTTP traffic. Reference component names in `httpPipeline` and `appHttpPipeline`:

```yaml
spec:
  httpPipeline:
    handlers:
      - name: oauth2
        type: middleware.http.oauth2
      - name: ratelimit
        type: middleware.http.ratelimit
  appHttpPipeline:
    handlers:
      - name: bearer
        type: middleware.http.bearer
```

## Restricting API Access

Use `api.allowed` to permit only specific Dapr building-block APIs for an app, blocking all others:

```yaml
spec:
  api:
    allowed:
      - name: state
        version: v1.0
        protocol: http
      - name: invoke
        version: v1.0
        protocol: grpc
```

## Secret Store Defaults

```yaml
spec:
  secrets:
    scopes:
      - storeName: vault
        defaultAccess: deny
        allowedSecrets:
          - db-password
          - api-key
```

## Feature Flags

Enable or disable preview features:

```yaml
spec:
  features:
    - name: ActorStateTTL
      enabled: true
    - name: HotReload
      enabled: true
```

## Applying the Configuration

```bash
kubectl apply -f appconfig.yaml -n production

# Verify the configuration was accepted
kubectl get configuration appconfig -n production -o yaml
```

## Summary

Dapr Configuration YAML specs give you fine-grained control over the sidecar behavior without touching application code. Centralizing tracing, middleware, API restrictions, and feature flags in a single resource makes your cluster configuration auditable and consistent across deployments.
