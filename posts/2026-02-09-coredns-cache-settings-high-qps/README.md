# How to Tune CoreDNS Cache Settings for High-QPS Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Performance, Caching, DNS

Description: Optimize CoreDNS cache configuration for high-query-per-second Kubernetes environments to reduce latency, minimize upstream queries, and improve overall cluster performance.

---

DNS caching can make or break performance in high-traffic Kubernetes clusters. Many pod-to-service calls begin with a DNS lookup, and at scale, CoreDNS can become overwhelmed. Proper cache tuning reduces latency, lowers CPU usage, and prevents cascading failures when applications spike in traffic.

## Understanding CoreDNS Cache Behavior

The CoreDNS cache plugin stores DNS responses in memory. When a query arrives, CoreDNS checks the cache first. If the entry exists and hasn't expired, CoreDNS returns it immediately without querying upstream servers. This saves network round trips and reduces load on backend DNS servers.

Default cache settings work fine for small clusters, but high-QPS environments need optimization. Cache size, TTL handling, prefetching, and eviction policies all impact performance.

## Baseline Cache Configuration

Start by examining your current cache setup:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

A typical default configuration:

```yaml
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
    }
    cache 30  # Cache for 30 seconds
    forward . /etc/resolv.conf
    reload
}
```

This caches responses for up to 30 seconds, while still respecting records with lower TTLs. For high-QPS clusters, you need more sophisticated controls.

## Optimizing Cache Size and TTL

Configure cache size and success/denial TTLs separately:

```yaml
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    cache {
        # Cache successful responses for up to 3600 seconds
        success 9984 3600
        # Cache NXDOMAIN/NODATA responses for up to 30 seconds
        denial 9984 30
        # Enable prefetch
        prefetch 10 60s 10%
    }
    forward . /etc/resolv.conf {
        max_concurrent 1000
    }
    reload
}
```

Let's break down these parameters:

- `success 9984 3600`: Cache up to 9984 successful responses for up to 3600 seconds (1 hour)
- `denial 9984 30`: Cache up to 9984 denial-of-existence responses (NXDOMAIN/NODATA) for up to 30 seconds
- `prefetch 10 60s 10%`: Prefetch records if they've been requested at least 10 times with no gap of 60 seconds or more, refreshing them when the TTL drops below 10%

Apply the changes:

```bash
kubectl apply -f coredns-configmap.yaml
```

## Calculating Optimal Cache Size

Determine the right cache size based on your cluster's query patterns. Start by measuring current DNS query volume:

```bash
# Get metrics from CoreDNS

kubectl port-forward -n kube-system svc/kube-dns 9153:9153

# Query Prometheus metrics
curl -s http://localhost:9153/metrics | grep coredns_cache
```

Look for these metrics:

```text
coredns_cache_entries{server="dns://:53",type="denial"} 245
coredns_cache_entries{server="dns://:53",type="success"} 8421
coredns_cache_hits_total{server="dns://:53",type="denial"} 12543
coredns_cache_hits_total{server="dns://:53",type="success"} 845231
coredns_cache_requests_total{server="dns://:53"} 937572
```

Calculate cache hit rate:

```text
hit_rate = hits / requests
hit_rate = (12543 + 845231) / 937572 = 91.5%
```

If your hit rate is below 85%, increase cache size. If you're using less than 70% of allocated cache, reduce it.

For a cluster with 500 services and 2000 pods making frequent requests, start with a cache size of 10000-15000 entries. CoreDNS rounds configured cache capacities down to the nearest multiple of 256:

```yaml
cache {
    success 15000 3600
    denial 5000 30
    prefetch 10 60s 10%
}
```

## Implementing Zone-Specific Caching

Different zones have different caching requirements. Cluster-internal queries can be cached longer than external lookups:

```yaml
# Corefile with zone-specific caching
cluster.local in-addr.arpa ip6.arpa {
    errors
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    # Aggressive caching for internal services
    cache {
        success 20000 3600
        denial 5000 10
        prefetch 5 120s 15%
    }
    prometheus :9153
    reload
}

# External domains
.:53 {
    errors
    # Conservative caching for external domains
    cache {
        success 10000 300
        denial 2000 60
        prefetch 10 60s 10%
    }
    forward . 8.8.8.8 8.8.4.4 {
        max_concurrent 1000
    }
    reload
}
```

This configuration caches internal services for up to 1 hour but external domains for only 5 minutes, reflecting the different stability characteristics.

## Enabling Serve Stale on Upstream Failure

When a cached entry expires, serve stale cache entries while CoreDNS refreshes them:

```yaml
cache {
    success 10000 3600
    denial 5000 30
    prefetch 10 60s 10%
    # Serve stale entries for up to 1 hour after expiry
    serve_stale 3600
}
```

This can keep your applications running during DNS outages. By default, CoreDNS serves expired entries with a TTL of 0 and asynchronously tries to refresh them.

## Prefetch Configuration for Proactive Caching

