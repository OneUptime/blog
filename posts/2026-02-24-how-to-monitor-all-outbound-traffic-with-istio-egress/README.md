# How to Monitor All Outbound Traffic with Istio Egress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Monitoring, Observability, Kubernetes, Service Mesh

Description: A practical guide to monitoring all outbound traffic from your Istio service mesh using egress gateways, access logs, and Prometheus metrics.

---

One of the biggest blind spots in Kubernetes networking is outbound traffic. You might have great observability for east-west traffic between your services, but what about connections leaving your cluster? Which pods are calling external APIs? How much data is flowing out? Are there unexpected connections to unknown hosts?

Istio gives you the tools to get full visibility into outbound traffic, but you need to set things up correctly. This guide covers how to monitor all egress traffic using access logs, Prometheus metrics, and Grafana dashboards.

## Step 1: Set Outbound Traffic Policy to REGISTRY_ONLY

The first thing you need is to make sure all external traffic is registered with the mesh. If your outbound traffic policy is `ALLOW_ANY`, Istio will proxy the traffic but you get limited visibility because the destinations are treated as opaque passthrough connections.

Switch to `REGISTRY_ONLY`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

With `REGISTRY_ONLY`, you must create ServiceEntry resources for every external service your workloads need to reach. This sounds like extra work, but it is exactly what gives you visibility. Every external dependency becomes an explicit, registered entity in the mesh.

## Step 2: Enable Access Logging

Access logs are the most straightforward way to see what traffic is flowing through the mesh. Make sure access logging is enabled:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

JSON-formatted logs are easier to parse and ship to log aggregation systems. Each access log entry includes fields like:

- `upstream_host`: The destination IP and port
- `authority`: The HTTP Host header (for HTTP traffic)
- `path`: The URL path
- `response_code`: The HTTP status code
- `duration`: How long the request took
- `bytes_sent` and `bytes_received`: Traffic volume

## Step 3: Enable the Egress Gateway

If you want all outbound traffic to flow through a single point, enable the egress gateway:

```bash
kubectl get pods -n istio-system -l istio=egressgateway
```

If nothing comes back, enable it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
```

Once the egress gateway is running, route your external traffic through it (see previous posts for the ServiceEntry + Gateway + VirtualService pattern). The egress gateway becomes your centralized monitoring point for all outbound traffic.

## Step 4: Query Egress Metrics with Prometheus

Istio automatically generates metrics for all traffic flowing through its proxies. The key metrics for outbound traffic monitoring are:

```text
istio_tcp_connections_opened_total
istio_tcp_connections_closed_total
istio_tcp_sent_bytes_total
istio_tcp_received_bytes_total
istio_requests_total
istio_request_duration_milliseconds
```

You can query these in Prometheus. For example, to see all outbound HTTP requests grouped by destination:

```promql
sum(rate(istio_requests_total{reporter="source", destination_service_namespace="istio-system", destination_service_name="istio-egressgateway"}[5m])) by (source_workload, source_workload_namespace)
```

This shows which workloads are sending traffic through the egress gateway.

To see outbound requests by external destination host:

```promql
sum(rate(istio_requests_total{reporter="destination", source_workload="istio-egressgateway"}[5m])) by (destination_service_name, response_code)
```

For total bytes sent to external services:

```promql
sum(rate(istio_tcp_sent_bytes_total{reporter="source", destination_service_name="istio-egressgateway"}[5m])) by (source_workload)
```

## Step 5: Set Up Alerts for Unexpected Traffic

With Prometheus metrics, you can create alerts for suspicious outbound traffic patterns. Here are some useful alert rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: egress-traffic-alerts
  namespace: monitoring
spec:
  groups:
  - name: egress-monitoring
    rules:
    - alert: HighEgressTrafficVolume
      expr: |
        sum(rate(istio_tcp_sent_bytes_total{
          destination_service_name="istio-egressgateway"
        }[5m])) > 10000000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High egress traffic volume detected"
        description: "Outbound traffic through egress gateway exceeds 10MB/s for 5 minutes"
    - alert: EgressErrorRateHigh
      expr: |
        sum(rate(istio_requests_total{
          reporter="source",
          destination_service_name="istio-egressgateway",
          response_code!~"2.."
        }[5m]))
        /
        sum(rate(istio_requests_total{
          reporter="source",
          destination_service_name="istio-egressgateway"
        }[5m])) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate on egress traffic"
```

## Step 6: Use Kiali for Visual Monitoring

Kiali provides a visual graph of traffic in your Istio mesh, and this includes egress traffic. When you have ServiceEntries defined, Kiali will show the external services as nodes in the graph with traffic flowing to them.

To see egress traffic in Kiali:

1. Open the Kiali dashboard
2. Select the Graph view
3. Make sure "Service Entries" is checked in the display options
4. You will see external services appear as nodes with traffic flowing from your workloads through the egress gateway

This gives you a quick visual overview of which services are calling which external APIs.

## Step 7: Ship Logs to a Central System

For production monitoring, you want to ship the egress gateway access logs to a centralized logging system. If you are using a Fluentd or Fluent Bit DaemonSet, it will pick up the stdout logs from the egress gateway pod automatically.

You can also use Istio's Telemetry API to configure log output:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: egress-logging
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "true"
```

This ensures all traffic through the egress gateway gets logged, not just errors.

## Monitoring Blocked Traffic

When using `REGISTRY_ONLY` mode, traffic to unregistered external hosts gets blocked. These blocked connections show up as `BlackHoleCluster` or `PassthroughCluster` entries in the metrics and logs.

To find blocked outbound connections:

```promql
sum(rate(istio_requests_total{destination_service="BlackHoleCluster"}[5m])) by (source_workload, source_workload_namespace)
```

This is incredibly useful for security monitoring. If you see traffic hitting the BlackHoleCluster, it means some workload is trying to reach an external host that is not registered. It could be a misconfiguration, or it could be something more concerning.

## Creating a Traffic Inventory

Over time, you can build a complete inventory of your external dependencies by monitoring egress traffic. Run a query like this periodically:

```bash
kubectl logs -n istio-system -l istio=egressgateway -c istio-proxy --since=24h | \
  jq -r '.authority' | sort | uniq -c | sort -rn
```

This gives you a ranked list of all external hosts your mesh has communicated with in the last 24 hours, along with request counts.

## Practical Recommendations

**Start with logging, then add metrics**: Access logs give you the most detail. Prometheus metrics are better for dashboards and alerting.

**Review blocked traffic daily**: Check the BlackHoleCluster metrics regularly. New entries often indicate a missing ServiceEntry for a legitimate dependency.

**Track traffic volume trends**: A gradual increase in outbound traffic is normal as your application grows. A sudden spike is worth investigating.

**Tag your ServiceEntries**: Use labels on your ServiceEntry resources to categorize external services (e.g., `type: saas`, `type: cloud-api`, `type: partner`). This makes it easier to build filtered dashboards.

Full egress monitoring takes some effort to set up, but once it is running, you will have complete visibility into what leaves your cluster and where it goes.
