# How to Use istioctl proxy-config route for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, istioctl, Envoy, Routing, Kubernetes

Description: How to inspect Envoy routing configuration with istioctl proxy-config route to debug VirtualService rules and traffic routing in Istio.

---

When your VirtualService rules are not working as expected, the problem is often in how those rules get translated into Envoy route configuration. Istio takes your high-level VirtualService YAML and converts it into Envoy's route configuration format. Sometimes that translation does not produce what you expect, especially with complex matching rules or multiple VirtualServices.

The `istioctl proxy-config route` command shows you the actual Envoy route configuration on a specific proxy, which is what really controls traffic routing.

## Basic Usage

```bash
istioctl proxy-config route <pod-name>.<namespace>
```

Example:

```bash
istioctl proxy-config route productpage-v1-6b746f74dc-9rlmh.bookinfo
```

Output:

```
NAME           DOMAINS                                          MATCH                  VIRTUAL SERVICE
9080           reviews, reviews.bookinfo + 1 more...            /*                     reviews.bookinfo
9080           ratings, ratings.bookinfo + 1 more...            /*                     ratings.bookinfo
9080           details, details.bookinfo + 1 more...            /*
9080           productpage, productpage.bookinfo + 1 more...    /*
               *                                                /stats/prometheus*
               *                                                /healthz/ready*
```

## Understanding the Output

**NAME**: The name of the route configuration. This corresponds to the listener port. Route config `9080` is used by the listener on port 9080.

**DOMAINS**: Which hostnames this route matches. These come from the `hosts` field in VirtualService and from Kubernetes Service names.

**MATCH**: The URL path matching pattern.

**VIRTUAL SERVICE**: Which VirtualService resource generated this route, if any. Empty means it is an auto-generated default route.

## Debugging VirtualService Rules

Suppose you applied this VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
  namespace: bookinfo
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
```

Check if it is reflected in the proxy:

```bash
istioctl proxy-config route productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --name 9080 -o json
```

In the JSON output, look for the `routes` array under the `virtualHosts` section for reviews. You should see two route entries:

1. A route with a header match for `end-user: jason` pointing to the v2 subset cluster
2. A default route pointing to the v1 subset cluster

```json
{
  "match": {
    "prefix": "/",
    "headers": [
      {
        "name": "end-user",
        "exactMatch": "jason"
      }
    ]
  },
  "route": {
    "cluster": "outbound|9080|v2|reviews.bookinfo.svc.cluster.local"
  }
}
```

## Common Routing Issues

### VirtualService Not Showing Up

If your VirtualService does not appear in the route configuration, check these things:

```bash
# Is the VirtualService applied?
kubectl get virtualservice -n bookinfo

# Does the host match a service the proxy knows about?
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo | grep reviews
```

A VirtualService with `hosts: ["reviews"]` will only work if the proxy has a cluster for the reviews service. If the service does not exist or the proxy cannot see it (due to Sidecar resource restrictions), the VirtualService is silently ignored.

### Route Order Matters

Envoy evaluates routes in order and uses the first match. If your more specific route comes after a catch-all route, it will never match:

```bash
istioctl proxy-config route productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --name 9080 -o json | python3 -m json.tool | grep -B2 -A10 "reviews"
```

Check the order of routes in the output. They should have specific matches (headers, paths) before generic ones (prefix: "/").

### Multiple VirtualServices for the Same Host

If you have multiple VirtualServices targeting the same host, Istio merges them. But the merge order can be unpredictable:

```bash
kubectl get virtualservice -n bookinfo -l "app=reviews"
```

It is best practice to have one VirtualService per host to avoid merge conflicts.

### Route Delegation Issues

If you are using route delegation (VirtualService referencing another VirtualService), verify the complete route chain:

```bash
istioctl proxy-config route productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for rc in data:
    for vh in rc.get('virtualHosts', []):
        if 'reviews' in str(vh.get('domains', [])):
            print(json.dumps(vh, indent=2))
"
```

## Inspecting Timeout and Retry Configuration

VirtualService timeouts and retries show up in the route configuration:

```bash
istioctl proxy-config route productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --name 9080 -o json
```

Look for `timeout` and `retryPolicy` in each route:

```json
{
  "route": {
    "cluster": "outbound|9080||reviews.bookinfo.svc.cluster.local",
    "timeout": "5s",
    "retryPolicy": {
      "retryOn": "connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes",
      "numRetries": 3,
      "perTryTimeout": "2s"
    }
  }
}
```

If your timeout or retry configuration from the VirtualService is not showing up here, the VirtualService is not being applied correctly.

## Debugging Traffic Splitting

For canary deployments with weighted routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-canary
  namespace: bookinfo
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

Verify the weights are correct:

```bash
istioctl proxy-config route productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --name 9080 -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for rc in data:
    for vh in rc.get('virtualHosts', []):
        if 'reviews' in str(vh.get('domains', [])):
            for route in vh.get('routes', []):
                action = route.get('route', {})
                if 'weightedClusters' in action:
                    for c in action['weightedClusters']['clusters']:
                        print(f\"{c['name']}: {c['weight']}%\")
"
```

Expected output:

```
outbound|9080|v1|reviews.bookinfo.svc.cluster.local: 90
outbound|9080|v2|reviews.bookinfo.svc.cluster.local: 10
```

## Comparing Routes on Client vs Server

Remember that routes are configured on the client side (outbound) and the server side (inbound). When debugging, check both:

```bash
# Client side routes (outbound)
istioctl proxy-config route productpage-v1-abc.bookinfo --name 9080

# Server side routes (inbound)
istioctl proxy-config route reviews-v1-def.bookinfo --name "inbound|9080||"
```

VirtualService rules are applied on the client side. AuthorizationPolicy is applied on the server side. Make sure you are checking the right proxy.

## Filtering Route Output

```bash
# Show routes for a specific route config name
istioctl proxy-config route <pod>.<ns> --name 9080

# Output full JSON
istioctl proxy-config route <pod>.<ns> -o json

# Find routes matching a domain
istioctl proxy-config route <pod>.<ns> -o json | grep -B5 -A20 "reviews"
```

Understanding the route configuration is key to debugging any VirtualService issues. If your traffic splitting, header-based routing, or path matching is not working, the route config will show you exactly what Envoy is doing, which might be different from what you intended in your VirtualService YAML.
