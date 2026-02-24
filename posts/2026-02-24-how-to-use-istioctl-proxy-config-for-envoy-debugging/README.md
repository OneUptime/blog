# How to Use istioctl proxy-config for Envoy Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, istioctl, Proxy Config, Debugging, Kubernetes

Description: Master the istioctl proxy-config command to inspect and debug Envoy proxy configurations across listeners, routes, clusters, and endpoints.

---

The `istioctl proxy-config` command (often shortened to `istioctl pc`) is the single most important debugging tool for the Istio data plane. It lets you inspect exactly what configuration Envoy has received from Istiod, covering every aspect of how traffic is handled - from the port it listens on to the endpoint it routes to.

When your Istio configuration doesn't produce the expected traffic behavior, proxy-config tells you what Envoy actually sees, which is often different from what you think you configured.

## The Five Subcommands

proxy-config has five main subcommands, each corresponding to an Envoy configuration type:

```bash
istioctl proxy-config listeners <pod>.<namespace>    # LDS
istioctl proxy-config routes <pod>.<namespace>        # RDS
istioctl proxy-config clusters <pod>.<namespace>      # CDS
istioctl proxy-config endpoints <pod>.<namespace>     # EDS
istioctl proxy-config bootstrap <pod>.<namespace>     # Bootstrap config
```

There's also an `all` subcommand that dumps everything:

```bash
istioctl proxy-config all <pod>.<namespace>
```

And a `log` subcommand for managing Envoy log levels:

```bash
istioctl proxy-config log <pod>.<namespace>
```

## Listener Debugging

Listeners define what ports and protocols Envoy accepts connections on. Every Kubernetes Service port that Istiod knows about typically creates a listener:

```bash
istioctl pc listeners productpage-v1-abc123.default
```

```
ADDRESS       PORT  MATCH                                    DESTINATION
0.0.0.0       15006 ALL                                      Inline Route: /*
0.0.0.0       15006 Addr: *:15006                            Non-HTTP/Non-TCP
0.0.0.0       15001 ALL                                      PassthroughCluster
0.0.0.0       9080  Trans: raw_buffer; App: http/1.1,h2c     Route: 9080
0.0.0.0       9090  Trans: raw_buffer; App: http/1.1,h2c     Route: 9090
10.96.0.1     443   ALL                                      Cluster: outbound|443||kubernetes.default.svc.cluster.local
```

Key ports:
- **15001** - Outbound traffic interceptor (virtual listener)
- **15006** - Inbound traffic interceptor
- **Service ports** (9080, 9090, etc.) - Actual listeners for each service

If a service port is missing from the listeners, Envoy won't handle traffic to that service. This usually means the Kubernetes Service doesn't exist or Istiod hasn't processed it yet.

Filter by port or address:

```bash
istioctl pc listeners productpage-v1-abc123.default --port 9080
istioctl pc listeners productpage-v1-abc123.default --address 0.0.0.0
```

## Route Debugging

Routes map incoming requests to upstream clusters based on match criteria:

```bash
istioctl pc routes productpage-v1-abc123.default
```

```
NAME     DOMAINS                                  MATCH     VIRTUAL SERVICE
9080     reviews, reviews.default + 1 more...     /*        reviews-vs.default
9080     ratings, ratings.default + 1 more...     /*
9090     details, details.default + 1 more...     /*
```

Filter by name to see only routes for a specific port:

```bash
istioctl pc routes productpage-v1-abc123.default --name 9080
```

The JSON output shows the full route configuration including weights, header matches, retries, and timeouts:

```bash
istioctl pc routes productpage-v1-abc123.default --name 9080 -o json
```

Example JSON snippet:

```json
{
  "name": "9080",
  "virtualHosts": [
    {
      "name": "reviews.default.svc.cluster.local:9080",
      "domains": ["reviews", "reviews.default", "reviews.default.svc", "reviews.default.svc.cluster.local"],
      "routes": [
        {
          "match": { "prefix": "/" },
          "route": {
            "weightedClusters": {
              "clusters": [
                {
                  "name": "outbound|9080|v1|reviews.default.svc.cluster.local",
                  "weight": 80
                },
                {
                  "name": "outbound|9080|v2|reviews.default.svc.cluster.local",
                  "weight": 20
                }
              ]
            },
            "timeout": "5s",
            "retryPolicy": {
              "retryOn": "connect-failure,refused-stream,unavailable,cancelled",
              "numRetries": 3,
              "perTryTimeout": "2s"
            }
          }
        }
      ]
    }
  ]
}
```

This confirms that your VirtualService with 80/20 traffic split is actually reflected in Envoy's config.

