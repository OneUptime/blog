# How to Configure Access Logging per Workload in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Telemetry API, Per-Workload, Configuration

Description: How to enable, disable, and customize Istio access logging on a per-workload basis using the Telemetry API and workload selectors.

---

Not every workload in your mesh needs the same access logging configuration. Your API gateway probably needs detailed logging for debugging and compliance. Your internal health-check service probably does not need any logging at all. A high-traffic data pipeline might need error-only logging to avoid drowning your log aggregation system.

Istio's Telemetry API makes per-workload logging configuration straightforward. You can set mesh-wide defaults and then override them for specific namespaces or individual workloads.

## The Hierarchy

Istio's Telemetry API uses a three-level hierarchy:

1. **Mesh-wide** - Telemetry resource in the root namespace (istio-system)
2. **Namespace-level** - Telemetry resource in a specific namespace without a selector
3. **Workload-level** - Telemetry resource in a specific namespace with a selector

More specific configurations override less specific ones. A workload-level config beats a namespace-level config, which beats the mesh-wide config.

## Setting Mesh-Wide Defaults

Start with a baseline. This enables access logging for everything:

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

Or if you want error-only logging as the default:

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
      filter:
        expression: "response.code >= 400"
```

## Enabling Full Logging for Specific Workloads

Override the mesh default for workloads that need more detail:

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

This enables full access logging (no filter) for the api-gateway workload, even though the mesh default might be error-only.

## Disabling Logging for Specific Workloads

For noisy workloads that generate too many logs:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-healthcheck-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: health-checker
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

## Different Filters for Different Workloads

You might want different filtering rules per workload:

```yaml
# API Gateway: log everything (customer-facing, needs full audit trail)
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
---
# Payment service: log errors and slow requests (critical path)
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > duration('500ms')"
---
# Recommendation service: errors only (non-critical, high traffic)
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: recommendation-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: recommendation-service
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"
---
# Cache proxy: no logging (extremely high traffic, low value)
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: cache-no-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: redis-proxy
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

## Different Providers for Different Workloads

You can send different workloads' logs to different backends. First, define multiple providers:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: stdout-json
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              response_code: "%RESPONSE_CODE%"
              duration_ms: "%DURATION%"
              request_id: "%REQ(X-REQUEST-ID)%"
      - name: detailed-stdout-json
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
              response_code_details: "%RESPONSE_CODE_DETAILS%"
              bytes_received: "%BYTES_RECEIVED%"
              bytes_sent: "%BYTES_SENT%"
              duration_ms: "%DURATION%"
              upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
              upstream_host: "%UPSTREAM_HOST%"
              upstream_cluster: "%UPSTREAM_CLUSTER%"
              downstream_remote_address: "%DOWNSTREAM_REMOTE_ADDRESS%"
              request_id: "%REQ(X-REQUEST-ID)%"
              authority: "%REQ(:AUTHORITY)%"
              user_agent: "%REQ(USER-AGENT)%"
              trace_id: "%REQ(X-B3-TRACEID)%"
              pod_name: "%ENVIRONMENT(POD_NAME)%"
              pod_namespace: "%ENVIRONMENT(POD_NAMESPACE)%"
      - name: otel-collector
        envoyOtelAls:
          service: otel-collector.logging.svc.cluster.local
          port: 4317
```

Then assign providers per workload:

```yaml
# Most services: minimal JSON logging
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: stdout-json
      filter:
        expression: "response.code >= 400"
---
# Critical services: detailed logging + OTel export
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
        - name: detailed-stdout-json
        - name: otel-collector
```

## Namespace-Level Overrides

Apply logging configuration to all workloads in a namespace:

```yaml
# Development namespace: full logging for debugging
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: dev-logging
  namespace: development
spec:
  accessLogging:
    - providers:
        - name: envoy
---
# Load testing namespace: no logging
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: loadtest-no-logging
  namespace: load-test
spec:
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

## Temporary Debugging Configuration

When you need to temporarily enable detailed logging for a specific workload during an incident:

```bash
# Create a temporary Telemetry resource
kubectl apply -f - <<EOF
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-my-service
  namespace: production
  annotations:
    debug-reason: "Investigating ticket INC-1234"
    debug-created-by: "oncall-engineer"
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: envoy
EOF
```

When done:

```bash
kubectl delete telemetry debug-my-service -n production
```

## Verifying Configuration

Check which Telemetry resources apply to a specific workload:

```bash
# List all Telemetry resources across namespaces
kubectl get telemetry -A

# Check the effective configuration for a specific pod
istioctl proxy-config log deploy/my-service -n production
```

To verify that logging is actually working:

```bash
# Generate traffic
kubectl exec deploy/sleep -- curl -s my-service.production:8080/test

# Check for log output
kubectl logs deploy/my-service -n production -c istio-proxy --tail=5
```

If you are not seeing logs, check:
1. Is there a Telemetry resource that disables logging at a higher scope?
2. Is the selector matching the correct labels?
3. Is the provider name correct?

```bash
# Check workload labels
kubectl get pods -n production -l app=my-service --show-labels

# Check Telemetry resources that could apply
kubectl get telemetry -n production
kubectl get telemetry -n istio-system
```

## Managing Configuration at Scale

For large clusters, managing individual Telemetry resources can become unwieldy. Some strategies:

- **Use labels consistently.** If all services have a `logging-tier` label, you can create Telemetry resources per tier rather than per service.
- **Store configs in Git.** Treat Telemetry resources like any other Kubernetes manifest in your GitOps workflow.
- **Document the hierarchy.** Make it clear to your team what the mesh-wide defaults are and when to create overrides.
- **Audit regularly.** Temporary debug configs have a way of becoming permanent. Set up reminders or use TTL annotations.

Per-workload access logging is one of the most practical features of Istio's Telemetry API. It lets you balance observability needs with cost and performance constraints across your entire mesh.
