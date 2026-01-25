# How to Debug DNS Resolution Issues in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, CoreDNS, Networking, Troubleshooting

Description: A practical guide to diagnosing and fixing DNS resolution problems in Kubernetes clusters, including CoreDNS debugging, service discovery issues, and common misconfigurations.

---

DNS is the backbone of service discovery in Kubernetes. When DNS fails, pods cannot find services, databases, or external endpoints. This guide walks through systematic debugging of DNS issues.

## How Kubernetes DNS Works

```mermaid
graph LR
    A[Pod] --> B[/etc/resolv.conf]
    B --> C[CoreDNS Service]
    C --> D[CoreDNS Pods]
    D --> E{Query Type}
    E -->|cluster.local| F[Kubernetes API]
    E -->|external| G[Upstream DNS]
```

Every pod gets a resolv.conf pointing to the cluster DNS service:

```bash
# Check pod's DNS configuration
kubectl exec -it myapp -- cat /etc/resolv.conf

# Output:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

## Quick DNS Test

First, verify if DNS works at all:

```bash
# Create a debug pod
kubectl run dns-test --image=busybox:1.36 --restart=Never -- sleep 3600

# Test DNS resolution
kubectl exec dns-test -- nslookup kubernetes

# Expected output:
# Server:    10.96.0.10
# Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local
# Name:      kubernetes
# Address 1: 10.96.0.1 kubernetes.default.svc.cluster.local
```

If this fails, you have a DNS problem.

## Check CoreDNS Status

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Output:
# NAME                       READY   STATUS    RESTARTS   AGE
# coredns-5644d7b6d9-abcde   1/1     Running   0          24h
# coredns-5644d7b6d9-fghij   1/1     Running   0          24h

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Check CoreDNS service
kubectl get svc -n kube-system kube-dns

# Output:
# NAME       TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)
# kube-dns   ClusterIP   10.96.0.10   <none>        53/UDP,53/TCP
```

## Common DNS Issues

### Issue 1: CoreDNS Pods Not Running

```bash
# Check pod status
kubectl describe pod -n kube-system -l k8s-app=kube-dns

# Common causes:
# - Resource limits too low
# - Node not schedulable
# - Image pull issues

# Fix: Check events and adjust resources
kubectl get events -n kube-system --field-selector reason=FailedScheduling
```

### Issue 2: Service Not Resolvable

```bash
# Test service resolution
kubectl exec dns-test -- nslookup myservice

# If failing, check service exists
kubectl get svc myservice

# Check service has endpoints
kubectl get endpoints myservice

# Common cause: Service selector does not match pod labels
kubectl describe svc myservice
kubectl get pods --show-labels
```

### Issue 3: External DNS Not Working

```bash
# Test external resolution
kubectl exec dns-test -- nslookup google.com

# If failing, check CoreDNS can reach upstream
kubectl exec -n kube-system -it coredns-xxx -- cat /etc/resolv.conf

# Check CoreDNS ConfigMap for upstream servers
kubectl get configmap coredns -n kube-system -o yaml
```

### Issue 4: ndots Causing Slow Resolution

The default ndots:5 means queries with fewer than 5 dots get search suffixes appended first:

```bash
# Query for "api.example.com" becomes:
# 1. api.example.com.default.svc.cluster.local (fails)
# 2. api.example.com.svc.cluster.local (fails)
# 3. api.example.com.cluster.local (fails)
# 4. api.example.com (succeeds)
```

Fix by adding a trailing dot or adjusting dnsConfig:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"    # Reduce search iterations
  containers:
    - name: app
      image: myapp:v1
```

Or use FQDN with trailing dot in your code:

```python
# Instead of
requests.get("http://api.example.com/endpoint")

# Use trailing dot
requests.get("http://api.example.com./endpoint")
```

## Debugging Tools

### Using dnsutils Pod

```bash
# Create comprehensive debug pod
kubectl run dnsutils --image=registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3 --restart=Never -- sleep infinity

# Run DNS tests
kubectl exec dnsutils -- nslookup kubernetes
kubectl exec dnsutils -- dig kubernetes.default.svc.cluster.local
kubectl exec dnsutils -- dig @10.96.0.10 kubernetes.default.svc.cluster.local
```

### DNS Query Tracing

```bash
# Trace DNS query
kubectl exec dnsutils -- dig +trace google.com

# Check specific DNS server
kubectl exec dnsutils -- dig @10.96.0.10 myservice.default.svc.cluster.local

