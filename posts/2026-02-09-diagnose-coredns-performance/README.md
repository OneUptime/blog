# How to Diagnose CoreDNS Performance Issues in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Performance

Description: Identify and resolve CoreDNS performance bottlenecks that cause slow DNS resolution and application latency in Kubernetes clusters.

---

DNS resolution is critical to Kubernetes operations. Every service lookup, pod communication, and external API call starts with a DNS query. When CoreDNS performs poorly, the entire cluster suffers. Applications experience slow response times, timeouts, and intermittent failures that are difficult to diagnose because the root cause hides behind normal application errors.

CoreDNS performance issues manifest as slow DNS queries, high query failure rates, or CoreDNS pods consuming excessive CPU and memory. These problems often emerge gradually as cluster scale increases, making them hard to detect until they cause visible application impact.

## Recognizing CoreDNS Performance Symptoms

Several symptoms indicate CoreDNS performance problems. Applications report intermittent connection timeouts when connecting to services. The timeouts are inconsistent, failing sometimes but succeeding on retry.

DNS queries take seconds instead of milliseconds. You can measure this from within pods:

```bash
# Time a DNS lookup
kubectl exec -it my-pod -- time nslookup kubernetes.default.svc.cluster.local

# Healthy response: under 10ms
# Problem: over 100ms or timeout
```

Another symptom is CoreDNS pods showing high CPU usage:

```bash
# Check CoreDNS resource usage
kubectl top pods -n kube-system -l k8s-app=kube-dns

# High CPU (near limits) indicates overload
```

You might also see CoreDNS pods restarting due to OOMKilled events.

## Checking CoreDNS Metrics

CoreDNS exposes Prometheus metrics that reveal performance issues:

```bash
# Port-forward to CoreDNS metrics endpoint
kubectl port-forward -n kube-system svc/kube-dns 9153:9153

# Query metrics from another terminal
curl http://localhost:9153/metrics | grep coredns

# Key metrics to check:
# coredns_dns_request_duration_seconds - query latency
# coredns_dns_requests_total - total requests
# coredns_dns_responses_total - responses by status
# coredns_cache_hits_total - cache effectiveness
```

High request latency (p95 or p99) indicates performance problems. Low cache hit rates mean CoreDNS must forward most queries upstream, increasing load.

## Analyzing CoreDNS Logs

Enable query logging to see what DNS queries are happening:

```bash
# Edit CoreDNS ConfigMap to enable logging
kubectl edit configmap coredns -n kube-system

# Add the log plugin to the Corefile:
# .:53 {
#     errors
#     health
#     log  # Add this line
#     ready
#     kubernetes cluster.local in-addr.arpa ip6.arpa {
#       pods insecure
#       fallthrough in-addr.arpa ip6.arpa
#     }
#     ...
# }

# View logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100 -f
```

Look for patterns in the queries. Are the same queries repeated frequently? Are there failed queries? Do you see unexpected query types or domains?

## Identifying Query Load Issues

High query rates can overwhelm CoreDNS. Measure your query load:

```bash
# Count queries per second from metrics
kubectl exec -n kube-system coredns-xxx -- wget -qO- localhost:9153/metrics | \
  grep coredns_dns_requests_total

# Watch query rate over time
watch -n 5 'kubectl exec -n kube-system coredns-xxx -- wget -qO- localhost:9153/metrics | grep coredns_dns_requests_total'
```

Calculate requests per second by taking the difference between samples. If you are seeing thousands of queries per second with only a few CoreDNS replicas, you need to scale up.

## Scaling CoreDNS Replicas

Add more CoreDNS replicas to distribute load:

```bash
# Check current replica count
kubectl get deployment coredns -n kube-system

# Scale up CoreDNS
kubectl scale deployment coredns -n kube-system --replicas=3

# Verify new pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Monitor if scaling helps
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

A good rule of thumb is one CoreDNS replica per 100 nodes or per 10,000 pods, whichever is higher. Adjust based on your actual query patterns.

## Configuring Resource Limits

Insufficient resources cause CoreDNS throttling. Check and adjust resource limits:

```bash
# Check current resource configuration
kubectl get deployment coredns -n kube-system -o yaml | grep -A5 resources

# Edit deployment to increase resources
kubectl edit deployment coredns -n kube-system

# Example resource configuration:
# resources:
#   limits:
#     memory: 512Mi
#     cpu: 500m
#   requests:
#     memory: 256Mi
#     cpu: 250m
```

Monitor resource usage after changes to ensure limits are appropriate. CoreDNS should have headroom below the limits during normal operation.

## Optimizing Cache Configuration

DNS caching significantly improves CoreDNS performance. Configure the cache plugin:

```bash
# Edit CoreDNS ConfigMap
kubectl edit configmap coredns -n kube-system

# Add cache configuration
# .:53 {
#     errors
#     health
#     ready
#     kubernetes cluster.local in-addr.arpa ip6.arpa {
#       pods insecure
#       fallthrough in-addr.arpa ip6.arpa
#     }
#     cache 30  # Cache for 30 seconds
#     forward . /etc/resolv.conf
#     reload
# }
```

The cache TTL balances performance and staleness. Thirty seconds works well for most clusters. Increase for more stable environments or decrease if you need faster updates.

Check cache effectiveness:

```bash
# View cache hit rate
kubectl exec -n kube-system coredns-xxx -- wget -qO- localhost:9153/metrics | \
  grep coredns_cache

