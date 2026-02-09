# How to Debug CoreDNS Plugin Chain Ordering and Configuration Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Troubleshooting, Debugging

Description: Learn systematic approaches to debug CoreDNS plugin chain ordering issues and configuration errors, identifying and resolving common problems that affect DNS resolution in Kubernetes clusters.

---

CoreDNS processes queries through a plugin chain where order matters significantly. Misconfigured plugin chains cause subtle DNS issues that are challenging to diagnose. Understanding how to debug plugin chain ordering and configuration errors helps you maintain reliable DNS resolution and quickly resolve problems when they occur.

This guide provides systematic debugging techniques for CoreDNS plugin chains.

## Understanding Plugin Chain Execution

CoreDNS executes plugins in the order they appear in the Corefile. Each plugin can:

1. Answer the query and stop processing
2. Modify the query and pass to next plugin
3. Fall through to the next plugin
4. Return an error

Plugin categories:

- **Control plugins**: errors, log, health
- **Query processors**: rewrite, hosts, template
- **Resolution plugins**: kubernetes, forward, file
- **Cache plugins**: cache
- **Monitoring plugins**: prometheus, metrics

## Common Plugin Chain Issues

Typical problems and their symptoms:

**Issue: Wrong plugin order**

```yaml
# BAD: Cache after forward
.:53 {
    forward . 8.8.8.8
    cache 30  # Too late - queries already forwarded
}

# GOOD: Cache before forward
.:53 {
    cache 30  # Cache first
    forward . 8.8.8.8
}
```

**Issue: Missing fallthrough**

```yaml
# BAD: No fallthrough
kubernetes cluster.local {
   pods insecure
}

# External queries fail here
forward . 8.8.8.8

# GOOD: With fallthrough
kubernetes cluster.local {
   pods insecure
   fallthrough  # Allow external queries to reach forward
}

forward . 8.8.8.8
```

## Enabling Debug Logging

Add log plugin to trace query flow:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        log  # Enable query logging
        errors  # Log errors
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
        loadbalance
    }
```

Apply and view logs:

```bash
# Apply configuration
kubectl apply -f coredns-debug.yaml

# Restart CoreDNS
kubectl rollout restart deployment coredns -n kube-system

# Stream logs with query details
kubectl logs -n kube-system -l k8s-app=kube-dns -f
```

Test and observe:

```bash
# Make test query
kubectl run test --image=nicolaka/netshoot --rm -it -- nslookup kubernetes.default

# Watch CoreDNS logs in another terminal
# You'll see query flow through plugin chain
```

## Analyzing Plugin Chain with Debug Output

Enable detailed debugging:

```yaml
.:53 {
    debug  # Very verbose - use temporarily
    log
    errors

    kubernetes cluster.local {
       pods insecure
       fallthrough
       ttl 30
    }

    forward . 8.8.8.8
    cache 30
}
```

Debug output shows plugin invocation order and decisions.

## Testing Plugin Chain Configuration

Create comprehensive test:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: plugin-chain-test
data:
  test.sh: |
    #!/bin/bash

    echo "Testing CoreDNS plugin chain..."

    # Test 1: Cluster service resolution (kubernetes plugin)
    echo "Test 1: Cluster service"
    result=$(nslookup kubernetes.default.svc.cluster.local 2>&1)
    if echo "$result" | grep -q "Address:"; then
        echo "PASS: Kubernetes plugin working"
    else
        echo "FAIL: Kubernetes plugin issue"
        echo "$result"
    fi
    echo ""

    # Test 2: External domain (forward plugin)
    echo "Test 2: External domain"
    result=$(nslookup google.com 2>&1)
    if echo "$result" | grep -q "Address:"; then
        echo "PASS: Forward plugin working"
    else
        echo "FAIL: Forward plugin issue or no fallthrough"
        echo "$result"
    fi
    echo ""

    # Test 3: Non-existent cluster service
    echo "Test 3: Non-existent service"
    result=$(nslookup fake-service.default.svc.cluster.local 2>&1)
    if echo "$result" | grep -q "NXDOMAIN\|can't find"; then
        echo "PASS: NXDOMAIN returned correctly"
    else
        echo "FAIL: Unexpected response"
        echo "$result"
    fi
    echo ""

    # Test 4: Cache effectiveness (time multiple queries)
    echo "Test 4: Cache performance"
    service="kubernetes.default.svc.cluster.local"

    # First query (cache miss)
    start=$(date +%s%N)
    nslookup $service >/dev/null 2>&1
    end=$(date +%s%N)
    first_duration=$((($end - $start) / 1000000))

    # Second query (should hit cache)
    start=$(date +%s%N)
    nslookup $service >/dev/null 2>&1
    end=$(date +%s%N)
    second_duration=$((($end - $start) / 1000000))

    echo "First query: ${first_duration}ms"
    echo "Second query: ${second_duration}ms"

    if [ $second_duration -lt $first_duration ]; then
        echo "PASS: Cache appears to be working"
    else
        echo "WARN: Cache may not be effective"
    fi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: test-plugin-chain
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
          name: plugin-chain-test
      restartPolicy: Never
```

