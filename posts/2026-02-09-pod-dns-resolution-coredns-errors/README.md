# How to Fix Kubernetes Pod DNS Resolution Failures from CoreDNS Configuration Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Networking

Description: Learn how to diagnose and fix pod DNS resolution failures caused by CoreDNS misconfigurations, including timeout issues, upstream resolver problems, and service discovery failures.

---

DNS resolution failures in Kubernetes pods prevent applications from discovering services, reaching external APIs, and functioning correctly. CoreDNS serves as the cluster DNS provider, and configuration errors, performance issues, or connectivity problems cause widespread resolution failures that impact all workloads.

This guide covers diagnosing CoreDNS problems, fixing common misconfigurations, and implementing solutions that ensure reliable DNS resolution for pods.

## Understanding Kubernetes DNS Architecture

Pods use DNS to discover Services through the cluster domain (typically cluster.local). CoreDNS pods receive DNS queries from workloads, answer queries for cluster services from Kubernetes API information, and forward external domain queries to upstream resolvers. The kube-dns Service provides a stable IP that pods use as their DNS server.

When DNS fails, applications can't resolve service names to IP addresses. Database connection strings fail, API calls timeout, and inter-service communication breaks. Unlike network connectivity issues that affect specific paths, DNS failures impact all name-based communication.

## Identifying DNS Resolution Failures

Test DNS resolution from a pod to confirm failures.

```bash
# Create a debug pod
kubectl run dns-test --image=busybox:latest -it --rm --restart=Never -- sh

# Inside the pod, test DNS
nslookup kubernetes.default
# Should resolve to cluster IP

# Test external DNS
nslookup google.com

# If these fail, DNS is broken
```

Check CoreDNS pod status.

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Output:
# NAME                       READY   STATUS    RESTARTS   AGE
# coredns-6d4b75cb6d-abc123  1/1     Running   0          5d
# coredns-6d4b75cb6d-def456  1/1     Running   0          5d

# If pods show CrashLoopBackOff or Error, check logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

View CoreDNS configuration.

```bash
# Check CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml

# Look for the Corefile configuration
```

## Diagnosing CoreDNS Configuration Errors

Common configuration errors include syntax mistakes, incorrect upstream servers, and missing plugins.

```bash
# View current CoreDNS configuration
kubectl get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}'

# Typical configuration:
# .:53 {
#     errors
#     health {
#        lameduck 5s
#     }
#     ready
#     kubernetes cluster.local in-addr.arpa ip6.arpa {
#        pods insecure
#        fallthrough in-addr.arpa ip6.arpa
#        ttl 30
#     }
#     prometheus :9153
#     forward . /etc/resolv.conf {
#        max_concurrent 1000
#     }
#     cache 30
#     loop
#     reload
#     loadbalance
# }
```

Check CoreDNS logs for configuration errors.

```bash
# View CoreDNS logs
kubectl logs -n kube-system deploy/coredns --tail=100

# Common error patterns:
# plugin/errors: 2 127.0.0.1:53 - error: read udp timeout
# plugin/kubernetes: no service account token found
# Error parsing Corefile: Corefile:12 - Error during parsing: Unknown directive 'invalid_plugin'
```

## Fixing Forward Configuration

The forward plugin sends external queries to upstream DNS servers. Misconfiguration causes external DNS resolution to fail.

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
        prometheus :9153

        # Forward to specific DNS servers instead of /etc/resolv.conf
        forward . 8.8.8.8 8.8.4.4 {
           max_concurrent 1000
           except cluster.local
        }

        cache 30
        loop
        reload
        loadbalance
    }
```

Apply the updated configuration.

```bash
kubectl apply -f coredns-config.yaml

# Restart CoreDNS pods to reload configuration
kubectl rollout restart deployment coredns -n kube-system

# Wait for rollout to complete
kubectl rollout status deployment coredns -n kube-system
```

## Resolving Service Discovery Issues

When pods can't resolve Service names, check the kubernetes plugin configuration.

```bash
# Test service discovery
kubectl run dns-test --image=busybox:latest -it --rm --restart=Never -- sh

# Try resolving a service
nslookup kubernetes.default.svc.cluster.local

# Try short name
nslookup kubernetes

# Try different namespace
nslookup myapp.production.svc.cluster.local
```

Verify the kubernetes plugin configuration includes correct cluster domain.

```yaml
kubernetes cluster.local in-addr.arpa ip6.arpa {
   pods insecure  # Allow pod DNS queries
   fallthrough in-addr.arpa ip6.arpa  # Fall through for PTR queries
   ttl 30  # Cache TTL
}
```

Check that the Service exists and has endpoints.

```bash
# Verify Service exists
kubectl get service kubernetes -n default

# Check endpoints
kubectl get endpoints kubernetes -n default
```

## Fixing DNS Timeout Issues

DNS timeouts occur when CoreDNS is overloaded or upstream resolvers are slow.

```bash
# Check CoreDNS resource usage
kubectl top pods -n kube-system -l k8s-app=kube-dns

