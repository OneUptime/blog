# How to View Envoy Cluster Configuration with istioctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Cluster, Istioctl, Kubernetes, Service Mesh

Description: Learn how to inspect Envoy cluster configuration using istioctl to debug upstream service connections, circuit breakers, and load balancing.

---

In Envoy's configuration model, a "cluster" represents an upstream service that the proxy can route traffic to. Each cluster defines how Envoy connects to that service - the protocol, load balancing algorithm, health checking, circuit breaking, and TLS settings. When traffic isn't reaching the right backend or connections are failing, the cluster configuration is where you look.

## What is an Envoy Cluster?

Think of a cluster as Envoy's view of a destination service. When you create a Kubernetes Service called `reviews` on port 9080, Istio creates an Envoy cluster named something like `outbound|9080||reviews.default.svc.cluster.local`. If you add DestinationRule subsets, each subset gets its own cluster: `outbound|9080|v1|reviews.default.svc.cluster.local`.

The cluster name follows a pattern: `direction|port|subset|FQDN`.

- **direction** - `outbound` for traffic leaving the pod, `inbound` for traffic entering
- **port** - The service port
- **subset** - The DestinationRule subset name (empty if no subset)
- **FQDN** - The fully qualified domain name of the service

## Viewing Clusters

The basic command:

```bash
istioctl proxy-config clusters productpage-v1-abc123.default
```

Output:

```text
SERVICE FQDN                                    PORT   SUBSET   DIRECTION   TYPE          DESTINATION RULE
BlackHoleCluster                                -      -        -           STATIC
PassthroughCluster                              -      -        -           ORIGINAL_DST
agent                                           -      -        -           STATIC
details.default.svc.cluster.local               9080   -        outbound    EDS
kubernetes.default.svc.cluster.local            443    -        outbound    EDS
productpage.default.svc.cluster.local           9080   -        inbound     ORIGINAL_DST
ratings.default.svc.cluster.local               9080   -        outbound    EDS
reviews.default.svc.cluster.local               9080   v1       outbound    EDS           reviews-dr.default
reviews.default.svc.cluster.local               9080   v2       outbound    EDS           reviews-dr.default
reviews.default.svc.cluster.local               9080   v3       outbound    EDS           reviews-dr.default
```

Several things to notice:

**BlackHoleCluster** drops all traffic. It's used as a catch-all for traffic that doesn't match any route.

**PassthroughCluster** forwards traffic to the original destination without load balancing. It handles traffic to services that Istio doesn't know about.

**ORIGINAL_DST** type means the cluster sends traffic to the original destination IP. **EDS** means endpoints are dynamically discovered from Istiod. **STATIC** means the endpoints are hardcoded in the config.

## Filtering Clusters

When you have a large mesh with hundreds of services, the cluster list gets long. Filter by FQDN:

```bash
istioctl pc clusters productpage-v1-abc123.default \
  --fqdn reviews.default.svc.cluster.local
```

Filter by port:

```bash
istioctl pc clusters productpage-v1-abc123.default --port 9080
```

Filter by direction:

```bash
istioctl pc clusters productpage-v1-abc123.default --direction outbound
```

Combine filters:

```bash
istioctl pc clusters productpage-v1-abc123.default \
  --fqdn reviews.default.svc.cluster.local --port 9080 --direction outbound
```

## Detailed JSON Output

The table view is good for an overview, but the JSON output reveals everything:

```bash
istioctl pc clusters productpage-v1-abc123.default \
  --fqdn reviews.default.svc.cluster.local -o json
```

Here's what a typical cluster looks like in JSON (trimmed for readability):

```json
[
  {
    "name": "outbound|9080|v1|reviews.default.svc.cluster.local",
    "type": "EDS",
    "edsClusterConfig": {
      "edsConfig": {
        "ads": {},
        "initialFetchTimeout": "0s",
        "resourceApiVersion": "V3"
      },
      "serviceName": "outbound|9080|v1|reviews.default.svc.cluster.local"
    },
    "connectTimeout": "10s",
    "lbPolicy": "LEAST_REQUEST",
    "circuitBreakers": {
      "thresholds": [
        {
          "maxConnections": 1024,
          "maxPendingRequests": 1024,
          "maxRequests": 1024,
          "maxRetries": 3
        }
      ]
    },
    "transportSocket": {
      "name": "envoy.transport_sockets.tls",
      "typedConfig": {
        "commonTlsContext": {
          "alpnProtocols": ["istio-peer-exchange", "istio"],
          "tlsCertificateSdsSecretConfigs": [
            {
              "name": "default",
              "sdsConfig": { "ads": {} }
            }
          ],
          "validationContextSdsSecretConfig": {
            "name": "ROOTCA",
            "sdsConfig": { "ads": {} }
          }
        },
        "sni": "outbound_.9080_.v1_.reviews.default.svc.cluster.local"
      }
    }
  }
]
```

