# How to Troubleshoot DNS Resolution in Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Kubernetes, CoreDNS, Troubleshooting, Linux, Networking

Description: Diagnose and fix DNS resolution failures in Kubernetes pods including CoreDNS issues, service discovery failures, and search domain configuration problems.

## Introduction

DNS in most current Kubernetes clusters is managed by the CoreDNS add-on, which resolves both Kubernetes service names (like `my-service.my-namespace.svc.cluster.local`) and external domains. DNS failures in pods manifest as connection errors, slow service startup, or intermittent timeouts. Kubernetes DNS issues have several unique causes not found in regular Linux environments.

## Verify DNS is Working in a Pod

```bash
# Run a temporary debugging pod with DNS tools:

kubectl run dns-debug --image=infoblox/dnstools:latest --rm -it --restart=Never -- bash

# Inside the pod:
# Test service resolution:
nslookup kubernetes.default.svc.cluster.local
dig kubernetes.default.svc.cluster.local

# Test external resolution:
nslookup google.com
dig google.com

# Check pod's DNS configuration:
cat /etc/resolv.conf
# Should contain:
# nameserver <kube-dns service ClusterIP>   (for example, 10.96.0.10)
# search <namespace>.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

## CoreDNS Health Check

```bash
# Check CoreDNS pod status:
kubectl -n kube-system get pods -l k8s-app=kube-dns
# All pods should be Running

# Check CoreDNS logs:
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50

# Check CoreDNS service:
kubectl -n kube-system get svc kube-dns
# CLUSTER-IP usually matches what's in /etc/resolv.conf of pods
# unless NodeLocal DNSCache or custom cluster DNS is configured

# Test CoreDNS directly:
COREDNS_IP=$(kubectl -n kube-system get svc kube-dns -o jsonpath='{.spec.clusterIP}')
kubectl run test-dns --image=busybox --rm -it --restart=Never -- \
  nslookup kubernetes.default $COREDNS_IP
```

## Common DNS Failures

```bash
# Failure 1: NXDOMAIN for service names
# Cause: wrong namespace/service name, missing search domain, or custom resolver settings
# Debug:
kubectl run debug --image=busybox --rm -it --restart=Never -- sh
# Inside:
nslookup my-service.my-namespace    # Short form
nslookup my-service.my-namespace.svc.cluster.local.  # FQDN with trailing dot

# Failure 2: DNS timeout (CoreDNS unreachable)
# Check: can the pod reach CoreDNS?
kubectl run debug --image=busybox --rm -it --restart=Never -- sh
# nslookup kubernetes.default 10.96.0.10  # Test a DNS query
# nc -zv 10.96.0.10 53                   # Test TCP connect
# dig +tcp @10.96.0.10 kubernetes.default # Test TCP DNS if dig is available

# Failure 3: Slow DNS causing 5-second delays
# This can be caused by glibc A/AAAA lookups or dropped UDP DNS packets
# waiting for the resolver timeout
# Symptom: getaddrinfo() stalls in 5-second increments
# Fix: enable NodeLocal DNSCache, or add single-request-reopen in pod dnsConfig
# for glibc-based images where appropriate
```

## CoreDNS Configuration

```bash
# View current CoreDNS configuration:
kubectl -n kube-system get configmap coredns -o yaml

# Example Corefile:
# .:53 {
#     errors
#     health
#     ready
#     kubernetes cluster.local in-addr.arpa ip6.arpa {
#         pods insecure
#         fallthrough in-addr.arpa ip6.arpa
#     }
#     prometheus :9153
#     forward . /etc/resolv.conf {
#         max_concurrent 1000
#     }
#     cache 30
#     loop
#     reload
#     loadbalance
# }

# Edit CoreDNS config:
kubectl -n kube-system edit configmap coredns

# Restart CoreDNS to apply changes:
kubectl -n kube-system rollout restart deployment/coredns
```

## Fix: ndots and Search Domain Optimization

```yaml
# Pods with ndots:5 try search-list expansions first for names with fewer than 5 dots
# This can cause multiple extra DNS queries for external domains

# For pods that resolve mostly external domains, reduce ndots:
# In pod spec:
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    options:
      - name: ndots
        value: "1"   # Try as absolute domain if it has 1+ dots
    # With ClusterFirst, custom searches are merged with Kubernetes' base search list.
    # To replace the search list, use dnsPolicy: None and set nameservers explicitly.
```

## Fix: DNS Cache in Applications

```bash
# ClusterIP service IPs are stable for the lifetime of the Service object,
# but external DNS and headless Service answers can change
# Some runtimes and libraries cache DNS results for a long time
# CoreDNS's kubernetes plugin defaults Service-record TTLs to 5 seconds;
# cache 30 caps CoreDNS caching and does not force external DNS TTLs to 30 seconds

# For Java applications:
# Set the Java security property: networkaddress.cache.ttl=30
# Or: networkaddress.cache.ttl=10   (aggressive re-resolve)
# Some JVMs also honor the implementation-specific -Dsun.net.inetaddr.ttl=30

# Check application DNS behavior:
strace -p $POD_PID -e trace=network -s 128 2>&1 | grep -E "sendto|recvfrom|connect" | head -20
```

## Conclusion

Kubernetes DNS troubleshooting starts with checking CoreDNS pod health and logs, then testing resolution from inside the affected pod using a debug container. For service discovery failures, verify the full FQDN (`service.namespace.svc.cluster.local`) works before debugging the short form. The most common performance issue is `ndots:5` causing multiple lookup attempts for external domains - reduce to `ndots:1` for pods that primarily resolve external names. Monitor CoreDNS metrics at `:9153` for cache hit rates and error rates.
