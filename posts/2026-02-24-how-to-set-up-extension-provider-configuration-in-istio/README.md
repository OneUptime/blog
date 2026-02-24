# How to Set Up Extension Provider Configuration in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Extension Providers, Envoy, Observability, Kubernetes

Description: How to configure extension providers in Istio for custom telemetry backends, external authorization, and rate limiting.

---

Extension providers are Istio's mechanism for plugging in external services and backends. They let you connect Istio to custom authorization services, telemetry backends, rate limiters, and other external systems without modifying the proxy configuration directly. Instead of writing EnvoyFilter resources, you define a provider once and reference it from higher-level APIs like Telemetry and AuthorizationPolicy.

Here is how to set up and use extension providers effectively.

## Understanding Extension Providers

Extension providers live in the `extensionProviders` section of the Istio mesh configuration. Each provider has a name and a type-specific configuration. Once defined, the provider can be referenced by name in Telemetry resources, AuthorizationPolicy resources, and other Istio APIs.

Think of it as a registry of external services that Istio can interact with.

## Defining Extension Providers

Providers are defined in the mesh config. You can set them during installation or update them later:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      # OpenTelemetry trace provider
      - name: otel-tracing
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317

      # Zipkin trace provider
      - name: zipkin
        zipkin:
          service: zipkin.observability.svc.cluster.local
          port: 9411

      # Access log providers
      - name: otel-access-log
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317

      - name: file-access-log
        envoyFileAccessLog:
          path: /dev/stdout

      # External authorization provider
      - name: ext-authz
        envoyExtAuthzGrpc:
          service: auth-service.auth.svc.cluster.local
          port: 50051
          timeout: 2s
          failOpen: false

      # HTTP external authorization
      - name: ext-authz-http
        envoyExtAuthzHttp:
          service: auth-service.auth.svc.cluster.local
          port: 8080
          pathPrefix: /auth
          headersToUpstreamOnAllow:
            - x-user-id
            - x-user-role
          headersToDownstreamOnDeny:
            - x-auth-error
          includeRequestHeadersInCheck:
            - authorization
            - cookie
```

You can also update the mesh config on a running cluster:

```bash
kubectl edit configmap istio -n istio-system
```

Find the `mesh` key and add your providers to the `extensionProviders` list. After editing, the change propagates to proxies automatically (though new connections pick it up faster than existing ones).

## Telemetry Extension Providers

The most common use of extension providers is for telemetry. Here are the telemetry provider types and how to use them.

### Trace Providers

```yaml
# Define the provider
- name: tempo-traces
  opentelemetry:
    service: tempo.observability.svc.cluster.local
    port: 4317
    resource_detectors:
      - environment
```

Reference it in a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: tempo-traces
      randomSamplingPercentage: 5.0
      customTags:
        env:
          literal:
            value: "production"
```

### Access Log Providers

For sending access logs to an OpenTelemetry collector:

```yaml
# Define the provider
- name: otel-als
  envoyOtelAls:
    service: otel-collector.observability.svc.cluster.local
    port: 4317
    logFormat:
      labels:
        source: "%REQ(X-FORWARDED-FOR)%"
        destination: "%UPSTREAM_HOST%"
```

Use it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: otel-als
      filter:
        expression: "response.code >= 500"
```

### Custom File Access Logs

File-based access logs with custom format:

```yaml
# Define the provider
- name: json-access-log
  envoyFileAccessLog:
    path: /dev/stdout
    logFormat:
      labels:
        start_time: "%START_TIME%"
        method: "%REQ(:METHOD)%"
        path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
        protocol: "%PROTOCOL%"
        response_code: "%RESPONSE_CODE%"
        response_flags: "%RESPONSE_FLAGS%"
        bytes_received: "%BYTES_RECEIVED%"
        bytes_sent: "%BYTES_SENT%"
        duration: "%DURATION%"
        upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
        upstream_host: "%UPSTREAM_HOST%"
        source_principal: "%DOWNSTREAM_PEER_URI_SAN%"
```

This outputs structured JSON logs to stdout, which your log collector can pick up.

## Authorization Extension Providers

Extension providers also power external authorization. This is incredibly useful for integrating custom auth services.

### gRPC External Authorization

```yaml
- name: custom-ext-authz
  envoyExtAuthzGrpc:
    service: ext-authz.auth.svc.cluster.local
    port: 50051
    timeout: 3s
    failOpen: false
    statusOnError: "503"
```

Reference it in an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: CUSTOM
  provider:
    name: custom-ext-authz
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
```

### HTTP External Authorization

For auth services that speak HTTP instead of gRPC:

```yaml
- name: http-ext-authz
  envoyExtAuthzHttp:
    service: auth-service.auth.svc.cluster.local
    port: 8080
    pathPrefix: /check
    headersToUpstreamOnAllow:
      - x-auth-user
      - x-auth-role
      - x-auth-scope
    headersToDownstreamOnDeny:
      - www-authenticate
    includeRequestHeadersInCheck:
      - authorization
      - cookie
      - x-forwarded-for
    includeAdditionalHeadersInCheck:
      x-auth-check-source: "istio"
```

The configuration options let you control exactly which headers flow between the auth service and the upstream:

- `headersToUpstreamOnAllow` - Headers from the auth response to forward to the upstream service
- `headersToDownstreamOnDeny` - Headers from the auth response to send back to the client on deny
- `includeRequestHeadersInCheck` - Which original request headers to send to the auth service
- `includeAdditionalHeadersInCheck` - Extra headers to add to the auth check request

## Updating Providers Without Downtime

You can update extension provider configuration without restarting Istio:

```bash
# Get current mesh config
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' > mesh.yaml

# Edit the file
# ... make your changes ...

# Apply the updated config
kubectl create configmap istio -n istio-system --from-file=mesh=mesh.yaml --dry-run=client -o yaml | kubectl apply -f -
```

The updated configuration propagates to proxies through xDS. New connections will use the updated provider configuration.

## Validating Provider Configuration

After adding or updating providers, validate:

```bash
# Check the mesh config
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 10 extensionProviders

# Run analysis
istioctl analyze -n istio-system

# Check proxy config for a specific workload
istioctl proxy-config listener deploy/my-service -o json | grep -i "ext_authz\|otel\|access_log"
```

Test that the external service is reachable from a proxy:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -v ext-authz.auth.svc.cluster.local:50051
```

## Best Practices

1. **Name providers descriptively** - Use names like `otel-tracing-production` instead of `provider1`
2. **Set appropriate timeouts** - Especially for auth providers, a hung auth service should not hang all traffic
3. **Use failOpen carefully** - For auth providers, `failOpen: false` is safer but can cause outages if the auth service goes down
4. **Keep providers in version control** - The mesh config should be managed through GitOps, not edited manually
5. **Test provider connectivity** - Before referencing a provider, make sure the service is running and accessible

Extension providers are the clean way to integrate external services with your Istio mesh. Once you have providers defined, the Telemetry and AuthorizationPolicy APIs make it straightforward to control what data flows where.
