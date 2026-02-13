# How to Configure CoreDNS Cache Plugin with Custom TTL and Negative Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Performance, DNS

Description: Learn how to configure CoreDNS cache plugin with custom TTL values, negative caching, and prefetching to optimize DNS performance and reduce query latency in Kubernetes clusters.

---

DNS caching is one of the most effective optimizations for Kubernetes cluster performance. Proper cache configuration reduces query latency, lowers CoreDNS server load, and improves application responsiveness. The CoreDNS cache plugin provides sophisticated caching capabilities including custom TTL values, negative caching, and prefetching.

This guide shows you how to configure and tune the cache plugin for optimal performance in production environments.

## Understanding DNS Cache Fundamentals

DNS caching stores query results to avoid repeated lookups. The cache plugin intercepts queries and serves cached responses when available. Cache entries expire based on TTL (Time To Live) values.

Key caching concepts:

- **Positive caching**: Stores successful query results
- **Negative caching**: Caches failed queries (NXDOMAIN responses)
- **TTL override**: Customize cache duration regardless of upstream TTL
- **Prefetching**: Proactively refresh popular entries before expiration
- **Cache size**: Maximum number of entries to store

## Basic Cache Configuration

The default CoreDNS cache configuration is minimal:

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
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30  # Cache all responses for 30 seconds
        loop
        reload
        loadbalance
    }
```

This caches all responses for 30 seconds, regardless of their original TTL.

## Advanced Cache Configuration with Custom TTL

Configure separate TTL values for successful and failed queries:

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

    # Advanced cache configuration
    cache 300 {
        # Success cache: 8192 entries, 300 second TTL
        success 8192 300

        # Denial (negative) cache: 2048 entries, 60 second TTL
        denial 2048 60

        # Prefetch entries when 10% of TTL remains
        # Check every 60 minutes, prefetch if accessed at least 10% of the time
        prefetch 10 60m 10%
    }

    prometheus :9153
    forward . /etc/resolv.conf
    loop
    reload
    loadbalance
}
```

This configuration:
- Caches successful queries for 5 minutes (300s)
- Caches failed queries for 1 minute (60s)
- Stores up to 8192 successful responses
- Stores up to 2048 negative responses
- Prefetches popular entries before expiration

Apply the configuration:

```bash
# Save configuration
kubectl apply -f coredns-config.yaml

# Restart CoreDNS pods
kubectl rollout restart deployment coredns -n kube-system

# Verify pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

## Configuring Negative Caching

Negative caching prevents repeated queries for non-existent domains:

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

    cache 600 {
        # Success cache: longer TTL for valid responses
        success 16384 600

        # Negative cache: shorter TTL to catch newly created services
        denial 4096 30

        # Serve stale entries for up to 1 hour if upstream is down
        serve_stale 3600
    }

    prometheus :9153
    forward . /etc/resolv.conf
    loop
    reload
}
```

The `serve_stale` directive returns expired cache entries if upstream servers are unavailable, improving resilience.

## Environment-Specific Cache Tuning

Different environments benefit from different cache strategies:

**Development Environment (frequent changes):**

```yaml
.:53 {
    errors
    health
    ready

    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 10
    }

    # Short TTL for rapid iteration
    cache 30 {
        success 4096 30
        denial 1024 10
    }

    prometheus :9153
    forward . /etc/resolv.conf
    loop
    reload
}
```

**Production Environment (stability focused):**

```yaml
.:53 {
    errors
    health
    ready

    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 60
    }

    # Longer TTL for better performance
    cache 900 {
        success 32768 900
        denial 8192 300
        prefetch 20 120m 5%
        serve_stale 7200
    }

    prometheus :9153
    forward . /etc/resolv.conf
    loop
    reload
}
```

## Implementing Cache Prefetching

Prefetching keeps popular entries fresh:

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

    cache 600 {
        success 16384 600
        denial 4096 60

        # Prefetch parameters:
        # prefetch <amount> <duration> <percentage>
        # amount: prefetch when this much of TTL remains (seconds)
        # duration: check interval
        # percentage: minimum hit rate to trigger prefetch
        prefetch 20 60m 10%
    }

    prometheus :9153
    forward . /etc/resolv.conf
    loop
    reload
}
```

This configuration prefetches entries that:
- Have 20 seconds or less remaining on their TTL
- Have been accessed at least 10% of the time during the last 60 minutes

## Zone-Specific Cache Configuration

Apply different cache policies to different zones:

```yaml
# Cluster-local zone with aggressive caching
cluster.local:53 {
    errors
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    cache 600 {
        success 32768 600
        denial 8192 120
        prefetch 30 30m 5%
    }
    prometheus :9153
}

# External domains with moderate caching
.:53 {
    errors
    health
    ready
    forward . /etc/resolv.conf
    cache 300 {
        success 8192 300
        denial 2048 60
    }
    loop
    reload
    loadbalance
    prometheus :9153
}
```

## Monitoring Cache Performance

Track cache effectiveness with Prometheus metrics:

```bash
# Port forward to CoreDNS metrics endpoint
kubectl port-forward -n kube-system svc/kube-dns 9153:9153

# Query cache metrics
curl http://localhost:9153/metrics | grep coredns_cache
```

Key metrics to monitor:

```promql
# Cache hit ratio
sum(rate(coredns_cache_hits_total[5m])) / sum(rate(coredns_cache_requests_total[5m]))

