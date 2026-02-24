# How to Configure A/B Testing with Istio VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, A/B Testing, VirtualService, Traffic Management, Kubernetes

Description: Learn how to configure A/B testing using Istio VirtualService to route traffic between different service versions based on headers, cookies, and weights.

---

A/B testing is one of those things that sounds simple on paper but gets complicated fast when you try to do it at the infrastructure level. You want some users to see version A, others to see version B, and you need clean separation between the two. Istio makes this surprisingly straightforward with VirtualService routing rules.

## What A/B Testing Looks Like in Istio

In a traditional A/B test, you split traffic between two versions of your application. With Istio, you do this by creating two Kubernetes Deployments (one for each version) and then using a VirtualService to decide which users go where.

The routing decisions can be based on HTTP headers, cookies, query parameters, or even just a percentage-based split. This gives you a lot of flexibility.

## Prerequisites

Before you start, make sure you have:

- A Kubernetes cluster with Istio installed
- Two versions of your application deployed
- A DestinationRule that defines subsets for each version

Here is the DestinationRule you will need:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: default
spec:
  host: my-app
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

This tells Istio that your `my-app` service has two subsets, `v1` and `v2`, identified by the `version` label on the pods.

## Header-Based A/B Testing

The most common approach is to route based on a custom header. Your frontend or API gateway sets a header like `x-test-group`, and Istio routes accordingly.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-test-group:
              exact: "B"
      route:
        - destination:
            host: my-app
            subset: v2
    - route:
        - destination:
            host: my-app
            subset: v1
```

When a request comes in with `x-test-group: B`, it goes to v2. Everything else goes to v1. The ordering matters here - Istio evaluates rules from top to bottom and uses the first match.

## Cookie-Based A/B Testing

If you want to keep users in the same test group across requests, cookies work well. The user gets assigned a cookie on their first visit, and subsequent requests carry that cookie automatically.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            cookie:
              regex: ".*ab_group=B.*"
      route:
        - destination:
            host: my-app
            subset: v2
    - route:
        - destination:
            host: my-app
            subset: v1
```

Since cookies are sent as a single `Cookie` header, you need a regex match to find your specific cookie value within the full cookie string.

## Percentage-Based A/B Split

If you just want a straight 50/50 split (or any ratio), you can use weight-based routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: v1
          weight: 50
        - destination:
            host: my-app
            subset: v2
          weight: 50
```

The weights must add up to 100. You can use any ratio - 80/20, 90/10, whatever makes sense for your test.

One thing to watch out for: this is a per-request split. It does not guarantee that the same user always hits the same version. If session stickiness matters, combine weights with hash-based load balancing in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: default
spec:
  host: my-app
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Multi-Variant Testing

You are not limited to just two variants. If you want to test three versions simultaneously, just add more subsets and routing rules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-test-group:
              exact: "B"
      route:
        - destination:
            host: my-app
            subset: v2
    - match:
        - headers:
            x-test-group:
              exact: "C"
      route:
        - destination:
            host: my-app
            subset: v3
    - route:
        - destination:
            host: my-app
            subset: v1
```

## Combining Match Conditions

You can get really specific by combining multiple match conditions. For example, only route mobile users in test group B to v2:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-test-group:
              exact: "B"
            user-agent:
              regex: ".*Mobile.*"
      route:
        - destination:
            host: my-app
            subset: v2
    - route:
        - destination:
            host: my-app
            subset: v1
```

When multiple conditions are in the same match block, they are ANDed together. Both conditions must be true for the rule to apply.

## Verifying Your Configuration

After applying the VirtualService, verify it is working correctly:

```bash
# Check the VirtualService was applied
kubectl get virtualservice my-app -o yaml

# Test header-based routing
curl -H "x-test-group: B" http://my-app.default.svc.cluster.local

# Test without the header (should go to v1)
curl http://my-app.default.svc.cluster.local

# Check Istio proxy configuration
istioctl proxy-config routes deploy/my-app -o json
```

## Collecting Test Results

A/B testing is useless without metrics. Istio generates metrics for each subset automatically. You can query them with Prometheus:

```bash
# Request count per version
istio_requests_total{destination_workload="my-app", destination_version="v1"}
istio_requests_total{destination_workload="my-app", destination_version="v2"}

# Response time per version
istio_request_duration_milliseconds_bucket{destination_workload="my-app", destination_version="v1"}
istio_request_duration_milliseconds_bucket{destination_workload="my-app", destination_version="v2"}
```

This gives you the data to compare error rates, latency, and throughput between versions.

## Common Pitfalls

There are a few things that catch people off guard:

1. **Forgetting the DestinationRule** - The VirtualService references subsets, but those subsets are defined in the DestinationRule. Without it, you will get 503 errors.

2. **Rule ordering** - The first matching rule wins. If your default route is listed before your match rules, the match rules will never trigger.

3. **Session stickiness** - Weight-based splitting does not keep users on the same version. You need consistent hashing or cookie-based routing for that.

4. **Metrics labels** - Make sure your pods have the `version` label so Istio can tag metrics correctly.

## Wrapping Up

Istio gives you a clean, infrastructure-level way to run A/B tests without touching application code. You define your test groups through VirtualService routing rules, deploy your variants as separate Kubernetes Deployments, and let Istio handle the traffic splitting. The built-in telemetry means you get metrics for free, making it easier to compare performance between versions and make data-driven decisions about which version to roll forward with.
