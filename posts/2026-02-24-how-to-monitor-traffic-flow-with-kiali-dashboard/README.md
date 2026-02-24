# How to Monitor Traffic Flow with Kiali Dashboard

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Traffic Monitoring, Observability, Service Mesh

Description: A practical guide to monitoring real-time traffic flow, request rates, and error rates using Kiali's dashboard in Istio.

---

Knowing what traffic is flowing through your mesh at any given moment is critical for operations. Kiali's dashboard gives you a real-time view of request rates, error rates, response times, and traffic routing across all your services. It's the single best tool for understanding what's happening in your Istio mesh right now.

This guide covers how to use Kiali's traffic monitoring features effectively, from the overview dashboard to deep-dives into individual service traffic.

## The Overview Dashboard

When you first open Kiali, you land on the Overview page. This shows you all namespaces in your cluster with a quick health summary for each. Every namespace box shows:

- Number of applications and their health status
- Number of Istio configuration objects and their validation state
- A small sparkline graph of traffic over time

Namespaces with healthy traffic show green. Namespaces with issues show yellow or red. This is your starting point for spotting problems.

Click on any namespace to drill into its services.

## Understanding the Traffic Graph

Navigate to the Graph page and select your namespace. The traffic graph is where most monitoring happens. Each node represents a service (or workload, depending on graph type), and each edge represents a traffic flow between two nodes.

### Traffic Animation

Enable traffic animation from the Display dropdown. When enabled, you'll see animated dots moving along the edges, representing actual requests. The speed and density of the dots correlates with request rate. This makes it immediately obvious which paths are hot and which are quiet.

Green dots represent successful requests, while red dots represent errors. During an incident, you can instantly see where errors are concentrated.

### Edge Labels

Configure edge labels to show quantitative data. Under Display settings, you can choose from:

- **Requests per second** - How much traffic is flowing on each edge
- **Requests percentage** - What fraction of total traffic goes through each edge
- **Response time** - Average latency on each edge

For monitoring purposes, showing requests per second is usually the most useful. It tells you both the traffic volume and, when combined with the health colors, where problems are occurring.

## Monitoring Request Rates

Click on any service node in the graph to open its detail panel on the right. The panel shows:

- Inbound request rate (requests/sec)
- Outbound request rate (requests/sec)
- Request rate breakdown by response code

This gives you a quick view of whether a service is handling its expected load. If you normally see 500 req/s and you're seeing 50, something is wrong upstream. If you're seeing 5000, you might be dealing with a traffic spike.

For a more detailed view, click "Show Details" to open the full service detail page. The detail page includes charts for:

- Request volume over time
- Request duration (latency) over time
- Request size distribution
- Response size distribution

These charts pull data directly from Prometheus, so they reflect the same metrics you'd query there, just in a more visual format.

## Monitoring Error Rates

Error monitoring in Kiali is straightforward. On the traffic graph, edges change color based on error rates:

- **Green**: Low or zero error rate
- **Orange/Yellow**: Some errors present (typically 0.1% to 5%)
- **Red**: High error rate (above the configured threshold)

To see exact error numbers, click on an edge. The side panel shows the error rate as both a percentage and raw count, broken down by HTTP status code.

You can also check the health of all services in a namespace by going to the Services or Workloads list view. Each entry shows a health indicator:

```
Service          Health    Request Rate    Error Rate
productpage      [green]   150 req/s       0.0%
reviews          [yellow]  120 req/s       2.3%
ratings          [red]     80 req/s        15.7%
details          [green]   150 req/s       0.1%
```

### Setting Up Error Thresholds

Kiali's health indicators are configurable through the Kiali CR. You can adjust what error rate triggers each health state:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  health_config:
    rate:
      - namespace: ".*"
        kind: ".*"
        name: ".*"
        tolerance:
          - code: "^5\\d\\d$"
            direction: ".*"
            protocol: "http"
            degraded: 0.1
            failure: 5
```

This sets the degraded threshold to 0.1% (any 5xx errors) and the failure threshold to 5%.

## Monitoring gRPC Traffic

If your services use gRPC, Kiali handles it well. gRPC traffic shows up in the graph just like HTTP traffic, with edges colored by gRPC status codes instead of HTTP status codes.

Filter the graph to show only gRPC traffic using the Traffic dropdown. This is helpful when you have services that handle both HTTP and gRPC and you want to isolate one protocol.

gRPC error rates are based on gRPC status codes (OK, CANCELLED, UNKNOWN, etc.) rather than HTTP status codes.

## Monitoring TCP Traffic

For raw TCP services (databases, message queues, etc.), Kiali shows TCP traffic flows with byte rates instead of request rates. Enable TCP traffic in the Display settings to see these connections.

TCP edges show:

- Bytes sent per second
- Bytes received per second
- Connection status

This is particularly useful for spotting services that are saturating their connections to databases or message brokers.

## Using Time Range Controls

The time range selector in the top-right of the graph controls how far back Kiali looks when building the graph and calculating rates. Options range from "Last 1m" to "Last 24h."

For real-time monitoring during an incident, use "Last 1m" or "Last 5m" to see what's happening right now. For understanding traffic patterns over time, extend to "Last 1h" or "Last 6h."

Keep in mind that a longer time range smooths out spikes. If you had a brief error burst 30 minutes ago and you're looking at a 1-hour window, the error rate might look low because it's averaged over the full hour.

## Setting Up Auto-Refresh

Kiali can automatically refresh the graph at a configurable interval. Use the refresh dropdown (next to the time range selector) to set it. Options include:

- Pause (manual refresh only)
- Every 10s, 15s, 30s
- Every 1m, 5m, 15m

For active monitoring, set it to 15s or 30s. This gives you a near-real-time view without overwhelming the browser.

## Traffic Flow During Canary Deployments

Kiali is particularly useful during canary deployments. When you split traffic between two versions using a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 90
        - destination:
            host: reviews
            subset: v2
          weight: 10
```

The Kiali graph (using "Versioned App" type) shows both versions with their actual traffic percentages on the edges. You can verify that the 90/10 split is actually happening and monitor error rates on the canary version independently.

## Quick Reference: Where to Look

Here's a cheat sheet for common monitoring tasks:

| Task | Where in Kiali |
|------|---------------|
| Overall mesh health | Overview page |
| Service dependencies | Graph page (App graph) |
| Error rate for a service | Click service node in graph |
| Traffic split verification | Graph page (Versioned App graph) |
| Latency analysis | Service detail page, charts |
| TCP traffic monitoring | Graph page, enable TCP display |
| Cross-namespace traffic | Graph page, select multiple namespaces |

Kiali's traffic monitoring features give you a solid foundation for understanding what's happening in your mesh. Combined with Prometheus and Grafana for historical analysis, you'll have full visibility into your traffic patterns.
