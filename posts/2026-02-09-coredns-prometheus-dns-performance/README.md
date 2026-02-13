# How to Implement CoreDNS Prometheus Metrics and Monitoring for DNS Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Prometheus, Monitoring

Description: Learn how to implement comprehensive CoreDNS monitoring using Prometheus metrics to track DNS performance, identify bottlenecks, and ensure reliable name resolution in Kubernetes clusters.

---

Monitoring DNS performance is essential for maintaining reliable Kubernetes clusters. CoreDNS exposes rich Prometheus metrics that provide insights into query patterns, cache efficiency, latency, and error rates. Proper monitoring helps you identify issues before they impact applications and optimize DNS configuration for better performance.

This guide shows you how to implement comprehensive CoreDNS monitoring using Prometheus.

## Understanding CoreDNS Metrics

CoreDNS exposes metrics on port 9153 by default. Key metric categories:

- **Request metrics**: Query counts, types, and sources
- **Response metrics**: Response codes and sizes
- **Cache metrics**: Hit rates and entries
- **Latency metrics**: Request duration histograms
- **Plugin metrics**: Per-plugin statistics
- **Error metrics**: Failed queries and reasons

The prometheus plugin must be enabled in the Corefile:

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
        prometheus :9153  # Expose metrics on port 9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

## Accessing CoreDNS Metrics

Query metrics directly:

```bash
# Port forward to CoreDNS metrics endpoint
kubectl port-forward -n kube-system svc/kube-dns 9153:9153

# In another terminal, fetch metrics
curl http://localhost:9153/metrics

# Filter for specific metrics
curl http://localhost:9153/metrics | grep coredns_dns
```

Key metrics to examine:

```promql
# Total DNS requests
coredns_dns_requests_total

# DNS responses by code
coredns_dns_responses_total

# Request duration
coredns_dns_request_duration_seconds

# Cache statistics
coredns_cache_hits_total
coredns_cache_misses_total
coredns_cache_entries

# Forward statistics
coredns_forward_requests_total
coredns_forward_responses_total
```

## Configuring Prometheus ServiceMonitor

Create a ServiceMonitor for automated scraping:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kube-dns-metrics
  namespace: kube-system
  labels:
    k8s-app: kube-dns
spec:
  selector:
    k8s-app: kube-dns
  ports:
  - name: metrics
    port: 9153
    targetPort: 9153
    protocol: TCP
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coredns
  namespace: kube-system
  labels:
    app: coredns
spec:
  selector:
    matchLabels:
      k8s-app: kube-dns
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Apply the configuration:

```bash
kubectl apply -f coredns-servicemonitor.yaml
```

## Essential Prometheus Queries

**Query rate and volume:**

```promql
# Queries per second
rate(coredns_dns_requests_total[5m])

# Total queries by type
sum(rate(coredns_dns_requests_total[5m])) by (type)

# Queries by zone
sum(rate(coredns_dns_requests_total[5m])) by (zone)
```

**Cache performance:**

```promql
# Cache hit ratio
sum(rate(coredns_cache_hits_total[5m]))
/
sum(rate(coredns_dns_requests_total[5m]))

# Cache entries
coredns_cache_entries

# Cache eviction rate
rate(coredns_cache_evictions_total[5m])
```

**Latency analysis:**

```promql
# 95th percentile latency
histogram_quantile(0.95,
  rate(coredns_dns_request_duration_seconds_bucket[5m])
)

# 99th percentile latency
histogram_quantile(0.99,
  rate(coredns_dns_request_duration_seconds_bucket[5m])
)

# Average latency
rate(coredns_dns_request_duration_seconds_sum[5m])
/
rate(coredns_dns_request_duration_seconds_count[5m])
```

**Error rates:**

```promql
# SERVFAIL responses
sum(rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]))

# NXDOMAIN responses
sum(rate(coredns_dns_responses_total{rcode="NXDOMAIN"}[5m]))

# Error ratio
sum(rate(coredns_dns_responses_total{rcode!="NOERROR"}[5m]))
/
sum(rate(coredns_dns_responses_total[5m]))
```

## Creating Grafana Dashboard

Deploy a comprehensive Grafana dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-dashboard
  namespace: monitoring
data:
  coredns.json: |
    {
      "dashboard": {
        "title": "CoreDNS Performance",
        "panels": [
          {
            "title": "Query Rate",
            "targets": [{
              "expr": "sum(rate(coredns_dns_requests_total[5m]))"
            }]
          },
          {
            "title": "Cache Hit Ratio",
            "targets": [{
              "expr": "sum(rate(coredns_cache_hits_total[5m])) / sum(rate(coredns_dns_requests_total[5m]))"
            }]
          },
          {
            "title": "Query Latency (p95)",
            "targets": [{
              "expr": "histogram_quantile(0.95, rate(coredns_dns_request_duration_seconds_bucket[5m]))"
            }]
          },
          {
            "title": "Response Codes",
            "targets": [{
              "expr": "sum(rate(coredns_dns_responses_total[5m])) by (rcode)"
            }]
          },
          {
            "title": "Cache Entries",
            "targets": [{
              "expr": "coredns_cache_entries"
            }]
          },
          {
            "title": "Forward Requests",
            "targets": [{
              "expr": "sum(rate(coredns_forward_requests_total[5m]))"
            }]
          }
        ]
      }
    }
