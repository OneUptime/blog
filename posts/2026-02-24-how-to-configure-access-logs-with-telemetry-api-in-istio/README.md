# How to Configure Access Logs with Telemetry API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Access Logs, Envoy, Configuration

Description: How to use Istio's Telemetry API to configure access logging with fine-grained control over providers, filters, and per-workload settings.

---

The Telemetry API is Istio's modern approach to configuring observability features like access logging, metrics, and tracing. It replaced the older method of configuring everything through the mesh config or EnvoyFilter resources. The big advantage is that the Telemetry API is a proper Kubernetes custom resource, which means you can apply it at the mesh, namespace, or workload level with standard Kubernetes RBAC and GitOps workflows.

## Telemetry API Basics

The Telemetry API resource lives in the `telemetry.istio.io/v1` API group. For access logging, you work with the `accessLogging` section:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: my-logging-config
  namespace: istio-system  # mesh-wide when in the root namespace
spec:
  accessLogging:
    - providers:
        - name: envoy
```

The `providers` field specifies where logs are sent. The built-in `envoy` provider writes logs to the sidecar's stdout, which is the standard approach for Kubernetes log collection.

## Scope Levels

### Mesh-Wide Configuration

Place the Telemetry resource in the Istio root namespace (usually `istio-system`) to apply it to all workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

### Namespace-Level Configuration

Place it in a specific namespace to apply only to workloads in that namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: namespace-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
```

### Workload-Level Configuration

Use the `selector` field to target specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-gateway-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  accessLogging:
    - providers:
        - name: envoy
```

The most specific configuration wins. A workload-level config overrides a namespace-level config, which overrides the mesh-wide config.

## Configuring Access Log Providers

The `envoy` provider is built in, but you can define custom providers in the mesh config. This is how you configure providers like OpenTelemetry:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-access-log
        envoyOtelAls:
          service: otel-collector.istio-system.svc.cluster.local
          port: 4317
      - name: custom-file-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            text: "[%START_TIME%] %REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %RESPONSE_CODE% %DURATION%ms\n"
```

Now you can reference these providers in your Telemetry resources:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-access-log
```

## Custom Log Formats via Provider Configuration

For JSON formatting through the Telemetry API, define the format in the extension provider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: json-access-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              timestamp: "%START_TIME%"
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
              upstream_cluster: "%UPSTREAM_CLUSTER%"
              request_id: "%REQ(X-REQUEST-ID)%"
              authority: "%REQ(:AUTHORITY)%"
              source_namespace: "%ENVIRONMENT(POD_NAMESPACE)%"
```

Then reference it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: json-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: json-access-log
```

## Filtering Access Logs

One of the most powerful features of the Telemetry API is filtering. You can log only errors, only slow requests, or apply any condition based on the CEL (Common Expression Language) expression:

### Log Only Errors

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: errors-only
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

### Log Only Slow Requests

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: slow-requests
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.duration > duration('1s')"
```

### Log Only Server Errors on Specific Paths

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-errors
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500 && request.url_path.startsWith('/api/')"
```

## Multiple Providers

You can send logs to multiple destinations by listing multiple providers:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: multi-provider-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
        - name: otel-access-log
```

This sends the same log entries to both stdout and the OpenTelemetry collector.

You can also have different configurations for different providers:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: differentiated-logging
  namespace: production
spec:
  accessLogging:
    # Log everything to stdout for kubectl logs
    - providers:
        - name: envoy
    # Log only errors to the OTel collector for long-term storage
    - providers:
        - name: otel-access-log
      filter:
        expression: "response.code >= 500"
```

## Disabling Access Logs

To disable access logging for a specific namespace while it is enabled mesh-wide:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-logging
  namespace: noisy-namespace
spec:
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

To disable for a specific workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: high-traffic-service
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

## CEL Expression Reference

The filter expression uses CEL with these available attributes:

| Expression | Type | Description |
|------------|------|-------------|
| `response.code` | int | HTTP response code |
| `response.duration` | duration | Request duration |
| `response.size` | int | Response body size |
| `request.url_path` | string | Request URL path |
| `request.host` | string | Request host header |
| `request.method` | string | HTTP method |
| `request.size` | int | Request body size |
| `connection.mtls` | bool | Whether mTLS was used |

You can combine these with standard CEL operators:

```yaml
# Log errors or slow requests
filter:
  expression: "response.code >= 500 || response.duration > duration('2s')"

# Log non-health-check requests that failed
filter:
  expression: "response.code >= 400 && !request.url_path.startsWith('/healthz')"
```

## Verifying Configuration

Check that your Telemetry resources are applied correctly:

```bash
# List all Telemetry resources
kubectl get telemetry -A

# Check a specific resource
kubectl describe telemetry mesh-default -n istio-system

# Verify the Envoy configuration was pushed
istioctl proxy-config log deploy/my-service --level debug
kubectl logs deploy/my-service -c istio-proxy | head -20
```

## Precedence Rules

When multiple Telemetry resources apply to the same workload:

1. Workload-specific (with selector) takes highest priority
2. Namespace-level takes second priority
3. Mesh-wide (root namespace) takes lowest priority

If there are multiple Telemetry resources at the same scope level in the same namespace, the behavior is undefined. Avoid creating conflicting resources at the same level.

The Telemetry API gives you much more control than the old mesh config approach. The combination of scope levels, custom providers, and CEL-based filtering means you can build an access logging strategy that captures exactly what you need without drowning in log volume.
