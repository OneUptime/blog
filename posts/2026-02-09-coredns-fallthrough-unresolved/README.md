# How to Configure CoreDNS Fallthrough Behavior for Unresolved DNS Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS, Configuration

Description: Learn how to configure CoreDNS fallthrough behavior to handle unresolved DNS queries properly, ensuring queries pass through plugin chains correctly and external resolution works as expected in Kubernetes.

---

The fallthrough directive in CoreDNS determines what happens when a plugin cannot answer a DNS query. Proper fallthrough configuration ensures queries flow through the plugin chain correctly, preventing resolution failures and enabling flexible DNS architectures. Misconfigured fallthrough is a common cause of DNS issues in Kubernetes clusters.

This guide explains how to configure fallthrough behavior for robust and reliable DNS resolution.

## Understanding Fallthrough Mechanics

When a CoreDNS plugin receives a query, it can:

1. **Answer the query** - Return a response immediately
2. **Return NXDOMAIN** - Indicate the name doesn't exist
3. **Fall through** - Pass the query to the next plugin in the chain

Without fallthrough, plugins that can't answer a query return NXDOMAIN, stopping further resolution attempts.

Default behavior without fallthrough:

```
Query: external.com
→ kubernetes plugin (can't answer, returns NXDOMAIN)
→ NXDOMAIN returned to client
→ forward plugin never consulted
```

With fallthrough:

```
Query: external.com
→ kubernetes plugin (can't answer, falls through)
→ forward plugin (resolves via upstream DNS)
→ Answer returned to client
```

## Basic Fallthrough Configuration

The kubernetes plugin requires fallthrough for external queries:

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
           fallthrough in-addr.arpa ip6.arpa  # Critical for PTR queries
           ttl 30
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

The `fallthrough in-addr.arpa ip6.arpa` allows reverse DNS queries for non-cluster IPs to reach the forward plugin.

Apply configuration:

```bash
# Apply ConfigMap
kubectl apply -f coredns-config.yaml

# Restart CoreDNS
kubectl rollout restart deployment coredns -n kube-system
```

## Conditional Fallthrough

Specify which zones should fall through:

```yaml
.:53 {
    errors
    health
    ready

    # Kubernetes plugin with selective fallthrough
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       # Fall through for reverse DNS zones only
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }

    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
}
```

This configuration:
- Answers queries for cluster.local domains
- Returns NXDOMAIN for unknown cluster.local subdomains
- Falls through for reverse DNS (in-addr.arpa, ip6.arpa)
- All other queries go to forward plugin

## Multiple Plugin Fallthrough

Configure fallthrough across multiple plugins:

```yaml
.:53 {
    errors
    health
    ready

    # Custom hosts with fallthrough
    hosts /etc/coredns/customhosts {
        fallthrough  # If not in hosts file, try next plugin
    }

    # Rewrite plugin with fallthrough
    rewrite stop {
        name regex ^api\.company\.com$ api-service.production.svc.cluster.local
        answer auto
    }

    # Kubernetes plugin with fallthrough
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }

    # Final fallback to upstream DNS
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
}
```

Query flow:

1. Check hosts plugin
2. Apply rewrite rules if matched
3. Try kubernetes plugin
4. Forward to upstream DNS

## Zone-Specific Fallthrough Configuration

Configure different fallthrough behavior per zone:

```yaml
# Cluster-local zone (no external fallthrough)
cluster.local:53 {
    errors

    kubernetes cluster.local {
       pods insecure
       # No fallthrough - all cluster.local queries must resolve here
       ttl 30
    }

    # If kubernetes can't answer, return NXDOMAIN
    prometheus :9153
}

# All other zones (with fallthrough)
.:53 {
    errors
    health
    ready

    # Try kubernetes for PTR records
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }

    # Forward everything else upstream
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
}
```

## Fallthrough with Custom Zones

Implement fallthrough for custom internal zones:

```yaml
# Internal zone with fallback
internal.company.com:53 {
    errors

    # Try custom hosts first
    hosts /etc/coredns/internal-hosts {
        fallthrough
    }

    # Forward to internal DNS servers
    forward . 10.0.1.53 10.0.1.54 {
        policy sequential
    }

    cache 60
}

# Default zone
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
    cache 30
    loop
    reload
}
```

## Testing Fallthrough Behavior

Create tests to verify fallthrough works correctly:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fallthrough-test
data:
  test.sh: |
    #!/bin/bash

    echo "Testing CoreDNS fallthrough behavior..."

    # Test 1: Cluster service resolution
    echo "Test 1: Cluster service (should resolve via kubernetes plugin)"
    if nslookup kubernetes.default.svc.cluster.local | grep -q "Address:"; then
        echo "PASS: Cluster service resolves"
    else
        echo "FAIL: Cluster service doesn't resolve"
    fi

    # Test 2: External domain resolution
    echo "Test 2: External domain (should fallthrough to forward)"
    if nslookup google.com | grep -q "Address:"; then
        echo "PASS: External domain resolves"
    else
        echo "FAIL: External domain doesn't resolve (fallthrough issue?)"
    fi

    # Test 3: Non-existent cluster service
    echo "Test 3: Non-existent cluster service"
    result=$(nslookup fake-service.default.svc.cluster.local 2>&1)
    if echo "$result" | grep -q "NXDOMAIN\|can't find"; then
        echo "PASS: Non-existent service returns NXDOMAIN"
    else
        echo "FAIL: Unexpected response for non-existent service"
    fi

    # Test 4: Reverse DNS for external IP
    echo "Test 4: Reverse DNS (should fallthrough to upstream)"
    if nslookup 8.8.8.8 | grep -q "name ="; then
        echo "PASS: Reverse DNS works (fallthrough successful)"
    else
        echo "WARN: Reverse DNS didn't resolve (may be expected)"
    fi

    # Test 5: Reverse DNS for pod IP
    echo "Test 5: Reverse DNS for pod IP"
    POD_IP=$(hostname -i)
    nslookup $POD_IP || echo "INFO: Pod reverse DNS not configured"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: test-fallthrough
