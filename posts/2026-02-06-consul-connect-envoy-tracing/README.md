# How to Configure OpenTelemetry Distributed Tracing in Consul Connect Envoy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Consul Connect, Envoy, Distributed Tracing, Service Mesh

Description: Configure Consul Connect Envoy sidecar proxies to export OpenTelemetry distributed traces for full service mesh observability.

Consul Connect uses Envoy as its sidecar proxy, and Envoy has built-in support for distributed tracing. Envoy's OpenTelemetry tracer is currently marked work-in-progress by the Envoy project and is not intended for production use, so treat this setup as an experimental option; for production Consul tracing, HashiCorp's current documentation still recommends supported Envoy tracers such as Zipkin. When configured, Envoy can export proxy spans so you get visibility into service-to-service calls flowing through the mesh.

## How It Works

When a request flows through Consul Connect:

1. The client's Envoy sidecar creates a span for the outbound request
2. The request travels through the mesh to the destination
3. The destination's Envoy sidecar creates a span for the inbound request
4. Both sidecars export their spans to the OpenTelemetry Collector

This gives you mesh-level traces showing the proxy hops in your service mesh. For true end-to-end traces that include application work, the applications still need to propagate trace context and create their own spans.

## Configuring Consul for Tracing

Add tracing configuration to your Consul proxy defaults:

```hcl
# consul-proxy-defaults.hcl

Kind = "proxy-defaults"
Name = "global"
Config {
  # Tracing is only generated for HTTP, HTTP/2, and gRPC service traffic
  protocol = "http"

  # Tell Envoy to use the OpenTelemetry tracer
  envoy_tracing_json = <<EOF
{
  "http": {
    "name": "envoy.tracers.opentelemetry",
    "typedConfig": {
      "@type": "type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig",
      "grpc_service": {
        "envoy_grpc": {
          "cluster_name": "otel_collector"
        },
        "timeout": "1s"
      },
      "service_name": "consul-envoy"
    }
  }
}
EOF

  # Define the OTel Collector cluster
  envoy_extra_static_clusters_json = <<EOF
{
  "name": "otel_collector",
  "type": "STRICT_DNS",
  "connect_timeout": "3s",
  "lb_policy": "ROUND_ROBIN",
  "typed_extension_protocol_options": {
    "envoy.extensions.upstreams.http.v3.HttpProtocolOptions": {
      "@type": "type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions",
      "explicit_http_config": {
        "http2_protocol_options": {}
      }
    }
  },
  "load_assignment": {
    "cluster_name": "otel_collector",
    "endpoints": [
      {
        "lb_endpoints": [
          {
            "endpoint": {
              "address": {
                "socket_address": {
                  "address": "otel-collector.observability.svc.cluster.local",
                  "port_value": 4317
                }
              }
            }
          }
        ]
      }
    ]
  }
}
EOF
}
```

Apply the configuration:

```bash
consul config write consul-proxy-defaults.hcl
```

Because this changes Envoy bootstrap and listener configuration, restart the affected sidecar proxies after writing the Consul config.

## Per-Service Tracing Configuration

Override tracing settings for specific services:

```hcl
# service-tracing.hcl
Kind = "service-defaults"
Name = "payment-service"
Protocol = "http"
Config {
  envoy_tracing_json = <<EOF
{
  "http": {
    "name": "envoy.tracers.opentelemetry",
    "typedConfig": {
      "@type": "type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig",
      "grpc_service": {
        "envoy_grpc": {
          "cluster_name": "otel_collector"
        }
      },
      "service_name": "payment-service-envoy"
    }
  }
}
EOF
}
```

## OpenTelemetry Collector Configuration

Configure the Collector to receive traces from Envoy sidecars and enrich them with Consul metadata:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # Add mesh metadata
  resource/mesh:
    attributes:
      - key: mesh.name
        value: "consul-connect"
        action: upsert
      - key: mesh.datacenter
        value: "dc1"
        action: upsert

  # Extract service name from Envoy span attributes
  transform/envoy:
    trace_statements:
      - context: span
        statements:
          # Map Envoy-specific attributes to OTel conventions
          - set(attributes["http.request.method"], attributes["request.method"]) where attributes["request.method"] != nil
          - set(attributes["url.path"], attributes["request.path"]) where attributes["request.path"] != nil
          - set(attributes["http.response.status_code"], attributes["response.code"]) where attributes["response.code"] != nil

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource/mesh, transform/envoy, batch]
      exporters: [otlp]
```

## Kubernetes Deployment

If running on Kubernetes, deploy the OTel Collector as a service in the cluster:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
  selector:
    app: otel-collector
```

Envoy sidecars will resolve `otel-collector.observability.svc.cluster.local` and send traces there.

## Controlling Trace Sampling at the Mesh Level

Envoy supports trace sampling configuration. In Consul, use `envoy_listener_tracing_json` to set HTTP connection manager tracing options such as `random_sampling` and `overall_sampling`:

```hcl
Kind = "proxy-defaults"
Name = "global"
Config {
  # Sample up to 10% of traces on HTTP listeners
  envoy_listener_tracing_json = <<EOF
{
  "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager.Tracing",
  "random_sampling": {
    "numerator": 10,
    "denominator": "HUNDRED"
  },
  "overall_sampling": {
    "numerator": 10,
    "denominator": "HUNDRED"
  },
  "provider": {
    "name": "envoy.tracers.opentelemetry",
    "typed_config": {
      "@type": "type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig",
      "grpc_service": {
        "envoy_grpc": {
          "cluster_name": "otel_collector"
        }
      },
      "service_name": "consul-envoy"
    }
  }
}
EOF
}
```

You can also control sampling at the Collector level with the probabilistic sampler processor, which gives you more flexibility:

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10
```

## Trace Context Propagation

Envoy propagates the tracing headers used by the configured tracer. For the OpenTelemetry tracer, make sure your applications propagate W3C Trace Context headers for end-to-end traces that span both mesh-level and application-level instrumentation:

```text
Client App -> Client Envoy Sidecar -> Server Envoy Sidecar -> Server App
   (app span)    (envoy span)           (envoy span)         (app span)
```

All four spans share the same trace ID, giving you a complete picture of the request lifecycle.

## Verifying the Setup

Check that Envoy is configured correctly:

```bash
# Check Envoy admin interface for the tracing config
curl http://localhost:19000/config_dump | jq '.. | objects | select(has("tracing")) | .tracing'

# Verify the OTel Collector cluster is connected
curl http://localhost:19000/clusters | grep otel_collector
```

Distributed tracing through Consul Connect gives you visibility into the mesh layer that is normally invisible to your applications. You can see exactly how requests flow between services, identify slow hops, and pinpoint mesh-level issues like TLS handshake delays or connection timeouts.
