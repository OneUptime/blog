# How to Configure DNS Caching on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Caching, CoreDNS, Performance, Kubernetes

Description: Optimize DNS performance on Talos Linux clusters by configuring caching at multiple levels to reduce latency and upstream query load.

---

Every DNS query that leaves your cluster adds latency to your application. In a busy Talos Linux cluster, pods can generate thousands of DNS queries per second, and each one that misses the cache has to travel to an upstream resolver and back. Properly configured DNS caching can dramatically reduce query latency and cut the load on both CoreDNS and your upstream DNS servers.

This guide covers DNS caching strategies at every level of the Talos Linux stack, from CoreDNS tuning to node-local caching.

## Understanding DNS Caching Layers

In a Talos Linux cluster, DNS caching can happen at several layers:

1. Application-level caching (in the app itself or its runtime)
2. Pod-level caching (using a sidecar DNS cache)
3. Node-level caching (NodeLocal DNSCache)
4. CoreDNS caching (the built-in cache plugin)
5. Upstream resolver caching (external DNS servers)

Each layer adds another chance to serve a response without going further up the chain. The closer the cache is to the application, the lower the latency.

## Tuning CoreDNS Cache Settings

CoreDNS includes a `cache` plugin that is enabled by default with a 30-second TTL. You can tune this significantly:

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
        health {
           lazystart
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153

        cache {
            success 9984 300 30
            denial 9984 60 5
            prefetch 10 1m 10%
            serve_stale 1h
        }

        forward . 8.8.8.8 1.1.1.1 {
           max_concurrent 1000
        }
        loop
        reload
        loadbalance
    }
```

Let me break down each cache directive:

```
# success <max_entries> <max_ttl> <min_ttl>
# Cache up to 9984 successful responses
# Use the record's TTL but cap at 300 seconds
# Minimum cache time is 30 seconds even if the record says less
success 9984 300 30

# denial <max_entries> <max_ttl> <min_ttl>
# Cache NXDOMAIN and other negative responses
# Keep them for up to 60 seconds, minimum 5 seconds
denial 9984 60 5

# prefetch <threshold> <duration> <percentage>
# If a cached entry gets 10+ queries within 1 minute
# and is within 10% of expiring, refresh it proactively
prefetch 10 1m 10%

# serve_stale <duration>
# If upstream is unreachable, serve expired cache entries
# for up to 1 hour rather than returning SERVFAIL
serve_stale 1h
```

The `prefetch` option is particularly valuable. It refreshes popular cache entries before they expire, so high-traffic services never experience a cache miss.

The `serve_stale` option improves resilience. If your upstream DNS servers go down, CoreDNS will continue serving cached responses (even expired ones) for the specified duration rather than immediately failing.

## Monitoring Cache Performance

Check how well your cache is performing using CoreDNS metrics:

```bash
# Port-forward to CoreDNS metrics
kubectl port-forward -n kube-system svc/kube-dns 9153:9153 &

# Check cache hit/miss rates
curl -s localhost:9153/metrics | grep coredns_cache_hits_total
curl -s localhost:9153/metrics | grep coredns_cache_misses_total
curl -s localhost:9153/metrics | grep coredns_cache_entries