spec:
  template:
    spec:
      containers:
      - name: test
        image: nicolaka/netshoot
        command:
        - sh
        - /scripts/test.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: fallthrough-test
      restartPolicy: Never
```

Run the tests:

```bash
# Deploy test job
kubectl apply -f fallthrough-test.yaml

# View results
kubectl logs job/test-fallthrough

# Clean up
kubectl delete job test-fallthrough
```

## Debugging Fallthrough Issues

Enable logging to debug fallthrough behavior:

```yaml
.:53 {
    log  # Enable query logging
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
    cache 30
    loop
    reload
}
```

View logs to trace query flow:

```bash
# Stream CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns -f

# In another terminal, test queries
kubectl run test --image=nicolaka/netshoot --rm -it -- nslookup google.com
```

Look for log entries showing query progression through plugins.

## Common Fallthrough Issues and Solutions

**Issue: External domains returning NXDOMAIN**

Problem: Missing fallthrough in kubernetes plugin

```yaml
# BAD - no fallthrough
kubernetes cluster.local in-addr.arpa ip6.arpa {
   pods insecure
   ttl 30
}

# GOOD - with fallthrough for PTR records
kubernetes cluster.local in-addr.arpa ip6.arpa {
   pods insecure
   fallthrough in-addr.arpa ip6.arpa
   ttl 30
}
```

**Issue: Reverse DNS not working**

Problem: PTR queries not falling through

```yaml
# Ensure reverse DNS zones fall through
kubernetes cluster.local in-addr.arpa ip6.arpa {
   pods insecure
   fallthrough in-addr.arpa ip6.arpa  # Critical
   ttl 30
}
```

**Issue: Custom hosts blocking other resolution**

Problem: Hosts plugin missing fallthrough

```yaml
# BAD
hosts /etc/coredns/customhosts {
    # Missing fallthrough
}

# GOOD
hosts /etc/coredns/customhosts {
    fallthrough  # Allow other plugins to handle unmatched queries
}
```

## Performance Implications

Fallthrough affects query performance:

```yaml
# Minimize fallthrough hops
.:53 {
    errors
    health

    # Order plugins from most to least likely to answer

    # 1. Cluster services (most common)
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }

    # 2. Cache recent queries
    cache 300 {
        success 8192
        denial 2048
    }

    # 3. Forward to upstream (last resort)
    forward . /etc/resolv.conf

    loop
    reload
}
```

## Monitoring Fallthrough Behavior

Track query patterns with Prometheus:

```promql
# Queries handled by kubernetes plugin
sum(rate(coredns_kubernetes_dns_programming_duration_seconds_count[5m]))

# Queries forwarded upstream (fell through kubernetes plugin)
sum(rate(coredns_forward_requests_total[5m]))

# NXDOMAIN responses
sum(rate(coredns_dns_responses_total{rcode="NXDOMAIN"}[5m]))
```

Create an alert for unusual fallthrough patterns:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-coredns-alerts
data:
  alerts.yaml: |
    groups:
    - name: coredns-fallthrough
      rules:
      - alert: HighNXDOMAINRate
        expr: |
          rate(coredns_dns_responses_total{rcode="NXDOMAIN"}[5m])
          /
          rate(coredns_dns_requests_total[5m])
          > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High NXDOMAIN response rate"
          description: "More than 10% of queries returning NXDOMAIN"
```

## Advanced Fallthrough Patterns

Implement multi-tier DNS resolution:

```yaml
.:53 {
    errors
    health
    ready

    # Tier 1: Local overrides
    hosts /etc/coredns/overrides {
        fallthrough
    }

    # Tier 2: Cluster services
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }

    # Tier 3: Internal DNS
    forward internal.company.com 10.0.1.53 {
        policy sequential
    }

    # Tier 4: Public DNS
    forward . 8.8.8.8 8.8.4.4 {
        prefer_udp
    }

    cache 300
    prometheus :9153
    loop
    reload
}
```

## Best Practices

Follow these guidelines for fallthrough configuration:

1. Always use fallthrough for PTR record zones
2. Order plugins from most to least specific
3. Test fallthrough behavior thoroughly
4. Monitor NXDOMAIN rates after changes
5. Document why fallthrough is or isn't used per plugin
6. Use conditional fallthrough for security-sensitive zones
7. Enable logging when debugging fallthrough issues
8. Review fallthrough configuration during DNS troubleshooting

Proper fallthrough configuration is critical for reliable DNS resolution in Kubernetes. By understanding how queries flow through the CoreDNS plugin chain and configuring fallthrough appropriately, you ensure external domains resolve correctly while maintaining cluster DNS functionality. Testing and monitoring fallthrough behavior helps prevent common DNS issues.

For more CoreDNS configuration patterns, explore our guides on [debugging DNS resolution](https://oneuptime.com/blog/post/2026-02-09-debug-dns-resolution-dnsutils/view) and [CoreDNS plugin chain debugging](https://oneuptime.com/blog/post/2026-02-09-debug-coredns-plugin-chain/view).
