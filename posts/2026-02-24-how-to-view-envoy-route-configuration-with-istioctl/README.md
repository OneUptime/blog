# How to View Envoy Route Configuration with istioctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Routing, istioctl, Kubernetes, Service Mesh

Description: A practical guide to inspecting Envoy route configuration in Istio to debug traffic routing, URL matching, and request handling rules.

---

Envoy routes are the traffic rules that decide where HTTP requests go. When you create a VirtualService in Istio, it gets translated into Envoy route configuration. If requests aren't reaching the right destination, or header matches aren't working, or timeouts aren't being applied, the route configuration shows you exactly what Envoy is doing.

## How Routes Relate to VirtualServices

Istio VirtualServices are the user-facing configuration. Envoy routes are the runtime configuration that Envoy actually uses. The mapping is roughly:

- VirtualService `hosts` field becomes Envoy virtual host domains
- VirtualService `match` rules become Envoy route match criteria
- VirtualService `route` destinations become Envoy weighted clusters
- VirtualService `timeout`, `retries`, and `fault` become Envoy route-level settings

When you see unexpected behavior, the question is always: did the VirtualService translate correctly into routes?

## Viewing Routes

```bash
istioctl proxy-config routes productpage-v1-abc123.default
```

```
NAME                                                  DOMAINS                                   MATCH     VIRTUAL SERVICE
80                                                    istio-ingressgateway.istio-system, *       /*
9080                                                  details, details.default + 1 more...       /*
9080                                                  productpage, productpage.default + 1...    /*
9080                                                  ratings, ratings.default + 1 more...       /*
9080                                                  reviews, reviews.default + 1 more...       /*        reviews-vs.default
inbound|9080||                                        *                                          /*
InboundPassthroughCluster                             *                                          /*
```

The columns:

- **NAME** - The route configuration name, usually matching the port number
- **DOMAINS** - Which hostnames this route applies to (maps to VirtualService hosts)
- **MATCH** - The URL match pattern
- **VIRTUAL SERVICE** - Which VirtualService created this route (empty means default Istio routing)

Notice that `reviews` has a VirtualService (`reviews-vs.default`) while other services don't. Services without VirtualServices use default round-robin routing.

## Filtering Routes

Filter by route configuration name:

```bash
istioctl pc routes productpage-v1-abc123.default --name 9080
```

This shows only the routes for port 9080, which is usually the most interesting since it's your application traffic.

## JSON Output for Full Details

The table view only shows basic match information. The JSON output reveals everything:

```bash
istioctl pc routes productpage-v1-abc123.default --name 9080 -o json
```

Here's a representative example:

```json
[
  {
    "name": "9080",
    "virtualHosts": [
      {
        "name": "reviews.default.svc.cluster.local:9080",
        "domains": [
          "reviews.default.svc.cluster.local",
          "reviews.default.svc.cluster.local:9080",
          "reviews",
          "reviews.default",
          "reviews.default.svc",
          "10.96.120.45",
          "10.96.120.45:9080"
        ],
        "routes": [
          {
            "match": {
              "prefix": "/",
              "caseSensitive": true
            },
            "route": {
              "weightedClusters": {
                "clusters": [
                  {
                    "name": "outbound|9080|v1|reviews.default.svc.cluster.local",
                    "weight": 75
                  },
                  {
                    "name": "outbound|9080|v2|reviews.default.svc.cluster.local",
                    "weight": 25
                  }
                ]
              },
              "timeout": "10s",
              "retryPolicy": {
                "retryOn": "connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes",
                "numRetries": 2,
                "retryHostPredicate": [
                  { "name": "envoy.retry_host_predicates.previous_hosts" }
                ],
                "hostSelectionRetryMaxAttempts": "5",
                "retriableStatusCodes": [503]
              },
              "maxStreamDuration": {
                "maxStreamDuration": "0s",
                "grpcTimeoutHeaderMax": "0s"
              }
            },
            "metadata": {
              "filterMetadata": {
                "istio": {
                  "config": "/apis/networking.istio.io/v1/namespaces/default/virtual-service/reviews-vs"
                }
              }
            },
            "decorator": {
              "operation": "reviews.default.svc.cluster.local:9080/*"
            }
          }
        ]
      }
    ]
  }
]
```

This tells you a lot. The VirtualService created a route that splits traffic 75/25 between v1 and v2, has a 10-second timeout, retries twice on connection failures, and retries on 503 status codes.

## Debugging Traffic Split Issues

If your traffic split isn't working as expected, check the `weightedClusters` section:

