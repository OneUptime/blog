# How to Configure CoreDNS Rate Limiting to Prevent DNS Query Floods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, Kubernetes, DNS, Security, Rate Limiting

Description: Learn how to implement rate limiting in CoreDNS to protect your Kubernetes DNS infrastructure from query floods and abuse. This guide covers configuration strategies and monitoring.

---

DNS query floods can overwhelm your Kubernetes cluster's DNS infrastructure, leading to service degradation or complete DNS resolution failure. CoreDNS, the default DNS server in Kubernetes, can provide rate limiting through the external rrl plugin when you build a CoreDNS image that includes it. Implementing proper rate limiting protects your infrastructure from both accidental query storms and malicious DNS abuse.

## Understanding DNS Query Floods

DNS query floods occur when a single client or group of clients sends an excessive number of DNS queries in a short period. These floods can result from misconfigured applications, infinite retry loops, or deliberate denial-of-service attacks. Without proper rate limiting, these floods consume CPU, memory, and network bandwidth, affecting all cluster services that rely on DNS resolution.

In Kubernetes environments, DNS query floods become particularly problematic because CoreDNS runs as a pod with limited resources. When CoreDNS pods become overwhelmed, they can't serve legitimate DNS requests, causing application failures across the cluster.

## Installing the CoreDNS RRL Plugin

The rrl plugin is not included in standard CoreDNS releases or the default CoreDNS images used in Kubernetes. To use it, build a CoreDNS image with `rrl:github.com/coredns/rrl` added near the top of `plugin.cfg`, then deploy that image for your CoreDNS pods.

First, check your current CoreDNS configuration:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

The output shows your current Corefile configuration. After deploying a CoreDNS image that includes the rrl plugin, you'll edit this ConfigMap to enable rate limiting.

## Basic Rate Limiting Configuration

The rrl plugin tracks request and response rates by client IP prefix. For request limiting, each client prefix receives a per-second allowance, and queries beyond that allowance are dropped.

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
        # Request rate limiting: 100 queries per second per client prefix
        rrl . {
            requests-per-second 100
        }
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

This configuration limits each client IP prefix to 100 queries per second. Queries beyond this limit are dropped without a DNS response.

## Advanced Rate Limiting Strategies

For production environments, you need more sophisticated rate limiting that accounts for different zones and client behaviors.

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
        rrl . {
            requests-per-second 50
        }
        forward . 8.8.8.8 8.8.4.4
        cache 300
    }

    # Internal cluster DNS - more permissive
    cluster.local:53 {
        errors
        # Allow 200 queries per second for cluster internal
        rrl cluster.local {
            requests-per-second 200
        }
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        cache 30
    }
```

This configuration applies stricter limits to external DNS queries while allowing higher rates for internal cluster DNS resolution.

## Configuring Rolling Window Rate Limiting

The rrl plugin supports a rolling window for rate tracking:

```yaml
rrl . {
    window 10
    requests-per-second 100
}
```

This configuration allows 100 queries per second and tracks rate-limit balances over a 10-second rolling window, limiting how long a client remains blocked after exceeding the rate.

## Configuring Client Prefixes and Report-Only Mode

You can tune how clients are grouped for rate limiting and test the configuration before dropping traffic:

```yaml
rrl . {
    requests-per-second 100
    ipv4-prefix-length 32
    ipv6-prefix-length 128
    report-only
}
```

This configuration tracks individual IPv4 and IPv6 addresses instead of the default `/24` IPv4 and `/56` IPv6 prefixes. `report-only` records metrics without dropping queries, which is useful for validating limits before enforcement.

## Monitoring Rate Limiting Effectiveness

CoreDNS exposes Prometheus metrics that help you monitor rate limiting behavior. Deploy a ServiceMonitor to collect these metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coredns-rrl
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

- `coredns_rrl_requests_exceeded_total`: Total number of requests exceeding the configured request rate limit
- `coredns_rrl_responses_exceeded_total`: Total number of responses exceeding configured response rate limits
- `coredns_dns_requests_total`: Total DNS requests received
- `coredns_dns_responses_total`: Total DNS responses sent

You can query these metrics to identify clients triggering rate limits:

```promql
rate(coredns_rrl_requests_exceeded_total[5m]) > 0
```

## Creating Alerts for Rate Limit Events

Set up Prometheus alerts to notify you when rate limiting activates frequently:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: coredns-rrl-alerts
  namespace: kube-system
spec:
  groups:
  - name: coredns-rrl
    interval: 30s
    rules:
    - alert: CoreDNSRateLimitHigh
      expr: rate(coredns_rrl_requests_exceeded_total[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "CoreDNS requests are exceeding the configured RRL limit"
        description: "CoreDNS has seen {{ $value }} requests per second exceed the configured RRL limit in the last 5 minutes"
```

This alert fires when more than 10 queries per second exceed the configured request rate limit for 5 minutes, indicating a potential query flood.

## Testing Rate Limiting Configuration

Before deploying rate limiting to production, test your configuration to ensure it works as expected without blocking legitimate traffic.

Create a test pod that generates DNS queries:

```bash
kubectl run dns-test --image=busybox --restart=Never --command -- sh -c '
  while true; do
    nslookup kubernetes.default.svc.cluster.local
    sleep 0.01
  done
'
```

Monitor CoreDNS metrics to verify that rate limiting activates:

```bash
kubectl port-forward -n kube-system svc/kube-dns 9153:9153
curl http://localhost:9153/metrics | grep coredns_rrl
```

You should see the `coredns_rrl_requests_exceeded_total` counter incrementing when the test pod exceeds your configured rate limit.

## Optimizing Rate Limit Values

Choosing appropriate rate limit values requires understanding your cluster's normal DNS query patterns. Start by monitoring DNS query rates without rate limiting enabled:

```promql
sum(rate(coredns_dns_requests_total[5m]))
```

Set your initial rate limit to 2-3 times the observed peak traffic per client or client prefix, then gradually reduce it while monitoring for false positives.

## Handling Rate Limit Responses

Applications should handle DNS rate limiting gracefully. When CoreDNS drops a query and the lookup times out or fails temporarily, applications should implement exponential backoff:

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
