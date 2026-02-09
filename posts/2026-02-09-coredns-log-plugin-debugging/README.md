# How to Configure CoreDNS Log Plugin for DNS Query Debugging and Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, Kubernetes, DNS, Debugging, Logging

Description: Master CoreDNS log plugin configuration for DNS query debugging and performance analysis in Kubernetes. Learn structured logging, filtering, and troubleshooting techniques.

---

The CoreDNS log plugin provides detailed insights into DNS query processing, making it an essential tool for debugging DNS issues in Kubernetes clusters. Whether you're troubleshooting service discovery problems, investigating performance bottlenecks, or analyzing DNS traffic patterns, proper log configuration helps you quickly identify and resolve issues. This guide covers comprehensive logging strategies that balance observability with performance.

## Understanding CoreDNS Logging Architecture

CoreDNS uses a plugin-based architecture where each plugin can contribute to logging output. The log plugin specifically captures DNS query details including client IP, query type, queried name, response code, and processing time. By default, CoreDNS provides minimal logging, so you must explicitly configure the log plugin to capture the details you need.

Logs flow through the CoreDNS pipeline just like queries, meaning log configuration affects performance. Excessive logging can impact DNS response times, especially in high-traffic clusters, so you need to balance verbosity with operational requirements.

## Basic Log Plugin Configuration