Run test:

```bash
kubectl apply -f plugin-chain-test.yaml
kubectl logs job/test-plugin-chain
```

## Validating Corefile Syntax

Check for syntax errors before applying:

```bash
# Extract Corefile from ConfigMap
kubectl get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}' > Corefile

# Validate with CoreDNS binary (if available locally)
coredns -conf Corefile -validate

# Or use a validation container
kubectl run coredns-validate --image=coredns/coredns:1.10.1 --rm -it -- \
  coredns -conf /dev/stdin -validate < Corefile
```

## Common Configuration Errors

**Error: Plugin not loaded**

```yaml
# If plugin is not in CoreDNS build, you'll see:
# plugin/example: not found

# Solution: Verify plugin availability
kubectl exec -n kube-system coredns-xxxxx -- coredns -plugins
```

**Error: Syntax error in plugin configuration**

```yaml
# BAD: Missing required parameter
kubernetes cluster.local {
   pods  # Missing value
}

# GOOD: Proper configuration
kubernetes cluster.local {
   pods insecure
}
```

**Error: Conflicting plugin configuration**

```yaml
# BAD: Multiple cache plugins with different configs
cache 30
# ... other plugins ...
cache 60  # Conflict!

# GOOD: Single cache configuration
cache 60 {
    success 8192 60
    denial 2048 10
}
```

## Plugin Chain Debugging Tool

Create a debugging script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-debug-tool
data:
  debug.sh: |
    #!/bin/bash

    echo "=== CoreDNS Configuration Debug ==="
    echo ""

    # Get CoreDNS ConfigMap
    echo "Current Corefile:"
    kubectl get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}'
    echo ""
    echo ""

    # Check CoreDNS pods
    echo "CoreDNS Pods:"
    kubectl get pods -n kube-system -l k8s-app=kube-dns
    echo ""

    # Check recent errors
    echo "Recent CoreDNS Errors:"
    kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50 | grep -i error || echo "No errors found"
    echo ""

    # Test basic resolution
    echo "Testing DNS Resolution:"
    kubectl run dns-test --image=nicolaka/netshoot --rm -it -- /bin/sh -c "
        echo 'Cluster DNS:'
        nslookup kubernetes.default.svc.cluster.local
        echo ''
        echo 'External DNS:'
        nslookup google.com
    "
    echo ""

    # Check CoreDNS metrics
    echo "CoreDNS Metrics (cache):"
    kubectl exec -n kube-system -l k8s-app=kube-dns -- wget -qO- http://localhost:9153/metrics | grep coredns_cache_hits_total
    echo ""

    # List loaded plugins
    echo "Loaded Plugins:"
    kubectl exec -n kube-system -l k8s-app=kube-dns -- coredns -plugins
```

## Monitoring Plugin Chain Health

Track plugin performance:

```promql
# Requests per plugin
sum(rate(coredns_dns_requests_total[5m])) by (plugin)

# Errors per plugin
sum(rate(coredns_dns_errors_total[5m])) by (plugin)

# Response time by plugin
histogram_quantile(0.95,
  rate(coredns_dns_request_duration_seconds_bucket[5m])
)
```

Create alerts for plugin issues:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-plugin-alerts
data:
  alerts.yaml: |
    groups:
    - name: coredns-plugins
      rules:
      - alert: CoreDNSPluginErrors
        expr: rate(coredns_plugin_errors_total[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS plugin errors detected"
          description: "Plugin {{ $labels.plugin }} is experiencing errors"

      - alert: CoreDNSForwardFailures
        expr: rate(coredns_forward_healthcheck_failures_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS forward plugin health check failures"
          description: "Upstream DNS servers failing"
```

## Best Practices for Plugin Chain Configuration

Follow these guidelines:

1. **Order plugins correctly**: Control → Processing → Resolution → Cache
2. **Use fallthrough appropriately**: Enable for plugins that might not answer all queries
3. **Test after changes**: Verify both cluster and external resolution
4. **Enable logging temporarily**: For debugging complex issues
5. **Monitor plugin metrics**: Track performance per plugin
6. **Document plugin order**: Explain why specific ordering is used
7. **Version control Corefile**: Track configuration changes
8. **Test in non-production first**: Verify changes before applying to production
9. **Have rollback plan**: Keep previous working configuration
10. **Regular configuration audits**: Review plugin chain periodically

Debugging CoreDNS plugin chains requires understanding how plugins interact and execute in sequence. By using logging, monitoring, and systematic testing, you can quickly identify and resolve configuration issues. Proper plugin ordering and configuration ensure reliable DNS resolution for your Kubernetes clusters.

For more CoreDNS troubleshooting, explore our guides on [DNS resolution debugging](https://oneuptime.com/blog/post/debug-dns-resolution-dnsutils/view) and [CoreDNS monitoring](https://oneuptime.com/blog/post/coredns-prometheus-dns-performance/view).
