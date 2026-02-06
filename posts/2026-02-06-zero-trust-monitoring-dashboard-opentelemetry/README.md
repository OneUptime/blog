# How to Build a Zero Trust Network Monitoring Dashboard with OpenTelemetry and Service Mesh Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Zero Trust, Service Mesh, Istio

Description: Build a zero trust network monitoring dashboard by combining OpenTelemetry with service mesh telemetry from Istio or Linkerd.

Zero trust networking is built on the principle of "never trust, always verify." Every request between services must be authenticated and authorized, regardless of where it originates. Service meshes like Istio and Linkerd enforce these policies at the network layer, but monitoring whether they work correctly requires telemetry.

This post shows you how to combine OpenTelemetry application traces with service mesh telemetry to build a dashboard that gives you full visibility into your zero trust posture.

## What We Are Monitoring

A zero trust monitoring dashboard needs to answer these questions:

- Are all service-to-service calls using mTLS?
- Which requests are being denied by authorization policies?
- Are there any services communicating that should not be?
- What is the authentication success and failure rate per service pair?

Istio already generates telemetry for most of these. The trick is getting that data into the same system as your application-level OpenTelemetry data.

## Configuring Istio to Export via OTLP

Istio 1.20 and later supports exporting telemetry in OpenTelemetry format. Configure this in the Istio mesh config:

```yaml
# istio-mesh-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        openCensusBridge:
          enabled: false
    extensionProviders:
      - name: otel-collector
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
    defaultProviders:
      tracing:
        - otel-collector
      metrics:
        - otel-collector
```

This tells every Envoy sidecar in the mesh to send trace and metric data to your OpenTelemetry Collector.

## Collector Configuration for Mesh Telemetry

Set up the Collector to receive both application OTLP data and Istio telemetry, then enrich the data with zero-trust-relevant attributes:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Scrape Envoy metrics from Istio sidecars
  prometheus:
    config:
      scrape_configs:
        - job_name: 'envoy-stats'
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: true

processors:
  # Add zero trust classification attributes
  transform:
    metric_statements:
      - context: datapoint
        statements:
          # Tag whether the connection used mTLS
          - set(attributes["zero_trust.mtls_enabled"],
              attributes["connection_security_policy"] == "mutual_tls")

          # Classify denied requests
          - set(attributes["zero_trust.access_decision"], "denied")
            where attributes["response_code"] == "403"

          - set(attributes["zero_trust.access_decision"], "allowed")
            where attributes["response_code"] != "403"

    trace_statements:
      - context: span
        statements:
          - set(attributes["zero_trust.source_principal"],
              attributes["upstream_peer.spiffe_id"])
          - set(attributes["zero_trust.destination_principal"],
              attributes["downstream_peer.spiffe_id"])

exporters:
  otlp:
    endpoint: "https://otel-backend.yourdomain.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform]
      exporters: [otlp]
    metrics:
      receivers: [otlp, prometheus]
      processors: [transform]
      exporters: [otlp]
```

## Application-Side Instrumentation

On the application side, add span attributes that capture authentication and authorization decisions:

```go
package middleware

import (
    "net/http"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("zero-trust-middleware")

// AuthzMiddleware records authorization decisions on the current span
func AuthzMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        span := trace.SpanFromContext(r.Context())

        // Extract the identity from the mTLS certificate
        // (populated by the service mesh sidecar)
        peerIdentity := r.Header.Get("X-Forwarded-Client-Cert")
        span.SetAttributes(
            attribute.String("zero_trust.peer_identity", peerIdentity),
            attribute.String("zero_trust.request_path", r.URL.Path),
            attribute.String("zero_trust.request_method", r.Method),
        )

        // Check authorization
        allowed, reason := checkAuthorization(peerIdentity, r.URL.Path, r.Method)
        span.SetAttributes(
            attribute.Bool("zero_trust.authorized", allowed),
            attribute.String("zero_trust.authz_reason", reason),
        )

        if !allowed {
            span.AddEvent("authorization.denied", trace.WithAttributes(
                attribute.String("peer", peerIdentity),
                attribute.String("resource", r.URL.Path),
                attribute.String("reason", reason),
            ))
            http.Error(w, "Forbidden", http.StatusForbidden)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func checkAuthorization(identity, path, method string) (bool, string) {
    // Your RBAC or policy check logic here
    // This could call an OPA endpoint, check a local policy file, etc.
    return true, "policy-default-allow"
}
```

## Building the Dashboard

With all this data flowing into your observability backend, you can build a dashboard with these panels:

**mTLS Coverage**: Query for the percentage of connections where `zero_trust.mtls_enabled` is true versus false. Any false values indicate unencrypted service-to-service traffic.

```promql
# Percentage of requests using mTLS
sum(rate(istio_requests_total{connection_security_policy="mutual_tls"}[5m]))
/
sum(rate(istio_requests_total[5m]))
* 100
```

**Authorization Denials by Service Pair**: Group denied requests by source and destination to spot policy misconfigurations or attack attempts.

```promql
# Top denied service-to-service pairs
topk(10,
  sum by (source_workload, destination_workload) (
    rate(istio_requests_total{response_code="403"}[5m])
  )
)
```

**Unexpected Communication Paths**: Compare actual service-to-service communication against your expected service graph. Any pair that shows traffic but is not in your expected map deserves investigation.

**Authentication Failure Trends**: Track the rate of authentication failures over time. A sudden spike could indicate a compromised service identity or certificate issue.

## Summary

The combination of Istio service mesh telemetry and OpenTelemetry application instrumentation gives you complete visibility into your zero trust posture. The service mesh tells you about network-level enforcement (mTLS, authorization policies), while the application-level spans tell you about the business logic decisions. Bringing both into a single dashboard means you can verify that your zero trust architecture is working as designed, and catch problems when it is not.