```bash
istioctl pc routes productpage-v1-abc123.default --name 9080 -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for rc in data:
    for vh in rc.get('virtualHosts', []):
        if 'reviews' in vh['name']:
            for r in vh['routes']:
                wc = r.get('route', {}).get('weightedClusters', {})
                if wc:
                    print(json.dumps(wc, indent=2))
"
```

If the weights don't match your VirtualService, check for conflicting VirtualServices or Envoy filters that might be modifying routes.

## Debugging URL Matching

VirtualServices support various match types. Here's how they translate to Envoy:

**Prefix match:**
```yaml
# VirtualService
match:
- uri:
    prefix: /api
```
```json
// Envoy route
"match": { "prefix": "/api" }
```

**Exact match:**
```yaml
# VirtualService
match:
- uri:
    exact: /api/v1/health
```
```json
// Envoy route
"match": { "path": "/api/v1/health" }
```

**Regex match:**
```yaml
# VirtualService
match:
- uri:
    regex: "/api/v[0-9]+/.*"
```
```json
// Envoy route
"match": { "safeRegex": { "regex": "/api/v[0-9]+/.*" } }
```

Check the JSON output to verify your matches translated correctly:

```bash
istioctl pc routes my-pod.default --name 9080 -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for rc in data:
    for vh in rc.get('virtualHosts', []):
        for r in vh.get('routes', []):
            print(json.dumps(r['match'], indent=2), '->', r.get('route', {}).get('cluster', r.get('route', {}).get('weightedClusters', 'unknown')))
"
```

## Debugging Header-Based Routing

Header matches in VirtualServices translate to Envoy header matchers:

```yaml
# VirtualService
match:
- headers:
    x-user-type:
      exact: premium
```

In the Envoy route JSON:

```json
"match": {
  "prefix": "/",
  "headers": [
    {
      "name": "x-user-type",
      "exactMatch": "premium"
    }
  ]
}
```

Verify it's present in the route config. If the header match is missing, the VirtualService might have a syntax error or the match rule might be structured differently than you think.

## Debugging Timeouts and Retries

Timeouts and retries appear directly in the route:

```bash
istioctl pc routes my-pod.default --name 9080 -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for rc in data:
    for vh in rc.get('virtualHosts', []):
        for r in vh.get('routes', []):
            timeout = r.get('route', {}).get('timeout')
            retry = r.get('route', {}).get('retryPolicy')
            if timeout or retry:
                print(f\"Timeout: {timeout}, Retries: {json.dumps(retry, indent=2) if retry else 'none'}\")
"
```

If the timeout isn't what you set in the VirtualService, check for conflicting settings. Istio also applies mesh-wide defaults that can override per-route settings.

## Inbound vs Outbound Routes

Don't forget that each pod has both inbound and outbound routes. Outbound routes (port-based names like `9080`) control traffic leaving the pod. Inbound routes (names like `inbound|9080||`) control traffic coming into the pod.

```bash
# Outbound routes
istioctl pc routes my-pod.default --name 9080

# Inbound routes
istioctl pc routes my-pod.default --name "inbound|9080||"
```

Inbound routes are usually simpler - they just forward to the local application. But if you have AuthorizationPolicies, you'll see RBAC filters applied to inbound routes.

## Route Order Matters

Envoy evaluates routes in order and uses the first match. If you have overlapping route matches, the order determines which one wins. Check the order in the JSON output:

```bash
istioctl pc routes my-pod.default --name 9080 -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for rc in data:
    for vh in rc.get('virtualHosts', []):
        if 'my-service' in vh['name']:
            for i, r in enumerate(vh['routes']):
                print(f\"Route {i}: {json.dumps(r['match'])}\")
"
```

Istio orders routes from most specific to least specific. Exact matches come first, then prefix matches ordered by length (longest first), then regex matches.

## Default Routes

Services without VirtualServices get default routes that forward all traffic to the service's cluster:

```json
{
  "match": { "prefix": "/" },
  "route": {
    "cluster": "outbound|9080||ratings.default.svc.cluster.local",
    "timeout": "0s",
    "maxStreamDuration": {
      "maxStreamDuration": "0s"
    }
  }
}
```

A timeout of `0s` means no timeout (infinite). If you need timeouts, create a VirtualService.

## Summary

Envoy routes are the translated version of your VirtualServices. When traffic routing doesn't work as expected, the JSON output of `istioctl proxy-config routes` shows you exactly what Envoy is doing - the match criteria, traffic weights, timeouts, retries, and the order of evaluation. Trust the route configuration over your VirtualService YAML, because the routes are what actually controls traffic flow.
