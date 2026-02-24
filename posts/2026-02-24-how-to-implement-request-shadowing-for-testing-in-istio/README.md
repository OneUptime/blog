# How to Implement Request Shadowing for Testing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Mirroring, Testing, Service Mesh, Kubernetes

Description: Learn how to use Istio request shadowing (traffic mirroring) to safely test new service versions with production traffic without affecting users.

---

Request shadowing, also called traffic mirroring, is one of those features that can save you from a lot of production headaches. The idea is simple: you duplicate live traffic and send a copy to a new version of your service while the original request still goes to the stable version. The mirrored responses get thrown away, so your users never see anything different. But you get to see how your new code handles real production traffic.

This is incredibly useful when you want to validate a new deployment against actual request patterns, payloads, and volumes without risking user experience. Unit tests and staging environments only get you so far. Real production traffic has patterns you simply cannot replicate artificially.

## How Istio Mirroring Works

Istio implements request shadowing at the Envoy proxy level. When a request hits the sidecar proxy, Envoy forwards the original request to the primary destination and asynchronously sends a copy to the mirror destination. The mirrored request uses a fire-and-forget approach - Envoy does not wait for the response from the mirror service, and the response is discarded.

The mirrored request gets a `-shadow` suffix appended to the `Host` header. So if the original request targets `my-service`, the mirrored request has the host header set to `my-service-shadow`. This makes it easy to distinguish mirrored traffic in your logs.

## Prerequisites

You need an Istio mesh up and running with sidecar injection enabled. You also need two versions of a service deployed. Here is a basic setup:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v1
  labels:
    app: my-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
      version: v1
  template:
    metadata:
      labels:
        app: my-service
        version: v1
    spec:
      containers:
      - name: my-service
        image: my-registry/my-service:1.0.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v2
  labels:
    app: my-service
    version: v2
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
      version: v2
  template:
    metadata:
      labels:
        app: my-service
        version: v2
    spec:
      containers:
      - name: my-service
        image: my-registry/my-service:2.0.0
        ports:
        - containerPort: 8080
```

And a standard Kubernetes Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-service
  ports:
  - port: 80
    targetPort: 8080
```

## Setting Up the DestinationRule

First, define subsets so Istio knows which pods belong to which version:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Configuring the VirtualService for Mirroring

Here is where the actual shadowing happens. The VirtualService routes all real traffic to v1 and mirrors it to v2:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 100
    mirror:
      host: my-service
      subset: v2
    mirrorPercentage:
      value: 100.0
```

The `mirror` field tells Istio to copy requests to the v2 subset. The `mirrorPercentage` controls what fraction of traffic gets mirrored. Setting it to 100 means every single request gets duplicated. In a high-traffic environment, you might want to start lower.

## Controlling Mirror Percentage

Mirroring all traffic is fine for low-traffic services, but if you are handling thousands of requests per second, doubling that load can be a problem. Start with a smaller percentage:

```yaml
    mirror:
      host: my-service
      subset: v2
    mirrorPercentage:
      value: 10.0
```

This sends only 10% of requests to the mirror. You get a statistically meaningful sample without overloading your test deployment.

## Monitoring Mirrored Traffic

Since mirrored responses are discarded by Envoy, you need to observe the mirror service through other means. Check the logs of your v2 pods:

```bash
kubectl logs -l app=my-service,version=v2 -f
```

You can also use Istio telemetry. If you have Prometheus and Grafana set up, you can query metrics for the v2 workload. The `istio_requests_total` metric will show requests hitting v2:

```bash
istio_requests_total{destination_workload="my-service-v2"}
```

Look at response codes, latency percentiles, and error rates for v2. Compare them against v1. If v2 is returning 500s on traffic that v1 handles fine, you have found a bug before it reached users.

## Comparing Results Between Versions

A common pattern is to have v2 log its responses in detail so you can compare them against what v1 would have returned. Some teams build a comparison service that:

1. Captures the mirrored request and response from v2
2. Makes the same request to v1 (or uses a logged response)
3. Diffs the two responses
4. Flags any discrepancies

This is not built into Istio, but the shadowing feature gives you the foundation to build it.

## Handling Stateful Services

Be careful with mirrored traffic hitting stateful services. If your v2 service writes to a database, those writes are real. Mirrored traffic can cause duplicate entries, incorrect counters, or other data corruption.

Common strategies to handle this:

- Point v2 at a separate test database
- Use a read-only mode in v2 during shadow testing
- Add logic in v2 to detect the `-shadow` host header and skip writes

```python
# Example: checking for shadow traffic in your app
def handle_request(request):
    is_shadow = '-shadow' in request.headers.get('Host', '')
    if is_shadow:
        # Process but don't write to database
        return process_read_only(request)
    return process_normal(request)
```

## Cleaning Up

Once you are done testing, remove the mirror configuration. Just update the VirtualService to drop the mirror fields:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 100
```

If v2 passed your shadow test, you can then proceed with a canary rollout or traffic shifting to gradually move real user traffic to v2.

## Practical Tips

Resource planning matters. Your v2 deployment needs enough capacity to handle the mirrored load. If you are mirroring 100% of traffic, v2 needs roughly the same resources as v1.

Network policies can interfere with mirroring. Make sure your NetworkPolicy resources allow traffic between the sidecar proxies and the v2 pods.

Timeouts on mirrored requests default to the same values as the primary route. Since mirrored responses are discarded anyway, this usually is not a concern, but slow mirror responses can consume Envoy resources.

Request shadowing works at the HTTP level. It does not work for TCP or gRPC streaming connections out of the box. For gRPC unary calls, it works fine.

## Wrapping Up

Request shadowing is one of the most underused features in Istio. It gives you a zero-risk way to validate new code against production traffic. The setup is straightforward - a DestinationRule to define your subsets and a VirtualService with the mirror configuration. Start with a low mirror percentage, monitor v2 closely, and increase the percentage as you gain confidence. When you are satisfied with the results, transition to a proper canary deployment to start serving real user traffic from v2.
