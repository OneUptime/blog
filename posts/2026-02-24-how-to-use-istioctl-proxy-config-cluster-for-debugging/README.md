# How to Use istioctl proxy-config cluster for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, istioctl, Envoy, Kubernetes, Cluster Configuration

Description: How to use istioctl proxy-config cluster to inspect Envoy cluster configuration and debug upstream connectivity issues in Istio.

---

In Envoy's terminology, a "cluster" is an upstream service that the proxy can route traffic to. Every Kubernetes service in your mesh becomes one or more Envoy clusters in every sidecar proxy. When traffic is not reaching the right destination, or connections are failing to upstream services, inspecting the cluster configuration is one of the most useful debugging steps.

The `istioctl proxy-config cluster` command shows you exactly what upstream services an Envoy proxy knows about and how it is configured to connect to them.

## Basic Usage

```bash
istioctl proxy-config cluster <pod-name>.<namespace>
```

For example:

```bash
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo
```

Output:

```
SERVICE FQDN                                    PORT     SUBSET     DIRECTION     TYPE           DESTINATION RULE
BlackHoleCluster                                 -        -          -             STATIC
agent                                            -        -          -             STATIC
details.bookinfo.svc.cluster.local               9080     -          outbound      EDS            details.bookinfo
httpbin.default.svc.cluster.local                 8000     -          outbound      EDS
kubernetes.default.svc.cluster.local              443      -          outbound      EDS
productpage.bookinfo.svc.cluster.local            9080     -          outbound      EDS
ratings.bookinfo.svc.cluster.local                9080     -          outbound      EDS            ratings.bookinfo
reviews.bookinfo.svc.cluster.local                9080     -          outbound      EDS            reviews.bookinfo
reviews.bookinfo.svc.cluster.local                9080     v1         outbound      EDS            reviews.bookinfo
reviews.bookinfo.svc.cluster.local                9080     v2         outbound      EDS            reviews.bookinfo
reviews.bookinfo.svc.cluster.local                9080     v3         outbound      EDS            reviews.bookinfo
```

## Understanding the Output

**SERVICE FQDN**: The fully qualified domain name of the upstream service. This is the Kubernetes service name.

**PORT**: The port number the cluster is configured for.

**SUBSET**: If a DestinationRule defines subsets, each subset gets its own cluster. Notice how `reviews` has separate clusters for v1, v2, and v3.

**DIRECTION**: Either `outbound` (traffic going to this service) or `inbound` (traffic coming into this proxy's pod).

**TYPE**: How Envoy discovers the endpoints for this cluster.
- `EDS` (Endpoint Discovery Service): Endpoints are provided by istiod. This is the normal mode for Kubernetes services.
- `STATIC`: Endpoints are hardcoded. Used for internal Envoy clusters like `agent` and `BlackHoleCluster`.
- `STRICT_DNS`: Endpoints are resolved via DNS.
- `ORIGINAL_DST`: Traffic is forwarded to the original destination IP. Used for passthrough traffic.

**DESTINATION RULE**: Shows which DestinationRule applies to this cluster, if any.

## Debugging Missing Services

If a service is not appearing in the cluster list, the proxy does not know how to reach it. This can happen when:

1. The service is in a different namespace and there is no ServiceEntry for it
2. The Sidecar resource restricts the proxy's view of services
3. The service was just created and the proxy has not synced yet

Check if a specific service is present:

```bash
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo | grep "my-service"
```

If it is missing, check the Sidecar configuration:

```bash
kubectl get sidecar -n bookinfo -o yaml
```

A Sidecar resource can restrict which services are visible to proxies in a namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: bookinfo
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This Sidecar only allows access to services in the same namespace and the istio-system namespace. Services in other namespaces will not appear in the cluster list.

## Getting Detailed Cluster Configuration

Use the `-o json` flag for the full Envoy cluster configuration:

```bash
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --fqdn "reviews.bookinfo.svc.cluster.local" -o json
```

This shows the complete Envoy cluster definition including:

```json
[
  {
    "name": "outbound|9080||reviews.bookinfo.svc.cluster.local",
    "type": "EDS",
    "edsClusterConfig": {
      "edsConfig": {
        "ads": {},
        "initialFetchTimeout": "0s",
        "resourceApiVersion": "V3"
      },
      "serviceName": "outbound|9080||reviews.bookinfo.svc.cluster.local"
    },
    "connectTimeout": "10s",
    "circuitBreakers": {
      "thresholds": [
        {
          "maxConnections": 4294967295,
          "maxPendingRequests": 4294967295,
          "maxRequests": 4294967295,
          "maxRetries": 4294967295
        }
      ]
    },
    "transportSocket": {
      "name": "envoy.transport_sockets.tls",
      "typedConfig": {
        "commonTlsContext": {
          "tlsCertificateSdsSecretConfigs": [...]
        }
      }
    }
  }
]
```

## Debugging Connection Pool Settings

When you apply a DestinationRule with connection pool settings, verify they appear in the cluster config:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-pool
  namespace: bookinfo
spec:
  host: reviews.bookinfo.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
```

After applying, check the cluster:

```bash
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --fqdn "reviews.bookinfo.svc.cluster.local" -o json | grep -A5 "circuitBreakers"
```

You should see the values you configured:

```json
"circuitBreakers": {
  "thresholds": [
    {
      "maxConnections": 100,
      "maxPendingRequests": 50,
      "maxRequests": 200,
      "maxRetries": 4294967295
    }
  ]
}
```

If you still see the default huge values (4294967295), the DestinationRule is not being applied to this proxy. Check the host name matches exactly.

## Debugging Subset Configuration

When VirtualService routes to a subset but traffic is not flowing, verify the subset cluster exists:

```bash
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo | grep reviews
```

If you see the main reviews cluster but not the subset clusters (v1, v2, v3), the DestinationRule that defines those subsets is missing or has errors:

```bash
kubectl get destinationrule -n bookinfo
kubectl describe destinationrule reviews -n bookinfo
```

## Debugging mTLS Configuration

The cluster configuration shows whether mTLS is configured for upstream connections. Check the transport socket:

```bash
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --fqdn "reviews.bookinfo.svc.cluster.local" -o json | grep -A20 "transportSocket"
```

If mTLS is enabled, you will see `envoy.transport_sockets.tls` with SDS secret configurations. If mTLS is disabled for a particular destination, the transport socket section will be absent.

## Filtering Clusters

For proxies with many clusters, filter by various criteria:

```bash
# Filter by FQDN
istioctl proxy-config cluster <pod>.<ns> --fqdn "reviews"

# Filter by port
istioctl proxy-config cluster <pod>.<ns> --port 9080

# Filter by subset
istioctl proxy-config cluster <pod>.<ns> --subset v1

# Filter by direction
istioctl proxy-config cluster <pod>.<ns> --direction outbound
```

## Comparing Clusters Between Proxies

If two pods should be seeing the same clusters but behave differently, compare their cluster lists:

```bash
istioctl proxy-config cluster pod-a.namespace > /tmp/clusters-a.txt
istioctl proxy-config cluster pod-b.namespace > /tmp/clusters-b.txt
diff /tmp/clusters-a.txt /tmp/clusters-b.txt
```

Differences indicate that the proxies have different DestinationRules or Sidecar configurations applied.

The `istioctl proxy-config cluster` command is essential for debugging routing and connectivity issues. Whenever traffic is not reaching the right upstream service, start here to verify that the Envoy proxy even knows about the destination and how it is configured to connect.