```

## Alerting Rules

Configure Prometheus alerting rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-coredns-rules
  namespace: monitoring
data:
  coredns-rules.yaml: |
    groups:
    - name: coredns
      interval: 30s
      rules:
      # High query latency
      - alert: CoreDNSHighLatency
        expr: |
          histogram_quantile(0.99,
            rate(coredns_dns_request_duration_seconds_bucket[5m])
          ) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS high query latency"
          description: "99th percentile latency is above 100ms"

      # Low cache hit rate
      - alert: CoreDNSLowCacheHitRate
        expr: |
          sum(rate(coredns_cache_hits_total[5m]))
          /
          sum(rate(coredns_dns_requests_total[5m]))
          < 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS cache hit rate is low"
          description: "Cache hit rate has dropped below 70%"

      # High error rate
      - alert: CoreDNSHighErrorRate
        expr: |
          sum(rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]))
          /
          sum(rate(coredns_dns_responses_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CoreDNS high error rate"
          description: "More than 5% of queries returning SERVFAIL"

      # CoreDNS down
      - alert: CoreDNSDown
        expr: up{job="kube-dns"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "CoreDNS is down"
          description: "CoreDNS has been down for more than 2 minutes"

      # High query load
      - alert: CoreDNSHighQueryLoad
        expr: |
          sum(rate(coredns_dns_requests_total[5m])) > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS experiencing high query load"
          description: "Query rate exceeds 10,000 QPS"

      # Cache near capacity
      - alert: CoreDNSCacheNearCapacity
        expr: coredns_cache_entries > 30000
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "CoreDNS cache approaching capacity"
          description: "Cache has more than 30,000 entries"

      # High forward failure rate
      - alert: CoreDNSForwardFailures
        expr: |
          sum(rate(coredns_forward_healthcheck_failures_total[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS forward healthcheck failures"
          description: "Upstream DNS servers failing healthchecks"
```

Apply alerting rules:

```bash
kubectl apply -f coredns-alert-rules.yaml
```

## Performance Benchmarking

Create a benchmark tool:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-benchmark
data:
  benchmark.sh: |
    #!/bin/bash

    DURATION=60  # seconds
    QUERIES_PER_SEC=100

    DOMAINS=(
        "kubernetes.default.svc.cluster.local"
        "kube-dns.kube-system.svc.cluster.local"
        "google.com"
        "github.com"
    )

    echo "Starting DNS benchmark..."
    echo "Duration: ${DURATION}s"
    echo "Target rate: ${QUERIES_PER_SEC} QPS"

    start=$(date +%s)
    end=$((start + DURATION))
    count=0

    while [ $(date +%s) -lt $end ]; do
        for domain in "${DOMAINS[@]}"; do
            nslookup $domain >/dev/null 2>&1 &
            count=$((count + 1))
        done
        sleep $(echo "scale=3; 1/$QUERIES_PER_SEC" | bc)
    done

    wait

    echo "Benchmark complete"
    echo "Total queries: $count"
    echo "Actual rate: $(echo "scale=2; $count/$DURATION" | bc) QPS"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: dns-benchmark
spec:
  template:
    spec:
      containers:
      - name: benchmark
        image: nicolaka/netshoot
        command:
        - sh
        - /scripts/benchmark.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: dns-benchmark
      restartPolicy: Never
```

Run benchmark and observe metrics:

```bash
# Start benchmark
kubectl apply -f dns-benchmark.yaml

# Watch Prometheus metrics during test
kubectl port-forward -n kube-system svc/kube-dns 9153:9153
watch -n 2 'curl -s http://localhost:9153/metrics | grep coredns_dns_requests_total'
```

## Monitoring Dashboard with kubectl

Create a simple monitoring script:

```bash
#!/bin/bash

# coredns-monitor.sh
NAMESPACE="kube-system"
LABEL="k8s-app=kube-dns"

while true; do
    clear
    echo "=== CoreDNS Monitoring ==="
    echo "Time: $(date)"
    echo ""

    # Pod status
    echo "Pod Status:"
    kubectl get pods -n $NAMESPACE -l $LABEL
    echo ""

    # Resource usage
    echo "Resource Usage:"
    kubectl top pods -n $NAMESPACE -l $LABEL
    echo ""

    # Recent errors from logs
    echo "Recent Errors (last 10 lines):"
    kubectl logs -n $NAMESPACE -l $LABEL --tail=10 | grep -i error || echo "No errors"
    echo ""

    sleep 5
done
```

## Best Practices

Follow these monitoring best practices:

1. Set up alerting before problems occur
2. Monitor cache hit rates continuously
3. Track latency at 95th and 99th percentiles
4. Alert on error rate thresholds
5. Dashboard key metrics for visibility
6. Correlate DNS metrics with application performance
7. Test alerting rules in non-production
8. Review metrics during capacity planning
9. Monitor forward upstream health
10. Track query patterns for optimization

Comprehensive CoreDNS monitoring using Prometheus provides visibility into DNS performance and helps maintain reliable name resolution. By tracking key metrics, setting up appropriate alerts, and analyzing query patterns, you can identify and resolve DNS issues quickly while optimizing configuration for better performance.

For related monitoring topics, explore our guides on [CoreDNS cache optimization](https://oneuptime.com/blog/post/2026-02-09-coredns-cache-plugin-ttl/view) and [DNS resolution debugging](https://oneuptime.com/blog/post/2026-02-09-debug-dns-resolution-dnsutils/view).
