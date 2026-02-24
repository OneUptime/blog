# How to Monitor External Service Traffic with ServiceEntry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Monitoring, Prometheus, Observability, Service Mesh

Description: Monitor and observe external service traffic in Istio using ServiceEntry with Prometheus metrics, Grafana dashboards, Kiali, and access logging.

---

One of the biggest wins of registering external services with ServiceEntry is the observability you gain. Without ServiceEntry, external traffic shows up as "PassthroughCluster" in your metrics - a black box that tells you nothing about which services your pods are calling, how fast those calls are, or how often they fail.

With ServiceEntry, every external service gets proper metrics, access logs, and service graph visibility. You can track latency trends, set up alerts on error rates, and build dashboards that show your entire dependency chain including external services.

## What Metrics You Get

The metrics you receive depend on the protocol and how Envoy handles the traffic:

**HTTP/gRPC traffic (L7 metrics):**
- Request count per response code
- Request duration histograms
- Request/response size
- Source and destination labels

**HTTPS passthrough / TCP traffic (L4 metrics):**
- Connection count
- Bytes sent/received
- Connection duration
- TCP connection open/close events

You get L7 metrics when Envoy can see the HTTP layer. This happens with plain HTTP or when you use TLS origination (Envoy terminates and re-originates TLS). For HTTPS passthrough, Envoy only sees encrypted bytes, so you get L4 metrics.

## Prometheus Metrics for External Services

After creating a ServiceEntry, Istio automatically generates metrics. Here are the key ones:

### Request-Level Metrics (HTTP/gRPC)

```bash
# Total requests to an external service
istio_requests_total{
  destination_service="api.stripe.com",
  response_code="200"
}

# Request duration histogram
istio_request_duration_milliseconds_bucket{
  destination_service="api.stripe.com",
  le="500"
}

# Request size
istio_request_bytes_bucket{
  destination_service="api.stripe.com"
}

# Response size
istio_response_bytes_bucket{
  destination_service="api.stripe.com"
}
```

### TCP-Level Metrics

```bash
# TCP connections opened
istio_tcp_connections_opened_total{
  destination_service="database.external.com"
}

# TCP connections closed
istio_tcp_connections_closed_total{
  destination_service="database.external.com"
}

# Bytes sent
istio_tcp_sent_bytes_total{
  destination_service="database.external.com"
}

# Bytes received
istio_tcp_received_bytes_total{
  destination_service="database.external.com"
}
```

## Useful PromQL Queries

Here are practical queries you can use for monitoring external services.

**Error rate for an external API:**

```promql
sum(rate(istio_requests_total{
  destination_service="api.stripe.com",
  response_code=~"5.*"
}[5m]))
/
sum(rate(istio_requests_total{
  destination_service="api.stripe.com"
}[5m]))
```

**P99 latency to an external service:**

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service="api.stripe.com"
  }[5m])) by (le)
)
```

**Request rate per external service:**

```promql
sum by (destination_service) (
  rate(istio_requests_total{
    destination_service=~".*\\.amazonaws\\.com"
  }[5m])
)
```

**Which internal services call which external services:**

```promql
sum by (source_workload, destination_service) (
  rate(istio_requests_total{
    destination_service=~".*external.*"
  }[5m])
)
```

## Grafana Dashboard for External Services

Create a Grafana dashboard that shows your external service dependencies at a glance. Here are panels to include:

**Panel 1: External Service Request Rate**

```promql
sum by (destination_service) (
  rate(istio_requests_total{
    reporter="source",
    destination_service_namespace="unknown"
  }[5m])
)
```

The `destination_service_namespace="unknown"` filter catches external services since they do not have a Kubernetes namespace.

**Panel 2: External Service Error Rate**

```promql
sum by (destination_service) (
  rate(istio_requests_total{
    reporter="source",
    destination_service_namespace="unknown",
    response_code=~"5.*"
  }[5m])
)
```

**Panel 3: External Service Latency (P50, P95, P99)**

```promql
histogram_quantile(0.95,
  sum by (destination_service, le) (
    rate(istio_request_duration_milliseconds_bucket{
      reporter="source",
      destination_service_namespace="unknown"
    }[5m])
  )
)
```

## Kiali Service Graph

Kiali automatically shows registered external services in the service graph. They appear as nodes with a special icon indicating they are external.

To see external services in Kiali:

1. Open the Kiali dashboard
2. Navigate to the Graph page
3. Select the namespace where your workloads run
4. Make sure "Service Nodes" is enabled in the display options
5. External services appear as diamond-shaped nodes

The graph shows traffic flow from your internal services to external services, complete with request rates, error rates, and response times on the edges.

If external services do not appear in Kiali, check that:
- The ServiceEntry exists and has the correct namespace
- There is actual traffic flowing to the external service
- The time range in Kiali covers the period when traffic occurred

## Access Logging

Istio can log every request to external services. Enable access logging in your mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

Then check the logs:

```bash
kubectl logs deploy/my-app -c istio-proxy | \
  jq 'select(.upstream_host | contains("stripe"))'
```

The JSON access log includes:

```json
{
  "authority": "api.stripe.com",
  "bytes_received": 0,
  "bytes_sent": 1234,
  "duration": 150,
  "method": "POST",
  "path": "/v1/charges",
  "protocol": "HTTP/1.1",
  "request_id": "abc-123",
  "response_code": 200,
  "upstream_cluster": "outbound|443||api.stripe.com",
  "upstream_host": "54.187.174.169:443"
}
```

This gives you per-request visibility into external service calls including timing, response codes, and the actual upstream IP.

## Detecting Unregistered External Services

If you run in ALLOW_ANY mode, unregistered external calls go through but show up as PassthroughCluster:

```bash
# Find PassthroughCluster traffic
kubectl logs deploy/my-app -c istio-proxy | grep PassthroughCluster
```

Or in Prometheus:

```promql
sum by (destination_service) (
  rate(istio_requests_total{
    destination_service="PassthroughCluster"
  }[5m])
)
```

If you see PassthroughCluster traffic, those are external calls that need ServiceEntries. The access logs tell you which hosts are being called so you know what to register.

## Alerting on External Service Issues

Set up Prometheus alerts for external service problems:

```yaml
groups:
  - name: external-services
    rules:
      - alert: ExternalServiceHighErrorRate
        expr: |
          sum(rate(istio_requests_total{
            destination_service="api.stripe.com",
            response_code=~"5.*"
          }[5m]))
          /
          sum(rate(istio_requests_total{
            destination_service="api.stripe.com"
          }[5m]))
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate to api.stripe.com"
          description: "Error rate exceeds 5% for the last 5 minutes"

      - alert: ExternalServiceHighLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(istio_request_duration_milliseconds_bucket{
              destination_service="api.stripe.com"
            }[5m])) by (le)
          ) > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency to api.stripe.com"
          description: "P99 latency exceeds 5 seconds"
```

## Distributed Tracing

If you have Jaeger or Zipkin set up with Istio, external service calls appear as spans in your traces. You can see the full request chain from your frontend, through internal services, and out to external APIs.

The external service span shows:
- The time spent waiting for the external API
- The response code
- The upstream cluster name

This is extremely valuable for identifying which external API call is making your overall request slow.

Getting observability for external services is one of the most practical things you can do with Istio. It takes a few ServiceEntry resources to set up and gives you permanent visibility into your external dependencies. Start with the services that matter most to your business, build the dashboards, set up the alerts, and you will catch external service issues before your users do.