## Cluster Debugging

Clusters represent upstream services with their load balancing and connection settings:

```bash
istioctl pc clusters productpage-v1-abc123.default
```

```
SERVICE FQDN                                    PORT   SUBSET   DIRECTION   TYPE   DESTINATION RULE
reviews.default.svc.cluster.local               9080   v1       outbound    EDS    reviews-dr.default
reviews.default.svc.cluster.local               9080   v2       outbound    EDS    reviews-dr.default
ratings.default.svc.cluster.local               9080   -        outbound    EDS
BlackHoleCluster                                -      -        -           STATIC
PassthroughCluster                              -      -        -           ORIGINAL_DST
```

Filter by FQDN:

```bash
istioctl pc clusters productpage-v1-abc123.default \
  --fqdn reviews.default.svc.cluster.local
```

The JSON output reveals circuit breaker settings, outlier detection, and TLS configuration:

```bash
istioctl pc clusters productpage-v1-abc123.default \
  --fqdn reviews.default.svc.cluster.local -o json
```

## Endpoint Debugging

Endpoints show the actual IP addresses backing each cluster:

```bash
istioctl pc endpoints productpage-v1-abc123.default
```

Filter by cluster name:

```bash
istioctl pc endpoints productpage-v1-abc123.default \
  --cluster "outbound|9080|v1|reviews.default.svc.cluster.local"
```

```
ENDPOINT             STATUS      OUTLIER CHECK   CLUSTER
10.244.0.15:9080     HEALTHY     OK              outbound|9080|v1|reviews.default.svc.cluster.local
10.244.0.16:9080     HEALTHY     OK              outbound|9080|v1|reviews.default.svc.cluster.local
```

This is crucial for diagnosing 503 errors. If there are no healthy endpoints for a cluster, all requests to it will fail.

Check the status column:
- **HEALTHY** - The endpoint is accepting traffic
- **UNHEALTHY** - Health checks are failing
- **DRAINING** - The endpoint is being removed

## Bootstrap Configuration

The bootstrap config is the static configuration Envoy starts with, before it receives dynamic config from Istiod:

```bash
istioctl pc bootstrap productpage-v1-abc123.default -o json
```

This includes the control plane address, tracing configuration, stats settings, and initial certificates. You rarely need to look at this unless you're debugging connectivity between Envoy and Istiod.

## Output Formats

All proxy-config commands support multiple output formats:

```bash
# Table (default)
istioctl pc clusters pod.namespace

# JSON
istioctl pc clusters pod.namespace -o json

# Short format (just names)
istioctl pc clusters pod.namespace -o short
```

JSON is the most useful for detailed analysis. Pipe it through jq for filtering:

```bash
# Find all clusters with circuit breakers configured
istioctl pc clusters pod.namespace -o json | \
  jq '.[] | select(.circuitBreakers != null) | .name'

# Find all endpoints that are unhealthy
istioctl pc endpoints pod.namespace -o json | \
  jq '.[] | select(.status != "HEALTHY") | {endpoint: .endpoint, status: .status, cluster: .clusterName}'
```

## Debugging Workflow

Here's a systematic approach when traffic isn't routing correctly:

1. **Start with listeners.** Is there a listener for the port you're trying to reach?

```bash
istioctl pc listeners source-pod.namespace --port 8080
```

2. **Check routes.** Does the listener route to the right cluster?

```bash
istioctl pc routes source-pod.namespace --name 8080 -o json
```

3. **Verify clusters.** Does the cluster exist with the right settings?

```bash
istioctl pc clusters source-pod.namespace --fqdn target.namespace.svc.cluster.local
```

4. **Check endpoints.** Are there healthy endpoints in the cluster?

```bash
istioctl pc endpoints source-pod.namespace --cluster "outbound|8080||target.namespace.svc.cluster.local"
```

This listener-to-route-to-cluster-to-endpoint chain maps exactly to how Envoy processes a request. If any link is broken, traffic fails.

## Comparing Config Between Pods

Sometimes one pod works and another doesn't. Compare their configs:

```bash
istioctl pc routes working-pod.namespace -o json > working-routes.json
istioctl pc routes broken-pod.namespace -o json > broken-routes.json
diff working-routes.json broken-routes.json
```

This quickly highlights differences in routing configuration that explain why one pod behaves differently.

## Summary

The `istioctl proxy-config` command gives you complete visibility into Envoy's actual configuration. Don't trust your YAML - trust what proxy-config shows you. It's the source of truth for how traffic is handled in the mesh. Use it systematically, following the listener-route-cluster-endpoint chain, and most traffic issues become obvious.