# Calculate hit rate
HITS=$(curl -s localhost:9153/metrics | grep 'coredns_cache_hits_total{' | awk '{sum+=$2}END{print sum}')
MISSES=$(curl -s localhost:9153/metrics | grep 'coredns_cache_misses_total' | awk '{sum+=$2}END{print sum}')
echo "Cache hit rate: $(echo "scale=2; $HITS / ($HITS + $MISSES) * 100" | bc)%"
```

A healthy cache should have a hit rate above 80%. If your hit rate is low, consider increasing cache size or TTL values.

## Setting Up Per-Domain Cache Policies

Different domains may need different cache durations. Internal services change frequently, while external domains are more stable:

```
.:53 {
    errors
    health {
       lazystart
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153

    # Short cache for cluster-internal lookups
    cache 30 {
        success 4096 30 5
        denial 2048 10 5
    }

    forward . 8.8.8.8 1.1.1.1 {
       max_concurrent 1000
    }
    loop
    reload
    loadbalance
}

# Longer cache for stable external domains
example.com:53 {
    cache 600 {
        success 2048 600 60
        denial 1024 120 30
        prefetch 5 2m 20%
    }
    forward . 8.8.8.8 1.1.1.1
}
```

## DNS Cache Sidecar Pattern

For applications that make extremely high volumes of DNS queries, you can add a local caching DNS proxy as a sidecar container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-app
spec:
  template:
    spec:
      dnsPolicy: None
      dnsConfig:
        nameservers:
          - 127.0.0.1
        searches:
          - default.svc.cluster.local
          - svc.cluster.local
          - cluster.local
        options:
          - name: ndots
            value: "2"
      containers:
      - name: app
        image: my-app:latest
      - name: dns-cache
        image: coredns/coredns:1.11.1
        args: ["-conf", "/etc/coredns/Corefile"]
        ports:
        - containerPort: 53
          protocol: UDP
        - containerPort: 53
          protocol: TCP
        resources:
          requests:
            cpu: 10m
            memory: 32Mi
          limits:
            cpu: 50m
            memory: 64Mi
        volumeMounts:
        - name: dns-config
          mountPath: /etc/coredns
      volumes:
      - name: dns-config
        configMap:
          name: dns-cache-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-cache-config
data:
  Corefile: |
    .:53 {
        cache {
            success 2048 600 30
            denial 1024 60 5
            prefetch 5 1m 20%
            serve_stale 2h
        }
        forward . 10.96.0.10 {
            max_concurrent 100
        }
    }
```

This gives the pod its own local DNS cache that forwards to the cluster CoreDNS. The cache absorbs repeated queries at the pod level, reducing load on CoreDNS significantly.

## Sizing Your Cache

The right cache size depends on how many unique domains your cluster queries. You can estimate this:

```bash
# Enable CoreDNS logging temporarily to count unique domains
kubectl edit configmap coredns -n kube-system
# Add "log" plugin, wait a few minutes, then analyze

# Count unique queried domains from CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --since=5m | \
    awk '{print $6}' | sort -u | wc -l
```

As a general rule:
- Small clusters (< 50 pods): 2048 entries is plenty
- Medium clusters (50-500 pods): 4096 to 8192 entries
- Large clusters (500+ pods): 9984 entries or higher

## Dealing with ndots and Search Domain Amplification

One of the biggest sources of unnecessary DNS queries in Kubernetes is the `ndots:5` default setting. A single lookup of `google.com` generates up to 8 queries (4 search domain attempts, each with both A and AAAA records):

```bash
# Watch the actual queries generated for a simple lookup
kubectl run dns-debug --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1
    dig google.com @10.96.0.10 +trace +qr 2>&1 | head -50
'
```

Reduce this amplification:

```yaml
# Set ndots:2 for pods that mostly query external domains
apiVersion: v1
kind: Pod
spec:
  dnsConfig:
    options:
    - name: ndots
      value: "2"
```

Or use trailing dots in your code to bypass search domain expansion entirely:

```python
# In your application code, use FQDNs with trailing dots
# This tells the resolver not to append search domains
database_host = "postgres.database.svc.cluster.local."
external_api = "api.example.com."
```

## Prometheus Alerting for Cache Health

Set up alerts to catch cache degradation:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dns-cache-alerts
  namespace: monitoring
spec:
  groups:
  - name: dns-cache
    rules:
    - alert: DNSCacheHitRateLow
      expr: |
        sum(rate(coredns_cache_hits_total[5m])) /
        (sum(rate(coredns_cache_hits_total[5m])) + sum(rate(coredns_cache_misses_total[5m])))
        < 0.5
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "DNS cache hit rate below 50%"
        description: "CoreDNS cache hit rate has been below 50% for 15 minutes"

    - alert: DNSCacheEvictions
      expr: |
        rate(coredns_cache_evictions_total[5m]) > 10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "DNS cache is evicting entries frequently"
        description: "Consider increasing cache size"
```

## Testing Cache Effectiveness

Run a simple benchmark to see the impact of caching:

```bash
#!/bin/bash
# benchmark-dns-cache.sh
# Measures DNS query latency with and without cache

kubectl run dns-bench --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1

    echo "=== First query (cache miss expected) ==="
    dig google.com @10.96.0.10 | grep "Query time"

    echo ""
    echo "=== Second query (cache hit expected) ==="
    dig google.com @10.96.0.10 | grep "Query time"

    echo ""
    echo "=== Third query (cache hit expected) ==="
    dig google.com @10.96.0.10 | grep "Query time"

    echo ""
    echo "=== Cluster service (always fast) ==="
    dig kubernetes.default.svc.cluster.local @10.96.0.10 | grep "Query time"
'
```

You should see the first query take longer (perhaps 20-50ms) and subsequent queries return much faster (under 5ms).

## Wrapping Up

DNS caching on Talos Linux is one of those optimizations with a high reward-to-effort ratio. Start by tuning the CoreDNS cache plugin with reasonable TTLs and prefetch settings, reduce ndots to cut query amplification, and add node-local DNS cache for the biggest performance improvement. Monitor your cache hit rates and adjust sizes based on actual usage patterns. Well-cached DNS makes everything in your cluster feel faster.