# Calculate hit rate: hits / (hits + misses)
```

A cache hit rate above 80% indicates effective caching. Below 50% suggests cache configuration problems or query patterns that bypass the cache.

## Tuning the Forward Plugin

The forward plugin sends queries to upstream DNS servers. Configure it for better performance:

```bash
# Edit CoreDNS ConfigMap
kubectl edit configmap coredns -n kube-system

# Optimize forward configuration
# forward . /etc/resolv.conf {
#     max_concurrent 1000
#     expire 10s
#     policy sequential
# }

# max_concurrent: maximum parallel upstream queries
# expire: how long to cache upstream responses
# policy: sequential or random (sequential tries servers in order)
```

If your upstream DNS servers are slow, consider adding more servers or using faster alternatives like 8.8.8.8 or 1.1.1.1:

```yaml
# forward . 8.8.8.8 1.1.1.1 {
#     max_concurrent 1000
#     policy round_robin
# }
```

## Reducing Unnecessary Queries

Some applications generate excessive DNS queries. Find and fix query-heavy pods:

```bash
# Enable detailed logging
kubectl edit configmap coredns -n kube-system

# Add log plugin with query details
# log {
#     class all
# }

# Analyze logs to find top queriers
kubectl logs -n kube-system -l k8s-app=kube-dns | \
  grep -oE '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' | \
  sort | uniq -c | sort -rn | head -20
```

The top source IPs are your heaviest DNS users. Investigate those pods for configuration issues.

Common causes of excessive queries include applications without DNS caching, misconfigured retry logic, or bugs that perform DNS lookups in tight loops.

## Configuring NodeLocal DNSCache

NodeLocal DNSCache runs a DNS cache on each node, reducing CoreDNS load:

```bash
# Deploy NodeLocal DNSCache
kubectl apply -f https://k8s.io/examples/admin/dns/nodelocaldns.yaml

# Verify DaemonSet is running
kubectl get daemonset node-local-dns -n kube-system

# Check if pods are using local cache
kubectl get pods -n kube-system -l k8s-app=node-local-dns
```

NodeLocal DNSCache intercepts DNS queries on each node and serves them from a local cache. Only cache misses go to CoreDNS, dramatically reducing CoreDNS load.

After deploying NodeLocal DNSCache, monitor CoreDNS metrics. You should see query rates drop significantly.

## Analyzing Query Patterns

Understanding your query patterns helps optimize CoreDNS:

```bash
# Export CoreDNS metrics
kubectl exec -n kube-system coredns-xxx -- wget -qO- localhost:9153/metrics > coredns-metrics.txt

# Analyze query types
grep coredns_dns_requests_total coredns-metrics.txt

# Look for:
# - Most queried domains
# - Query types (A, AAAA, SRV)
# - Success vs error rates
```

If you see many queries for external domains, ensure the forward plugin is configured efficiently. If you see many failed queries for non-existent names, investigate why applications are looking up invalid names.

## Detecting DNS Amplification

DNS amplification attacks or bugs can overwhelm CoreDNS:

```bash
# Look for unusually large responses
kubectl logs -n kube-system -l k8s-app=kube-dns | grep -i "response.*large"

# Check response sizes in metrics
kubectl exec -n kube-system coredns-xxx -- wget -qO- localhost:9153/metrics | \
  grep coredns_dns_response_size_bytes
```

Large responses might indicate amplification attempts or misconfigured wildcard DNS records.

## Testing DNS Performance

Benchmark DNS performance to measure improvements:

```bash
# Create a test pod
kubectl run dns-test --rm -it --image=nicolaka/netshoot -- bash

# Inside the pod, install dnsperf
apk add bind-tools

# Create a query file
cat > queries.txt << EOF
kubernetes.default.svc.cluster.local A
kube-dns.kube-system.svc.cluster.local A
my-service.my-namespace.svc.cluster.local A
EOF

# Run simple timing test
for i in {1..100}; do
  time nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1
done
```

Record the results before and after optimizations to quantify improvements.

## Monitoring CoreDNS Health

Set up continuous monitoring to detect issues early:

```bash
# Check CoreDNS health endpoint
kubectl port-forward -n kube-system svc/kube-dns 8080:8080

curl http://localhost:8080/health

# Set up readiness and liveness probes (should be default)
kubectl get deployment coredns -n kube-system -o yaml | grep -A10 probes
```

Integrate CoreDNS metrics into your monitoring system (Prometheus, Grafana) with alerts for:

- Query latency exceeding thresholds (p95 > 100ms)
- High error rates (> 1% of queries)
- Cache hit rate dropping below 50%
- Resource usage approaching limits

## Handling Split DNS

For hybrid environments with split DNS, configure CoreDNS to forward specific domains to different servers:

```yaml
# Edit CoreDNS ConfigMap
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
        cache 30
        forward . /etc/resolv.conf
        reload
    }
    internal.company.com:53 {
        errors
        cache 30
        forward . 10.0.0.1 10.0.0.2
    }
```

This configuration sends queries for `internal.company.com` to specific DNS servers while handling other queries normally.

## Conclusion

CoreDNS performance directly impacts application performance in Kubernetes. Slow DNS resolution cascades into slow application responses, timeout errors, and poor user experience. By monitoring CoreDNS metrics, analyzing query patterns, scaling replicas appropriately, optimizing cache configuration, and deploying NodeLocal DNSCache, you can ensure fast and reliable DNS resolution.

Regular performance testing and monitoring catch issues before they impact users. Treat CoreDNS as a critical infrastructure component that deserves the same attention as your application workloads. A well-tuned CoreDNS setup provides fast, reliable service discovery that your applications can depend on.