Prefetching keeps popular records fresh in the cache. When a cached record approaches expiry and has been requested frequently, CoreDNS refreshes it proactively:

```yaml
cache {
    success 10000 3600
    denial 5000 30
    # Prefetch if requested 5+ times, refresh when 20% of the TTL remains
    prefetch 5 60s 20%
}
```

This configuration says: if a record has been requested at least 5 times with no gap of 60 seconds or more between requests, refresh it when 20% of its TTL remains.

For extremely high-QPS services, be more aggressive:

```yaml
cache {
    success 15000 3600
    denial 5000 30
    # Very aggressive prefetch
    prefetch 2 120s 30%
}
```

This refreshes any record requested twice or more, with no gap of 120 seconds or more between requests, when 30% of its TTL is left.

## Memory Optimization

Monitor memory usage to prevent OOM situations:

```bash
# Check CoreDNS memory usage
kubectl top pods -n kube-system -l k8s-app=kube-dns

# Get detailed metrics
kubectl exec -n kube-system coredns-xxxxx -- wget -qO- localhost:9153/metrics | grep process_resident_memory
```

If memory usage is high, consider these adjustments:

```yaml
cache {
    # Reduce cache size
    success 5000 1800
    denial 2000 30
    # Less aggressive prefetch
    prefetch 10 60s 10%
}
```

Or increase CoreDNS resource limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: coredns
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

## Handling Cache Stampede

During pod restarts or when many pods start simultaneously, they all query the same services at once. This cache stampede can overwhelm CoreDNS. Mitigate it with these settings:

```yaml
.:53 {
    errors
    health
    kubernetes cluster.local {
        pods insecure
        ttl 30
    }
    cache {
        success 15000 3600
        denial 5000 30
        prefetch 5 60s 20%
        # Serve stale entries while CoreDNS refreshes them
        serve_stale 3600
    }
    # Limit concurrent upstream queries
    forward . /etc/resolv.conf {
        max_concurrent 500
        expire 10s
    }
    # Keep Kubernetes answers cacheable for a short, bounded period
    reload
}
```

The `ttl 30` setting inside the `kubernetes` plugin keeps service records cacheable for a short, bounded period. CoreDNS does not provide a cache TTL jitter directive; use prefetching, serve-stale behavior, and staggered rollouts to reduce synchronized cache refreshes.

## Monitoring Cache Performance

Set up comprehensive monitoring for cache performance:

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coredns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-dns
  endpoints:
  - port: metrics
    interval: 30s
```

Create alerts for cache issues:

```yaml
# PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: coredns-alerts
  namespace: kube-system
spec:
  groups:
  - name: coredns
    rules:
    - alert: CoreDNSLowCacheHitRate
      expr: |
        sum(rate(coredns_cache_hits_total[5m]))
        /
        sum(rate(coredns_cache_requests_total[5m]))
        < 0.80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "CoreDNS cache hit rate below 80%"
        description: "Cache hit rate is {{ $value | humanizePercentage }}"

    - alert: CoreDNSCacheFull
      expr: |
        sum(rate(coredns_cache_evictions_total[5m])) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "CoreDNS cache is evicting entries"
        description: "CoreDNS cache evictions are occurring, which can indicate an undersized cache for the current query pattern."
```

## Testing Cache Configuration

Benchmark your cache settings under load:

```bash
# Create a test pod with dnsperf
kubectl run dns-benchmark --image=debian:stable-slim -it --rm -- bash

# Inside the pod
apt-get update
apt-get install -y dnsutils dnsperf

# Generate query list
cat > queries.txt << EOF
kubernetes.default.svc.cluster.local A
api.production.svc.cluster.local A
database.production.svc.cluster.local A
cache.production.svc.cluster.local A
EOF

# Run benchmark
dnsperf -d queries.txt -s 10.96.0.10 -l 60 -c 100 -Q 10000

# Results show queries per second and latency; compare CoreDNS metrics for cache hit rate
```

Compare results before and after tuning. Look for:

- Increased queries per second
- Lower latency (p50, p95, p99)
- Higher cache hit rate
- Reduced CoreDNS CPU usage

## Best Practices for High-QPS Clusters

Follow these guidelines for optimal cache performance:

- Start with conservative settings and tune based on metrics
- Use zone-specific caching for different domains
- Enable prefetch for frequently accessed records
- Configure serve_stale to handle upstream failures
- Monitor cache hit rates and adjust size accordingly
- Set appropriate resource limits for CoreDNS pods
- Use multiple CoreDNS replicas for redundancy and load distribution
- Consider NodeLocal DNSCache for clusters with 50+ nodes
- Use prefetching, serve-stale behavior, and staggered rollouts to reduce stampede scenarios
- Regularly review and update cache configuration as traffic patterns change

Proper cache tuning transforms CoreDNS from a potential bottleneck into an efficient, high-performance component of your Kubernetes infrastructure. In high-QPS environments, these optimizations can materially reduce DNS query latency while significantly lowering resource consumption.
