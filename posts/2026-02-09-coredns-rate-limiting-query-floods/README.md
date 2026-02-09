# How to Configure CoreDNS Rate Limiting to Prevent DNS Query Floods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, Kubernetes, DNS, Security, Rate Limiting

Description: Learn how to implement rate limiting in CoreDNS to protect your Kubernetes DNS infrastructure from query floods and abuse. This guide covers configuration strategies and monitoring.

---

DNS query floods can overwhelm your Kubernetes cluster's DNS infrastructure, leading to service degradation or complete DNS resolution failure. CoreDNS, the default DNS server in Kubernetes, provides built-in rate limiting capabilities through the ratelimit plugin. Implementing proper rate limiting protects your infrastructure from both accidental query storms and malicious DNS abuse.

## Understanding DNS Query Floods

DNS query floods occur when a single client or group of clients sends an excessive number of DNS queries in a short period. These floods can result from misconfigured applications, infinite retry loops, or deliberate denial-of-service attacks. Without proper rate limiting, these floods consume CPU, memory, and network bandwidth, affecting all cluster services that rely on DNS resolution.

In Kubernetes environments, DNS query floods become particularly problematic because CoreDNS runs as a pod with limited resources. When CoreDNS pods become overwhelmed, they can't serve legitimate DNS requests, causing application failures across the cluster.

## Installing the CoreDNS Ratelimit Plugin

The ratelimit plugin is included in standard CoreDNS builds used in Kubernetes. You can verify its availability by checking your CoreDNS configuration.

First, check your current CoreDNS configuration:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

The output shows your current Corefile configuration. To add rate limiting, you'll edit this ConfigMap.

## Basic Rate Limiting Configuration

The ratelimit plugin uses a token bucket algorithm to control query rates. Each client receives a certain number of tokens, and each query consumes one token. Tokens refill at a specified rate.

Here's a basic rate limiting configuration:

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
        # Rate limiting: 100 queries per second per IP
        ratelimit 100
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

This configuration limits each client IP to 100 queries per second. Queries beyond this limit receive a REFUSED response.

## Advanced Rate Limiting Strategies

For production environments, you need more sophisticated rate limiting that accounts for different query types and client behaviors.

### Per-Zone Rate Limiting

You can apply different rate limits to different DNS zones:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # External queries - stricter limits
    .:53 {
        errors
        health
        ready
        # Limit external queries to 50 per second
        ratelimit 50
        forward . 8.8.8.8 8.8.4.4
        cache 300
    }

    # Internal cluster DNS - more permissive
    cluster.local:53 {
        errors
        # Allow 200 queries per second for cluster internal
        ratelimit 200
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        cache 30
    }
```

This configuration applies stricter limits to external DNS queries while allowing higher rates for internal cluster DNS resolution.

## Configuring Sliding Window Rate Limiting

The ratelimit plugin supports sliding window rate limiting, which provides smoother rate control:

```yaml
ratelimit 100 {
    window 10s
}
```

This configuration allows 100 queries per 10-second sliding window, preventing burst traffic patterns from bypassing rate limits.

## Implementing Whitelist and Blacklist

You can exempt trusted clients from rate limiting or apply stricter limits to known problematic clients:

```yaml
ratelimit 100 {
    # Exempt monitoring systems from rate limiting
    whitelist 10.0.0.0/8
    whitelist 172.16.0.0/12
}
```

This configuration exempts RFC1918 private networks from rate limiting, which is useful for trusted internal services.

## Monitoring Rate Limiting Effectiveness

CoreDNS exposes Prometheus metrics that help you monitor rate limiting behavior. Deploy a ServiceMonitor to collect these metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coredns-ratelimit
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-dns
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics to monitor include:

- `coredns_ratelimit_dropped_total`: Total number of queries dropped due to rate limiting
- `coredns_dns_requests_total`: Total DNS requests received
- `coredns_dns_responses_total`: Total DNS responses sent

You can query these metrics to identify clients triggering rate limits:

```promql
rate(coredns_ratelimit_dropped_total[5m]) > 0
```

## Creating Alerts for Rate Limit Events

Set up Prometheus alerts to notify you when rate limiting activates frequently:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: coredns-ratelimit-alerts
  namespace: kube-system
spec:
  groups:
  - name: coredns-ratelimit
    interval: 30s
    rules:
    - alert: CoreDNSRateLimitHigh
      expr: rate(coredns_ratelimit_dropped_total[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "CoreDNS is dropping queries due to rate limiting"
        description: "CoreDNS has dropped {{ $value }} queries per second in the last 5 minutes"
```

This alert fires when CoreDNS drops more than 10 queries per second for 5 minutes, indicating a potential query flood.

## Testing Rate Limiting Configuration

Before deploying rate limiting to production, test your configuration to ensure it works as expected without blocking legitimate traffic.

Create a test pod that generates DNS queries:

```bash
kubectl run dns-test --image=busybox --restart=Never -- sh -c '
  while true; do
    nslookup kubernetes.default.svc.cluster.local
    sleep 0.01
  done
'
```

Monitor CoreDNS metrics to verify that rate limiting activates:

```bash
kubectl port-forward -n kube-system svc/kube-dns 9153:9153
curl http://localhost:9153/metrics | grep ratelimit
```

You should see the `coredns_ratelimit_dropped_total` counter incrementing when the test pod exceeds your configured rate limit.

## Optimizing Rate Limit Values

Choosing appropriate rate limit values requires understanding your cluster's normal DNS query patterns. Start by monitoring DNS query rates without rate limiting enabled:

```bash
# Get average queries per second
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10000 | \
  grep -o 'NOERROR\|NXDOMAIN\|SERVFAIL' | wc -l
```

Set your initial rate limit to 2-3 times the observed peak traffic, then gradually reduce it while monitoring for false positives.

## Handling Rate Limit Responses

Applications should handle DNS rate limiting gracefully. When CoreDNS returns a REFUSED response, applications should implement exponential backoff:

```go
package main

import (
    "net"
    "time"
)

func lookupWithBackoff(hostname string) ([]net.IP, error) {
    backoff := time.Second
    maxBackoff := 30 * time.Second

    for {
        ips, err := net.LookupIP(hostname)
        if err == nil {
            return ips, nil
        }

        if dnsErr, ok := err.(*net.DNSError); ok {
            if dnsErr.IsTemporary {
                time.Sleep(backoff)
                backoff *= 2
                if backoff > maxBackoff {
                    backoff = maxBackoff
                }
                continue
            }
        }

        return nil, err
    }
}
```

This code implements exponential backoff for DNS queries, reducing load on CoreDNS when rate limiting activates.

## Conclusion

Configuring CoreDNS rate limiting protects your Kubernetes cluster from DNS query floods while maintaining service availability for legitimate traffic. Start with conservative rate limits based on your observed traffic patterns, implement comprehensive monitoring through Prometheus metrics, and gradually tune your configuration as you gain operational experience. Proper rate limiting ensures your cluster's DNS infrastructure remains stable and responsive even under abnormal query loads.