# Cache size utilization
coredns_cache_entries

# Cache hit rate by type
sum(rate(coredns_cache_hits_total[5m])) by (type)

# Cache miss rate
sum(rate(coredns_cache_misses_total[5m]))
```

Create a Grafana dashboard configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-cache-dashboard
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "CoreDNS Cache Performance",
        "panels": [
          {
            "title": "Cache Hit Ratio",
            "targets": [
              {
                "expr": "sum(rate(coredns_cache_hits_total[5m])) / sum(rate(coredns_cache_requests_total[5m]))"
              }
            ]
          },
          {
            "title": "Cache Entries",
            "targets": [
              {
                "expr": "coredns_cache_entries"
              }
            ]
          },
          {
            "title": "Cache Evictions",
            "targets": [
              {
                "expr": "rate(coredns_cache_evictions_total[5m])"
              }
            ]
          }
        ]
      }
    }
```

## Testing Cache Configuration

Create a test to verify cache behavior:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cache-test
data:
  test-cache.sh: |
    #!/bin/bash

    SERVICE="kubernetes.default.svc.cluster.local"

    echo "Testing DNS cache behavior..."

    # First query (cache miss)
    echo "Query 1 (expect cache miss):"
    time nslookup $SERVICE

    # Second query (should hit cache)
    echo "Query 2 (expect cache hit):"
    time nslookup $SERVICE

    # Third query (should hit cache)
    echo "Query 3 (expect cache hit):"
    time nslookup $SERVICE

    # Wait for negative cache test
    echo "Testing negative cache..."
    FAKE_SERVICE="non-existent-service.default.svc.cluster.local"

    # First query to non-existent service
    echo "Query 1 to non-existent service:"
    time nslookup $FAKE_SERVICE 2>&1 || true

    # Second query (should hit negative cache)
    echo "Query 2 to non-existent service:"
    time nslookup $FAKE_SERVICE 2>&1 || true
---
apiVersion: v1
kind: Pod
metadata:
  name: cache-test
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command:
    - sh
    - /scripts/test-cache.sh
    volumeMounts:
    - name: scripts
      mountPath: /scripts
  volumes:
  - name: scripts
    configMap:
      name: cache-test
  restartPolicy: Never
```

Run the test:

```bash
# Deploy test
kubectl apply -f cache-test.yaml

# View results
kubectl logs cache-test

# Clean up
kubectl delete pod cache-test
```

## Cache Performance Alerts

Set up alerts for cache issues:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-coredns-alerts
data:
  alerts.yaml: |
    groups:
    - name: coredns-cache
      interval: 30s
      rules:
      - alert: LowCacheHitRate
        expr: |
          (
            sum(rate(coredns_cache_hits_total[5m]))
            /
            sum(rate(coredns_cache_requests_total[5m]))
          ) < 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS cache hit rate is low"
          description: "Cache hit rate has dropped below 70% for 10 minutes"

      - alert: HighCacheEvictionRate
        expr: rate(coredns_cache_evictions_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High DNS cache eviction rate"
          description: "Cache is evicting more than 100 entries per second"

      - alert: CacheNearCapacity
        expr: coredns_cache_entries > 30000
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "DNS cache approaching capacity"
          description: "Cache has more than 30k entries, consider increasing cache size"
```

## Troubleshooting Cache Issues

**Issue: Low cache hit rate**

Check if TTL is too short:

```bash
# View cache metrics
kubectl port-forward -n kube-system svc/kube-dns 9153:9153
curl http://localhost:9153/metrics | grep coredns_cache_hits_total
```

Increase cache TTL and size:

```yaml
cache 900 {
    success 32768 900
    denial 8192 300
}
```

**Issue: High cache eviction rate**

Increase cache size:

```yaml
cache 600 {
    # Increase from 8192 to 32768
    success 32768 600
    denial 8192 60
}
```

**Issue: Stale data being served**

Reduce TTL values:

```yaml
cache 120 {
    success 8192 120
    denial 2048 30
}
```

Or disable serve_stale if enabled:

```yaml
cache 300 {
    success 8192 300
    denial 2048 60
    # Remove serve_stale directive
}
```

## Best Practices

Implement these best practices for production cache configuration:

1. Start with conservative TTL values and increase based on metrics
2. Monitor cache hit rates continuously
3. Use longer TTL for stable services, shorter for dynamic ones
4. Enable negative caching to prevent query storms
5. Implement prefetching for high-traffic services
6. Size cache appropriately for your cluster scale
7. Configure serve_stale for improved resilience
8. Test cache behavior before production deployment
9. Document cache settings and tuning rationale
10. Review cache metrics during incident investigations

Proper CoreDNS cache configuration dramatically improves DNS performance in Kubernetes. By tuning TTL values, implementing negative caching, and enabling prefetching, you reduce latency and server load while maintaining fresh data. Combined with monitoring and alerting, you create a robust DNS infrastructure that scales with your cluster.

For additional DNS optimizations, explore our guides on [CoreDNS autopath plugin](https://oneuptime.com/blog/post/2026-02-09-coredns-autopath-plugin-latency/view) and [NodeLocal DNSCache](https://oneuptime.com/blog/post/2026-02-09-nodelocal-dnscache-improve-latency/view).