# If CPU or memory is high, increase resources
kubectl set resources deployment coredns -n kube-system \
  --limits=cpu=500m,memory=512Mi \
  --requests=cpu=100m,memory=128Mi
```

Configure timeout and retry settings.

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

        # Configure forward with timeouts
        forward . 8.8.8.8 8.8.4.4 {
           max_concurrent 1000
           policy sequential  # Try servers in order
           health_check 5s    # Check upstream health
           expire 10s         # How long to wait for response
        }

        # Increase cache size and duration
        cache {
           success 10000 300  # Cache 10k successful responses for 5 min
           denial 5000 60     # Cache denials for 1 min
        }

        loop
        reload
        loadbalance
    }
```

## Scaling CoreDNS for High Load

Increase CoreDNS replicas for clusters with many pods or high query rates.

```bash
# Check current replica count
kubectl get deployment coredns -n kube-system

# Scale up
kubectl scale deployment coredns -n kube-system --replicas=4

# Or use HPA for automatic scaling
kubectl autoscale deployment coredns -n kube-system \
  --min=2 \
  --max=10 \
  --cpu-percent=70
```

Enable the autopath plugin to reduce query load.

```yaml
kubernetes cluster.local in-addr.arpa ip6.arpa {
   pods insecure
   fallthrough in-addr.arpa ip6.arpa
   ttl 30
}

# Reduces searches by resolving names in one query
autopath @kubernetes
```

## Implementing NodeLocal DNSCache

Deploy NodeLocal DNSCache to improve DNS performance and reduce CoreDNS load.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-local-dns
  namespace: kube-system
data:
  Corefile: |
    cluster.local:53 {
        errors
        cache {
            success 9984 30
            denial 9984 5
        }
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__CLUSTER__DNS__ {
            force_tcp
        }
        prometheus :9253
    }
    in-addr.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__CLUSTER__DNS__ {
            force_tcp
        }
        prometheus :9253
    }
    ip6.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__CLUSTER__DNS__ {
            force_tcp
        }
        prometheus :9253
    }
    .:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__UPSTREAM__SERVERS__ {
            force_tcp
        }
        prometheus :9253
    }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-local-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: node-local-dns
  template:
    metadata:
      labels:
        k8s-app: node-local-dns
    spec:
      priorityClassName: system-node-critical
      serviceAccountName: node-local-dns
      hostNetwork: true
      dnsPolicy: Default
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
      containers:
      - name: node-cache
        image: registry.k8s.io/dns/k8s-dns-node-cache:1.22.20
        args:
        - -localip
        - 169.254.20.10
        - -conf
        - /etc/coredns/Corefile
        volumeMounts:
        - name: config-volume
          mountPath: /etc/coredns
        - name: xtables-lock
          mountPath: /run/xtables.lock
      volumes:
      - name: config-volume
        configMap:
          name: node-local-dns
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
```

## Monitoring CoreDNS Performance

Deploy ServiceMonitor for CoreDNS metrics.

```yaml
apiVersion: v1
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

Create alerts for DNS issues.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: coredns
      rules:
      - alert: CoreDNSDown
        expr: |
          absent(up{job="kube-dns"}) or up{job="kube-dns"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CoreDNS is down"

      - alert: CoreDNSHighErrorRate
        expr: |
          rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS error rate above 5%"

      - alert: CoreDNSHighLatency
        expr: |
          histogram_quantile(0.99,
            rate(coredns_dns_request_duration_seconds_bucket[5m])
          ) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS P99 latency above 100ms"
```

## Testing DNS Resolution End-to-End

Create comprehensive DNS tests.

```bash
#!/bin/bash
# test-dns.sh

echo "Testing Kubernetes DNS..."

# Test cluster DNS
if nslookup kubernetes.default.svc.cluster.local > /dev/null; then
  echo "✓ Cluster DNS resolution working"
else
  echo "✗ Cluster DNS resolution failed"
fi

# Test external DNS
if nslookup google.com > /dev/null; then
  echo "✓ External DNS resolution working"
else
  echo "✗ External DNS resolution failed"
fi

# Test reverse DNS
if nslookup 8.8.8.8 > /dev/null; then
  echo "✓ Reverse DNS working"
else
  echo "✗ Reverse DNS failed"
fi

# Measure DNS query time
time nslookup kubernetes.default.svc.cluster.local
```

Run as a CronJob for continuous validation.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dns-health-check
  namespace: kube-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: dns-test
            image: busybox:latest
            command:
            - /bin/sh
            - /scripts/test-dns.sh
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: dns-test-scripts
          restartPolicy: OnFailure
```

DNS resolution failures from CoreDNS misconfigurations disrupt all name-based service discovery and external connectivity. By properly configuring the forward plugin, scaling CoreDNS appropriately, implementing caching strategies, and monitoring DNS performance, you ensure reliable resolution for all cluster workloads. Combined with NodeLocal DNSCache and comprehensive testing, these practices create a robust DNS infrastructure that supports application requirements without becoming a bottleneck.