Start with a basic log configuration that captures essential query information:

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
            lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        # Enable query logging
        log
        prometheus :9153
        forward . /etc/resolv.conf {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

This configuration logs every DNS query with basic information. View logs using kubectl:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

You'll see output like:

```
[INFO] 10.244.1.5:45678 - 12345 "A IN kubernetes.default.svc.cluster.local. udp 54 false 512" NOERROR qr,aa,rd 106 0.000123s
```

## Understanding Log Format

CoreDNS log entries contain several important fields:

- Client IP and port (10.244.1.5:45678)
- Query ID (12345)
- Query type (A)
- Query class (IN)
- Queried name (kubernetes.default.svc.cluster.local)
- Protocol (udp)
- Query size in bytes (54)
- DO bit status (false)
- Buffer size (512)
- Response code (NOERROR)
- Response flags (qr,aa,rd)
- Response size (106)
- Processing time (0.000123s)

Understanding these fields helps you diagnose specific DNS issues.

## Configuring Structured Logging

Structured logging formats output as JSON, making it easier to parse logs with external tools:

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
    # Structured JSON logging
    log {
        class all
        format "{remote}:{port} - {>id} {type} {class} {name} {proto} {size} {>do} {>bufsize} {rcode} {>rflags} {rsize} {duration}"
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    reload
}
```

This configuration produces more readable, parser-friendly output.

## Filtering Logs by Query Class

You can filter logs to capture only specific types of queries:

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
    # Log only errors and denials
    log {
        class denial
        class error
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    reload
}
```

Available log classes include:

- `all`: Log all queries
- `denial`: Log NXDOMAIN and NODATA responses
- `error`: Log queries resulting in SERVFAIL
- `success`: Log successful queries only

This filtering reduces log volume while maintaining visibility into problematic queries.

## Implementing Per-Zone Logging

Configure different logging levels for different DNS zones:

```yaml
# External queries - detailed logging
.:53 {
    errors
    log {
        class all
    }
    forward . 8.8.8.8 8.8.4.4
    cache 300
}

# Internal cluster DNS - error logging only
cluster.local:53 {
    errors
    log {
        class denial
        class error
    }
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    cache 30
}
```

This configuration logs all external queries while only capturing errors for internal cluster DNS, balancing observability with performance.

## Analyzing Query Patterns

Use log analysis to understand DNS query patterns in your cluster:

```bash
# Find most frequently queried domains
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10000 | \
  grep -o '"[^"]*svc.cluster.local"' | \
  sort | uniq -c | sort -rn | head -20

# Identify slow queries (over 100ms)
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10000 | \
  awk '$NF ~ /s$/ && $NF+0 > 0.1 {print}'

# Count queries by response code
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10000 | \
  grep -o 'NOERROR\|NXDOMAIN\|SERVFAIL' | sort | uniq -c
```

These commands help identify performance bottlenecks and misconfigured services.

## Debugging Service Discovery Issues

When pods can't resolve service names, detailed logging helps diagnose the issue:

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
    # Verbose logging for debugging
    log {
        class all
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    reload
}
```

Deploy this configuration temporarily, then reproduce the issue and examine logs:

```bash
# Watch logs in real-time
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100 -f

# Filter for specific service
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=1000 | \
  grep "myservice.default.svc.cluster.local"
```

Look for NXDOMAIN responses indicating the service doesn't exist, or SERVFAIL responses indicating CoreDNS errors.

## Logging Cache Hit Rates

Monitor cache effectiveness through logging:

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
    log
    forward . /etc/resolv.conf
    # Cache with success/denial tracking
    cache 30 {
        success 9984 30
        denial 9984 5
    }
    prometheus :9153
    reload
}
```

Analyze cache performance:

```bash
# Count cache hits vs misses (approximate)
# Short response times (<1ms) often indicate cache hits
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10000 | \
  awk '{if ($NF+0 < 0.001) hits++; else misses++} END {print "Hits:", hits, "Misses:", misses}'
```

Low cache hit rates indicate you should increase cache size or TTL values.

## Implementing Client-Specific Logging

Track queries from specific pods or namespaces:

```bash
# Find all queries from a specific pod IP
POD_IP=$(kubectl get pod mypod -o jsonpath='{.status.podIP}')
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10000 | grep $POD_IP

# Track queries from all pods in a namespace
kubectl get pods -n mynamespace -o jsonpath='{.items[*].status.podIP}' | \
  tr ' ' '\n' | while read ip; do
    kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10000 | grep $ip
  done
```

This helps diagnose application-specific DNS issues.

## Configuring Log Rotation

CoreDNS logs to stdout, which Kubernetes captures. Configure log rotation at the kubelet level to prevent disk space issues:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerLogMaxSize: "10Mi"
containerLogMaxFiles: 5
```

This configuration limits each container's logs to 10MB across 5 rotated files.

## Forwarding Logs to External Systems

For production environments, forward CoreDNS logs to centralized logging systems:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: kube-system
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/coredns-*.log
      pos_file /var/log/fluentd-coredns.pos
      tag coredns.*
      <parse>
        @type json
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter coredns.**>
      @type parser
      key_name log
      <parse>
        @type regexp
        expression /^(?<client_ip>[^ ]+):(?<client_port>[^ ]+) - (?<query_id>[^ ]+) "(?<query_type>[^ ]+) (?<query_class>[^ ]+) (?<query_name>[^ ]+)/
      </parse>
    </filter>

    <match coredns.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name coredns-logs
      type_name _doc
    </match>
```

This Fluentd configuration parses CoreDNS logs and sends them to Elasticsearch for analysis.

## Creating Dashboards from Logs

Build Grafana dashboards using logs stored in Elasticsearch or Loki:

```promql
# Query rate by response code
sum(rate({app="coredns"} |~ "NOERROR|NXDOMAIN|SERVFAIL" | json | __error__="" [5m])) by (rcode)

# Average query duration
avg(rate({app="coredns"} | json duration | duration > 0 [5m]))

# Top queried domains
topk(10, sum(rate({app="coredns"} | json name [5m])) by (name))
```

These queries provide insights into DNS performance and usage patterns.

## Troubleshooting with Logs

Common DNS issues and their log signatures:

**Service not found:**
```
NXDOMAIN response for myservice.default.svc.cluster.local
```
Solution: Verify service exists and namespace is correct.

**Slow responses:**
```
Processing time > 100ms
```
Solution: Check upstream resolver performance, increase cache, or add more CoreDNS replicas.

**Timeout errors:**
```
SERVFAIL with long duration
```
Solution: Investigate network connectivity to upstream resolvers.

**Excessive NXDOMAIN:**
```
High rate of NXDOMAIN for similar patterns
```
Solution: Misconfigured application or search domain issues.

## Performance Impact of Logging

Logging adds overhead to DNS processing. Measure impact before enabling verbose logging in production:

```bash
# Benchmark DNS performance without logging
kubectl run dns-benchmark --image=busybox --restart=Never -- sh -c '
  for i in $(seq 1 1000); do
    nslookup kubernetes.default.svc.cluster.local >/dev/null 2>&1
  done
'

# Enable verbose logging and re-run benchmark
# Compare response times
```

If logging causes significant performance degradation, use class filtering to reduce volume.

## Conclusion

The CoreDNS log plugin provides powerful debugging and analysis capabilities for Kubernetes DNS infrastructure. Start with error and denial logging in production, enabling full logging only for troubleshooting specific issues. Combine logging with Prometheus metrics for comprehensive observability, and forward logs to centralized systems for long-term analysis. Understanding log output helps you quickly diagnose service discovery problems, optimize cache configuration, and maintain reliable DNS resolution across your cluster.
