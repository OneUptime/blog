# How to Configure Pod DNS Settings in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, CoreDNS, Networking, DevOps, Troubleshooting

Description: Learn how to configure DNS settings for Kubernetes pods. This guide covers DNS policies, custom nameservers, search domains, and troubleshooting common DNS resolution issues.

---

DNS resolution is fundamental to Kubernetes networking. Pods need to resolve service names, external domains, and sometimes custom internal names. Understanding and configuring DNS properly prevents connectivity issues and improves application reliability.

## Default DNS Behavior

By default, pods use the cluster DNS (CoreDNS) configured in `/etc/resolv.conf`:

```bash
# Inside a pod
cat /etc/resolv.conf

# Output:
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

This means:
- DNS queries go to CoreDNS at 10.96.0.10
- Short names get search domains appended
- Names with fewer than 5 dots trigger search domain lookups

## DNS Policies

Kubernetes offers four DNS policies:

### ClusterFirst (Default)

Uses cluster DNS for cluster-local names, forwards external queries to upstream DNS.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  dnsPolicy: ClusterFirst
  containers:
    - name: myapp
      image: myapp:1.0.0
```

### ClusterFirstWithHostNet

For pods using hostNetwork that still need cluster DNS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-network-pod
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet  # Required for cluster DNS with hostNetwork
  containers:
    - name: app
      image: myapp:1.0.0
```

### Default

Inherits DNS configuration from the node:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: node-dns-pod
spec:
  dnsPolicy: Default  # Uses node's /etc/resolv.conf
  containers:
    - name: app
      image: myapp:1.0.0
```

### None

No DNS configuration provided; you must specify custom DNS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
    searches:
      - example.com
    options:
      - name: ndots
        value: "2"
  containers:
    - name: app
      image: myapp:1.0.0
```

## Custom DNS Configuration

Use `dnsConfig` to customize DNS settings without changing the policy:

### Add Custom Nameservers

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    nameservers:
      - 192.168.1.100  # Internal DNS server
    searches:
      - internal.company.com
      - company.com
    options:
      - name: ndots
        value: "2"
      - name: timeout
        value: "3"
      - name: attempts
        value: "2"
  containers:
    - name: myapp
      image: myapp:1.0.0
```

Result in `/etc/resolv.conf`:

```
nameserver 10.96.0.10
nameserver 192.168.1.100
search default.svc.cluster.local svc.cluster.local cluster.local internal.company.com company.com
options ndots:2 timeout:3 attempts:2
```

### Reduce DNS Lookups with ndots

The default `ndots:5` causes many unnecessary DNS queries:

```bash
# Resolving "api.example.com" with ndots:5 triggers:
# 1. api.example.com.default.svc.cluster.local
# 2. api.example.com.svc.cluster.local
# 3. api.example.com.cluster.local
# 4. api.example.com (finally the actual query)
```

For applications making many external calls, reduce ndots:

```yaml
dnsConfig:
  options:
    - name: ndots
      value: "2"  # Reduce from 5 to 2
```

## Deployment-Wide DNS Settings

Apply DNS config to all pods in a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      dnsPolicy: ClusterFirst
      dnsConfig:
        options:
          - name: ndots
            value: "2"
          - name: single-request-reopen
      containers:
        - name: api
          image: api-server:1.0.0
```

## CoreDNS Configuration

CoreDNS is configured via ConfigMap:

```bash
kubectl get configmap coredns -n kube-system -o yaml
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
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
    # Custom zone for internal services
    internal.company.com:53 {
        errors
        cache 30
        forward . 192.168.1.100
    }
```

### Add Static Hosts

Use the hosts plugin for static entries:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  custom.server: |
    hosts {
      192.168.1.50 legacy-db.internal
      192.168.1.51 legacy-api.internal
      fallthrough
    }
```

## Troubleshooting DNS

### Test DNS Resolution

```bash
# Create a debug pod
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- sh

# Inside the pod:
# Check resolv.conf
cat /etc/resolv.conf

# Test cluster DNS
nslookup kubernetes.default

# Test service resolution
nslookup myservice.mynamespace.svc.cluster.local

# Test external DNS
nslookup google.com
```

### Check CoreDNS Status

```bash
# CoreDNS pods running?
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# CoreDNS service
kubectl get svc kube-dns -n kube-system
```

### DNS Resolution Timing

```bash
# Time DNS lookups
kubectl run dns-perf --image=busybox --rm -it --restart=Never -- sh -c \
  'time nslookup kubernetes.default > /dev/null'
```

### Common Issues

**Issue: DNS resolution slow**

```yaml
# Reduce ndots to minimize search domain lookups
dnsConfig:
  options:
    - name: ndots
      value: "2"
```

**Issue: "connection refused" to cluster DNS**

```bash
# Check if CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check if DNS service has endpoints
kubectl get endpoints kube-dns -n kube-system
```

**Issue: External domains not resolving**

```bash
# Check CoreDNS can reach upstream DNS
kubectl exec -n kube-system -it <coredns-pod> -- nslookup google.com 8.8.8.8

# Check CoreDNS forward configuration
kubectl get configmap coredns -n kube-system -o yaml | grep forward
```

**Issue: Service discovery not working**

```bash
# Verify service exists
kubectl get svc myservice -n mynamespace

# Check endpoints
kubectl get endpoints myservice -n mynamespace

# Test with full FQDN
nslookup myservice.mynamespace.svc.cluster.local
```

## DNS Debugging Script

```bash
#!/bin/bash
# dns-debug.sh

NAMESPACE=${1:-default}

echo "=== CoreDNS Pods ==="
kubectl get pods -n kube-system -l k8s-app=kube-dns

echo -e "\n=== CoreDNS Service ==="
kubectl get svc kube-dns -n kube-system

echo -e "\n=== CoreDNS Endpoints ==="
kubectl get endpoints kube-dns -n kube-system

echo -e "\n=== Starting DNS Test Pod ==="
kubectl run dns-debug-$RANDOM --namespace=$NAMESPACE --image=busybox:1.36 --rm -it --restart=Never -- sh -c '
echo "=== resolv.conf ==="
cat /etc/resolv.conf

echo -e "\n=== Testing cluster DNS ==="
nslookup kubernetes.default

echo -e "\n=== Testing external DNS ==="
nslookup google.com

echo -e "\n=== DNS query time ==="
time nslookup kubernetes.default > /dev/null 2>&1
'
```

## Best Practices

1. **Reduce ndots for external-heavy workloads** to minimize DNS queries
2. **Use FQDNs in configuration** (ending with `.`) to skip search domains
3. **Monitor CoreDNS metrics** for latency and errors
4. **Set appropriate timeouts** for applications sensitive to DNS delays
5. **Use DNS caching** where appropriate (CoreDNS caches by default)

```yaml
# FQDN usage example
env:
  - name: DATABASE_HOST
    value: "postgres.database.svc.cluster.local."  # Trailing dot = FQDN
  - name: EXTERNAL_API
    value: "api.example.com."  # No search domain lookups
```

### Prometheus Metrics for CoreDNS

```promql
# DNS query latency
histogram_quantile(0.99, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le))

# DNS errors
sum(rate(coredns_dns_responses_total{rcode!="NOERROR"}[5m])) by (rcode)

# DNS requests per second
sum(rate(coredns_dns_requests_total[5m]))
```

---

DNS configuration impacts every network call your pods make. Understand the default behavior, tune ndots for your workload, and know how to troubleshoot resolution issues. Most Kubernetes networking problems are DNS problems in disguise.
