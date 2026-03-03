# How to Optimize Istio DNS Resolution Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Performance, Networking, Optimization

Description: How to configure and optimize DNS resolution in Istio for faster service lookups and reduced latency overhead.

---

DNS resolution in Kubernetes is often an overlooked source of latency. Every time a service makes a request to another service by name, there is a DNS lookup involved. In a mesh with Istio, DNS behavior changes depending on whether you use the Istio DNS proxy, the standard kube-dns/CoreDNS, or a combination. Getting DNS right can shave off milliseconds from every request, and at high request rates, that adds up.

## How DNS Works in an Istio Mesh

By default (without the Istio DNS proxy), DNS resolution follows the standard Kubernetes path:

1. Application calls `my-service.my-namespace.svc.cluster.local`
2. The request goes to CoreDNS (or kube-dns)
3. CoreDNS resolves it to a ClusterIP
4. The sidecar proxy intercepts the connection to the ClusterIP
5. Envoy does its own load balancing to the actual endpoint

When you enable the Istio DNS proxy, the flow changes:

1. Application calls `my-service.my-namespace.svc.cluster.local`
2. The Istio agent intercepts the DNS query (via iptables)
3. The agent resolves it locally using information from istiod
4. The response goes directly back to the application

The second path is faster because it avoids the round trip to CoreDNS.

## Enable the Istio DNS Proxy

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

`ISTIO_META_DNS_CAPTURE` redirects DNS queries to the local Istio agent. `ISTIO_META_DNS_AUTO_ALLOCATE` assigns virtual IPs to ServiceEntry hosts that do not have explicit addresses.

Verify it is working:

```bash
# Check if DNS capture is active
kubectl exec deploy/my-app -c istio-proxy -- pilot-agent request GET /dns_resolve/my-service.my-namespace.svc.cluster.local

# Check iptables rules
kubectl exec deploy/my-app -c istio-proxy -- iptables -t nat -L ISTIO_OUTPUT | grep 15053
```

## Reduce DNS Lookup Latency

With the Istio DNS proxy enabled, DNS lookups are resolved locally. But you can further optimize by reducing the number of lookups:

**Use short service names**: When calling services in the same namespace, use the short name (`my-service` instead of `my-service.my-namespace.svc.cluster.local`). The search domains in `/etc/resolv.conf` handle the expansion, but the DNS client might try multiple expansions before finding the right one.

Check what search domains are configured:

```bash
kubectl exec deploy/my-app -- cat /etc/resolv.conf
```

You will see something like:

```text
search my-namespace.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
ndots:5
```

The `ndots:5` setting means any name with fewer than 5 dots triggers a search through all search domains. A call to `my-service` (0 dots) generates queries for:
1. `my-service.my-namespace.svc.cluster.local`
2. `my-service.svc.cluster.local`
3. `my-service.cluster.local`
4. `my-service` (absolute)

Only the first one succeeds, but all four consume DNS resources.

## Reduce ndots

Lowering `ndots` reduces unnecessary DNS queries:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      dnsConfig:
        options:
        - name: ndots
          value: "2"
```

With `ndots: 2`, a name like `my-service` (0 dots) still goes through search domains, but `api.external.com` (2 dots) is resolved directly without trying search domains first. This is a good compromise that handles internal service names correctly while avoiding unnecessary lookups for external domains.

## Use Fully Qualified Domain Names

For external services, always use FQDNs with a trailing dot to skip the search domain expansion entirely:

```bash
# In application code, use:
api.external-service.com.
# instead of:
api.external-service.com
```

The trailing dot tells the DNS resolver that this is already a fully qualified name and should not be expanded with search domains.

## Optimize CoreDNS

Even with the Istio DNS proxy, some queries might still go to CoreDNS (for domains the Istio agent does not know about). Optimize CoreDNS for performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
        }
        cache 60
        forward . /etc/resolv.conf {
          max_concurrent 1000
        }
        reload
        loadbalance
    }
```

The `cache 60` line caches DNS responses for 60 seconds. Increasing this to 300 seconds can reduce the load on upstream DNS servers:

```text
cache 300
```

## Scale CoreDNS

If CoreDNS is a bottleneck, scale it up:

```bash
kubectl -n kube-system scale deployment coredns --replicas=5
```

Or use the DNS autoscaler:

```yaml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: coredns
  namespace: kube-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: coredns
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

## Monitor DNS Performance

Track DNS resolution latency:

```bash
# Test DNS resolution time
kubectl exec deploy/my-app -- time nslookup my-service.my-namespace.svc.cluster.local

# Check CoreDNS metrics
kubectl exec deploy/coredns -n kube-system -- wget -qO- http://localhost:9153/metrics | grep coredns_dns_request_duration

# Check Istio DNS proxy stats
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep dns
```

Key metrics to watch in Prometheus:

```text
# CoreDNS query latency
histogram_quantile(0.99, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le))

# CoreDNS query rate
sum(rate(coredns_dns_requests_total[5m]))

# CoreDNS cache hit rate
sum(rate(coredns_cache_hits_total[5m])) / (sum(rate(coredns_cache_hits_total[5m])) + sum(rate(coredns_cache_misses_total[5m])))
```

## Handle High DNS Query Rates

If your services make thousands of DNS queries per second (common with microservices that call many backends), the Istio DNS proxy helps by resolving locally. But you should also consider:

**Connection pooling in your application**: Reuse HTTP connections instead of creating new ones for every request. New connections often trigger DNS lookups.

**DNS caching in the application**: Many HTTP clients have built-in DNS caching. Enable it and set appropriate TTLs.

**Prewarming connections**: For services you know you will call, establish connections at startup rather than on the first request.

```yaml
# Keep connections alive to reduce DNS lookups
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: connection-reuse
  namespace: my-namespace
spec:
  host: "*.my-namespace.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        tcpKeepalive:
          time: 300s
      http:
        maxRequestsPerConnection: 0
```

DNS optimization is one of those things that is easy to overlook because each individual lookup is fast. But when your services make millions of requests per day, those microseconds per lookup compound into real latency savings. Enable the Istio DNS proxy, reduce unnecessary lookups with proper ndots settings and FQDNs, and keep connections alive to avoid repeated resolutions.