# Query with verbose output
kubectl exec dnsutils -- nslookup -debug kubernetes
```

### Testing from CoreDNS Pod

```bash
# Get CoreDNS pod name
COREDNS_POD=$(kubectl get pods -n kube-system -l k8s-app=kube-dns -o jsonpath='{.items[0].metadata.name}')

# Check CoreDNS can resolve
kubectl exec -n kube-system $COREDNS_POD -- nslookup kubernetes.default
```

## CoreDNS Configuration

View current configuration:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

Default Corefile:

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
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

### Add Custom DNS Entries

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
        # Custom hosts entries
        hosts {
           192.168.1.100 legacy-db.internal
           192.168.1.101 legacy-api.internal
           fallthrough
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

### Forward Specific Domains

```yaml
data:
  Corefile: |
    .:53 {
        # ... standard config ...
    }
    # Forward company domain to internal DNS
    company.internal:53 {
        forward . 10.0.0.53 10.0.0.54
        cache 30
    }
```

Apply changes:

```bash
kubectl apply -f coredns-configmap.yaml

# Restart CoreDNS to pick up changes
kubectl rollout restart deployment coredns -n kube-system
```

## Service DNS Names

Understanding service DNS format:

```
<service-name>.<namespace>.svc.cluster.local
```

Examples:

```bash
# Same namespace - short name works
curl http://myservice

# Different namespace - need namespace
curl http://myservice.other-namespace

# Full FQDN
curl http://myservice.other-namespace.svc.cluster.local
```

### Headless Services

For StatefulSets with headless services:

```bash
# Pod DNS format
<pod-name>.<service-name>.<namespace>.svc.cluster.local

# Example
mysql-0.mysql.database.svc.cluster.local
```

## DNS Policy Options

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  dnsPolicy: ClusterFirst    # Default - use cluster DNS
  # dnsPolicy: Default       # Use node's DNS
  # dnsPolicy: None          # Custom DNS only
  containers:
    - name: app
      image: myapp:v1
```

Custom DNS configuration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
      - 10.0.0.53
      - 10.0.0.54
    searches:
      - my.domain.local
      - another.domain.local
    options:
      - name: ndots
        value: "2"
  containers:
    - name: app
      image: myapp:v1
```

## Performance Tuning

### Enable DNS Caching

CoreDNS caches by default. Check cache hits:

```bash
# Check CoreDNS metrics
kubectl port-forward -n kube-system svc/kube-dns 9153:9153 &
curl localhost:9153/metrics | grep coredns_cache
```

### Increase CoreDNS Replicas

```bash
# Scale for high load
kubectl scale deployment coredns -n kube-system --replicas=4

# Or use HPA
kubectl autoscale deployment coredns -n kube-system --min=2 --max=10 --cpu-percent=70
```

### Node-Local DNS Cache

For large clusters, use node-local DNS cache:

```yaml
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
      containers:
        - name: node-cache
          image: registry.k8s.io/dns/k8s-dns-node-cache:1.22.20
```

## Monitoring DNS

### Prometheus Metrics

```bash
# Key metrics to monitor
coredns_dns_requests_total        # Total requests
coredns_dns_responses_total       # Total responses by rcode
coredns_forward_requests_total    # Forwarded requests
coredns_cache_hits_total          # Cache hit rate
```

### Alert Rules

```yaml
groups:
  - name: coredns
    rules:
      - alert: CoreDNSDown
        expr: up{job="coredns"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CoreDNS is down"

      - alert: CoreDNSHighErrorRate
        expr: |
          sum(rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]))
          /
          sum(rate(coredns_dns_responses_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CoreDNS error rate above 5%"
```

## Quick Fixes Checklist

1. Check CoreDNS pods are running
2. Verify kube-dns service exists and has endpoints
3. Test DNS from debug pod
4. Check service exists and has endpoints
5. Verify pod network connectivity to DNS service
6. Review CoreDNS logs for errors
7. Check if ndots causing slow resolution
8. Verify upstream DNS servers are reachable
9. Check for network policies blocking DNS traffic
10. Restart CoreDNS if configuration changed

---

DNS issues in Kubernetes often stem from network connectivity problems, misconfigured services, or CoreDNS issues. Start with basic connectivity tests, verify CoreDNS health, and work through the debugging steps systematically. Most issues resolve once you identify whether the problem is internal (cluster DNS) or external (upstream DNS).
