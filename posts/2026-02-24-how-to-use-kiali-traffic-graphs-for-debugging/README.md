# How to Use Kiali Traffic Graphs for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Debugging, Traffic Analysis, Service Mesh, Troubleshooting

Description: Practical techniques for using Kiali's traffic graph features to debug routing issues, latency problems, and error cascades in Istio.

---

When a service starts failing at 2 AM and you're trying to figure out what happened, the last thing you want to do is piece together Prometheus queries. Kiali's traffic graphs give you a visual representation of exactly what's happening in your mesh, making it possible to find the source of a problem in minutes instead of hours.

This post focuses specifically on debugging techniques using Kiali's graph view. We'll cover how to trace errors, investigate latency spikes, debug routing problems, and handle common scenarios you'll encounter in production.

## Setting Up Your Graph for Debugging

Before you start debugging, configure the graph view for maximum usefulness:

1. Set the graph type to **Versioned App** - this shows you individual service versions, which matters when a canary deploy is causing issues
2. Set the time range to match when the problem started - if you got paged 5 minutes ago, use "Last 10m"
3. Enable these display options:
   - Traffic Animation (see request flow in real time)
   - Response Time on edges
   - Security (to spot mTLS issues)
   - Unused Nodes (to see services with zero traffic)

4. Turn on auto-refresh at 15-second intervals so the graph updates as the situation evolves

## Debugging Error Cascades

The most common debugging scenario is tracking down the source of errors. When multiple services are failing, you need to find the root cause.

### Step 1: Find the Red

Look for red edges and red nodes in the graph. Red edges mean high error rates on that connection. Red nodes mean the service itself is unhealthy.

### Step 2: Follow the Chain

Errors cascade upstream. If service A calls service B which calls service C, and C is down, you'll see errors on the C node, the B-to-C edge, the B node, the A-to-B edge, and potentially the A node.

Trace the red edges in the direction of traffic flow (following the arrows) until you reach the furthest downstream red node. That's usually your root cause.

### Step 3: Check the Edge Details

Click on the edge between the failing service and its dependency. The side panel shows:

- Error rate percentage
- Breakdown by HTTP status code (404, 500, 502, 503, 504)
- Request rate

The specific error code tells you a lot:
- **502/503**: The downstream service is unreachable or refusing connections
- **504**: The downstream service is responding too slowly (timeout)
- **500**: The downstream service is crashing internally
- **404**: Routing misconfiguration - requests are going to the wrong place

### Step 4: Check the Service Detail

Click on the failing node and then "Show Details." Look at:

- Pod status (are pods running and ready?)
- Inbound metrics (when did errors start?)
- Istio config validation (is there a configuration problem?)

## Debugging Latency Issues

Latency problems are trickier because they don't always show as red in the graph. A service might be responding successfully but taking 10 seconds instead of 100 milliseconds.

### Finding Slow Edges

Enable "Response Time" edge labels. Scan the graph for edges with unusually high numbers. Normal values depend on your application, but anything over 1 second for service-to-service calls is worth investigating.

### Identifying the Bottleneck

Click on a slow edge to see the latency breakdown:

- P50 (median) response time
- P95 response time
- P99 response time

A big gap between P50 and P99 means most requests are fast but some are very slow. This pattern usually indicates:
- Connection pool exhaustion
- Garbage collection pauses
- Occasional slow database queries
- Retry storms

If P50 is high, the service is consistently slow, which points to:
- Insufficient resources (CPU/memory)
- A slow dependency that every request hits
- Heavy computation on the critical path

### Tracing Latency Through the Call Chain

For a request that goes through A -> B -> C -> D, you can add up the response times on each edge to understand where time is being spent. If the A-to-B edge shows 2 seconds and the B-to-C edge shows 1.8 seconds, most of B's latency comes from waiting on C.

## Debugging Routing Problems

Sometimes traffic isn't going where you expect it. VirtualService configurations might be routing to the wrong subset, or traffic might not be reaching a service at all.

### Traffic Not Reaching a Service

Enable "Unused Nodes" in the display settings. Services with zero traffic show as gray nodes with no edges. If a service should be getting traffic but isn't:

1. Check VirtualService configuration - is the host correct?
2. Check if the Kubernetes service selector matches the pods
3. Look for a `DENY` AuthorizationPolicy blocking traffic

### Wrong Traffic Split

If you set up a 90/10 canary split but Kiali shows 50/50 (or 100/0), check:

1. The VirtualService weights:

```yaml
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

2. The DestinationRule subsets match the actual pod labels
3. There isn't a second VirtualService overriding the first

Kiali shows the actual traffic percentage on each edge, which is way more reliable than hoping your config is correct.

### Traffic Going to Unknown

If you see traffic flowing to a node labeled "unknown," it means requests are going to a destination outside the mesh. This could be:
- An external API call
- A service without an Istio sidecar
- DNS resolution issues sending traffic to the wrong IP

## Debugging Connection Issues

### 503 Upstream Connect Error

This usually means Envoy can't establish a connection to the upstream service. Common causes:

- The upstream pod is down or not ready
- The upstream service port is misconfigured
- Circuit breaker tripped (check DestinationRule)

Look at the edge in Kiali. If you see 503s, click on the destination node and check pod status.

### 426 Upgrade Required

This appears when a client tries to use HTTP/1.0 to connect to a service that requires HTTP/2. Check that your service ports follow Istio's naming convention:

```yaml
ports:
  - name: grpc-api  # "grpc-" prefix for gRPC
    port: 9090
  - name: http-web  # "http-" prefix for HTTP
    port: 8080
```

## Using Find/Hide for Focus

In large meshes, the full graph is overwhelming during debugging. Use the Find/Hide feature to focus:

### Hide Healthy Services

```text
%healthy = true
```

Type this in the "Hide" box to remove all healthy nodes from the graph, leaving only the problematic ones.

### Find a Specific Service

```text
node = "reviews"
```

This highlights the reviews service and its immediate connections, dimming everything else.

### Find All Services with Errors

```text
%error > 0
```

This highlights any node or edge with a non-zero error rate.

## Comparing Time Ranges

Sometimes you need to compare what the mesh looks like now versus what it looked like before the incident. Kiali doesn't have a side-by-side comparison, but you can achieve this by:

1. Take a screenshot of the current graph (with the problem)
2. Change the time range to a period before the problem started
3. Compare the topology and traffic patterns

If a new edge appeared (a new service dependency) or an edge disappeared (a service went down), that's often the root cause.

## Practical Debugging Checklist

When you're debugging with Kiali, run through this list:

1. Open the graph view with your namespace selected
2. Look for red nodes and edges - these are your immediate suspects
3. Follow error chains downstream to find the root cause
4. Check edge labels for latency anomalies
5. Click on the failing service to see pod status and metrics
6. Check the Istio Config tab for validation errors
7. If the problem is routing-related, compare expected vs actual traffic flow
8. If nothing obvious, expand the time range to see if the problem is intermittent

Kiali's graph view is the fastest way to get from "something is broken" to "here's what's broken and why." Building muscle memory with these debugging techniques will make your incident response significantly faster.