## Understanding Key Fields

### Connection Timeout

```json
"connectTimeout": "10s"
```

How long Envoy waits for a TCP connection to the upstream. If this is too short, you'll see connection timeout errors under network pressure.

Set it through a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-dr
spec:
  host: reviews.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 30s
```

### Load Balancing Policy

```json
"lbPolicy": "LEAST_REQUEST"
```

Options include `ROUND_ROBIN`, `LEAST_REQUEST`, `RANDOM`, and `RING_HASH`. Set via DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-dr
spec:
  host: reviews.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

### Circuit Breakers

```json
"circuitBreakers": {
  "thresholds": [
    {
      "maxConnections": 1024,
      "maxPendingRequests": 1024,
      "maxRequests": 1024,
      "maxRetries": 3
    }
  ]
}
```

These control how many connections and requests Envoy allows to the upstream. If any threshold is exceeded, Envoy returns 503 errors instead of forwarding the request. This prevents cascading failures.

Configure with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-dr
spec:
  host: reviews.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

### TLS Configuration

The `transportSocket` section shows how mTLS is configured. If you see `envoy.transport_sockets.tls`, mTLS is enabled for this cluster. The `sni` field shows the Server Name Indication used for the TLS handshake.

If mTLS is disabled (PERMISSIVE mode), you might see the transport socket absent or configured differently.

## Debugging Common Cluster Issues

### Missing Cluster

If a cluster for your service doesn't appear:

```bash
istioctl pc clusters my-pod.default --fqdn my-service.default.svc.cluster.local
```

No results? Check that the Kubernetes Service exists:

```bash
kubectl get svc my-service -n default
```

Also check that Istiod knows about it:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s localhost:15014/debug/registryz | python3 -m json.tool | grep my-service
```

### Circuit Breaker Tripping

If you're getting 503 errors with `UO` (upstream overflow) in access logs, the circuit breaker is rejecting requests. Check the current settings:

```bash
istioctl pc clusters my-pod.default \
  --fqdn reviews.default.svc.cluster.local -o json | \
  python3 -c "import sys,json; data=json.load(sys.stdin); print(json.dumps(data[0].get('circuitBreakers',{}), indent=2))"
```

Then either increase the limits or address the root cause (why is the upstream overloaded?).

### Subset Not Appearing

If you defined subsets in a DestinationRule but don't see separate clusters:

```bash
istioctl pc clusters my-pod.default \
  --fqdn reviews.default.svc.cluster.local
```

If only the base cluster (no subset) appears, the DestinationRule might have errors. Check it:

```bash
istioctl analyze -n default
kubectl get destinationrule reviews-dr -n default -o yaml
```

Verify that the subset labels actually match pods. A subset with `version: v4` but no pods with that label won't create endpoints, but the cluster should still appear.

### Wrong Load Balancing

If traffic isn't distributed the way you expect, check the `lbPolicy` field in the JSON output. If you configured `ROUND_ROBIN` but see `LEAST_REQUEST`, there might be a conflicting DestinationRule or the rule isn't applied correctly.

## Monitoring Cluster Health

Envoy exposes per-cluster stats that you can check via the admin interface:

```bash
kubectl exec my-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "cluster.outbound|9080|v1|reviews"
```

Key metrics:
- `upstream_cx_active` - Active connections
- `upstream_cx_total` - Total connections
- `upstream_rq_active` - Active requests
- `upstream_rq_total` - Total requests
- `upstream_rq_503` - 503 errors from the upstream
- `upstream_cx_connect_fail` - Failed connections
- `circuit_breakers.default.cx_open` - Whether the connection circuit breaker is open

These stats tell you in real time how the cluster is performing.

## Summary

Envoy clusters are the configuration layer that controls how your proxy talks to upstream services. The `istioctl proxy-config clusters` command lets you verify that your DestinationRules are translated correctly, circuit breakers are tuned properly, and TLS is configured as expected. When services fail to communicate, cluster inspection is often where you find the answer.
