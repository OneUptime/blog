# How to Use nslookup and dig for DNS Debugging in Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Debugging

Description: Master nslookup and dig commands for comprehensive DNS troubleshooting and debugging in Kubernetes pods and clusters.

---

DNS resolution is fundamental to Kubernetes operation. Pods use DNS to discover services, resolve external hostnames, and communicate with each other. When DNS fails, applications cannot connect to dependencies even though network connectivity works fine. The symptoms are confusing because connection errors do not clearly indicate DNS as the problem.

nslookup and dig are essential tools for DNS debugging. They query DNS servers directly, show resolution results, reveal DNS configuration issues, and help diagnose whether problems are in DNS itself or elsewhere in the network stack.

## Understanding DNS in Kubernetes

Kubernetes uses CoreDNS (or kube-dns in older clusters) to provide DNS services. Every pod gets a /etc/resolv.conf configuration pointing to the cluster DNS service. When applications lookup hostnames, queries go to CoreDNS which resolves cluster services locally and forwards external queries to upstream DNS servers.

Understanding this architecture helps you troubleshoot at the right layer.

## Basic nslookup Usage

nslookup performs simple DNS lookups:

```bash
# Query from a pod
kubectl exec -it my-pod -- nslookup kubernetes.default.svc.cluster.local

# Output shows:
# Server:    10.96.0.10
# Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local
#
# Name:      kubernetes.default.svc.cluster.local
# Address 1: 10.96.0.1 kubernetes.default.svc.cluster.local

# This confirms DNS works and shows the resolved IP
```

Successful nslookup confirms DNS resolution works end-to-end.

## Basic dig Usage

dig provides more detailed DNS information:

```bash
# Query with dig
kubectl exec -it my-pod -- dig kubernetes.default.svc.cluster.local

# Output includes:
# - Query time
# - DNS server used
# - Answer section with IP
# - Authority section
# - Additional information

# Simplified output
kubectl exec -it my-pod -- dig +short kubernetes.default.svc.cluster.local

# Returns just the IP:
# 10.96.0.1
```

dig gives you more control and detail than nslookup.

## Testing Cluster Service DNS

Verify service DNS resolution works correctly:

```bash
# Test service in same namespace
kubectl exec -it my-pod -- nslookup my-service

# Test service in different namespace
kubectl exec -it my-pod -- nslookup my-service.other-namespace

# Test fully qualified service name
kubectl exec -it my-pod -- nslookup my-service.my-namespace.svc.cluster.local

# All three should resolve to the same IP (service ClusterIP)

# Use dig for detailed information
kubectl exec -it my-pod -- dig my-service.my-namespace.svc.cluster.local +noall +answer
```

Services should always resolve using any of these formats.

## Testing External DNS Resolution

Verify external DNS works through CoreDNS:

```bash
# Query external domain
kubectl exec -it my-pod -- nslookup google.com

# Should show:
# Server:    10.96.0.10  # Cluster DNS
# Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local
#
# Name:      google.com
# Address 1: 142.250.185.46  # Google's IP

# If this fails, check CoreDNS forwarding configuration
```

External DNS failures indicate CoreDNS forwarding issues.

## Querying Specific DNS Servers

Test different DNS servers to isolate issues:

```bash
# Query cluster DNS explicitly
kubectl exec -it my-pod -- nslookup google.com 10.96.0.10

# Query external DNS directly (bypassing CoreDNS)
kubectl exec -it my-pod -- nslookup google.com 8.8.8.8

# If external DNS works but cluster DNS fails,
# CoreDNS has issues

# Use dig with specific server
kubectl exec -it my-pod -- dig @8.8.8.8 google.com
kubectl exec -it my-pod -- dig @10.96.0.10 google.com
```

This isolates whether the problem is in CoreDNS or upstream DNS.

## Checking DNS Response Times

Measure DNS query performance:

```bash
# dig shows query time
kubectl exec -it my-pod -- dig google.com | grep "Query time"

# Output:
# ;; Query time: 3 msec

# Test cluster service lookup time
kubectl exec -it my-pod -- dig my-service.my-namespace.svc.cluster.local | \
  grep "Query time"

# Should be under 10ms
# Over 100ms indicates CoreDNS performance issues
```

Slow DNS queries cause application latency.

## Inspecting DNS Configuration

Check pod DNS configuration:

```bash
# View resolv.conf
kubectl exec -it my-pod -- cat /etc/resolv.conf

# Should show:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5

# Verify nameserver matches kube-dns service IP
kubectl get svc -n kube-system kube-dns
```

Incorrect /etc/resolv.conf prevents proper DNS resolution.

## Testing DNS Search Domains

Search domains allow short service names:

```bash
# Test short name (relies on search domains)
kubectl exec -it my-pod -- nslookup my-service

# Test with namespace (shorter search path)
kubectl exec -it my-pod -- nslookup my-service.my-namespace

# Test FQDN (no search needed)
kubectl exec -it my-pod -- nslookup my-service.my-namespace.svc.cluster.local

# Use dig to see query expansion
kubectl exec -it my-pod -- dig my-service +search +noall +question

# Shows how search domains expand the query
```

Understanding search domains helps diagnose resolution failures.

## Debugging NXDOMAIN Errors

NXDOMAIN means the domain does not exist:

```bash
# If you get NXDOMAIN for a service
kubectl exec -it my-pod -- nslookup non-existent-service

# Output:
# Server:    10.96.0.10
# Address 1: 10.96.0.10
# ** server can't find non-existent-service: NXDOMAIN

# Verify the service actually exists
kubectl get svc -n my-namespace

# Check service name spelling
# Verify you're querying from the right namespace
```

NXDOMAIN confirms DNS works but the queried name does not exist.

## Checking for DNS Timeouts

Timeouts indicate CoreDNS is unreachable or overloaded:

```bash
# Query that times out
kubectl exec -it my-pod -- nslookup google.com

# May hang then fail with:
# ;; connection timed out; no servers could be reached

# Check if CoreDNS pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Test connectivity to CoreDNS
kubectl exec -it my-pod -- nc -zv 10.96.0.10 53
```

Timeouts indicate CoreDNS availability issues.

## Using dig Trace Mode

Trace DNS resolution path:

```bash
# Trace resolution from root servers
kubectl exec -it my-pod -- dig google.com +trace

# Shows:
# - Query to root servers
# - Query to TLD servers
# - Query to authoritative servers
# - Final answer

# This reveals where resolution fails
```

Trace mode is useful for debugging complex DNS hierarchies.

## Testing Different Record Types

Query specific DNS record types:

```bash
# A record (IPv4)
kubectl exec -it my-pod -- dig my-service.my-namespace.svc.cluster.local A

# AAAA record (IPv6)
kubectl exec -it my-pod -- dig my-service.my-namespace.svc.cluster.local AAAA

# SRV record (service records)
kubectl exec -it my-pod -- dig _http._tcp.my-service.my-namespace.svc.cluster.local SRV

# ANY (all records)
kubectl exec -it my-pod -- dig my-service.my-namespace.svc.cluster.local ANY
```

Different record types reveal different DNS configuration issues.

## Checking Reverse DNS

Test reverse DNS lookups:

```bash
# Reverse lookup by IP
kubectl exec -it my-pod -- nslookup 10.96.0.1

# Should resolve to kubernetes.default.svc.cluster.local

# Use dig for reverse lookup
kubectl exec -it my-pod -- dig -x 10.96.0.1

# Reverse DNS helps verify DNS configuration
```

Reverse lookups confirm DNS zone configuration.

## Testing DNS Over TCP

DNS normally uses UDP but can use TCP:

```bash
# Force TCP query
kubectl exec -it my-pod -- dig +tcp google.com

# If UDP fails but TCP works, firewall may block UDP port 53

# Test both protocols
kubectl exec -it my-pod -- dig google.com  # UDP
kubectl exec -it my-pod -- dig +tcp google.com  # TCP
```

Protocol-specific failures indicate firewall or NetworkPolicy issues.

## Debugging CoreDNS Forwarding

Check if CoreDNS forwards correctly:

```bash
# Query external domain through CoreDNS
kubectl exec -it my-pod -- dig @10.96.0.10 google.com

# Check CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# Look for forward directive:
# forward . /etc/resolv.conf

# Verify CoreDNS can reach upstream DNS
kubectl exec -n kube-system coredns-xxx -- nslookup google.com
```

Forwarding issues prevent external DNS resolution.

## Testing DNS with Different TTLs

Observe DNS caching behavior:

```bash
# Query and note TTL
kubectl exec -it my-pod -- dig google.com | grep -A2 "ANSWER SECTION"

# Output shows TTL:
# google.com.  299  IN  A  142.250.185.46

# Query again immediately
kubectl exec -it my-pod -- dig google.com | grep -A2 "ANSWER SECTION"

# TTL should decrease if cached
# google.com.  287  IN  A  142.250.185.46
```

TTL behavior helps debug caching issues.

## Comparing nslookup and dig

Know when to use each tool:

```bash
# nslookup: Simple, human-readable, good for quick checks
kubectl exec -it my-pod -- nslookup my-service

# dig: Detailed, scriptable, better for troubleshooting
kubectl exec -it my-pod -- dig my-service +short

# dig advantages:
# - Shows query time
# - Supports more record types
# - Better control over query options
# - More detailed output
```

Use nslookup for quick checks, dig for detailed troubleshooting.

## Scripting DNS Tests

Automate DNS testing:

```bash
#!/bin/bash
# dns-test.sh

SERVICES="kubernetes.default my-service.my-namespace google.com"

for svc in $SERVICES; do
  echo "Testing $svc:"

  # Test with nslookup
  if kubectl exec my-pod -- nslookup $svc > /dev/null 2>&1; then
    echo "  nslookup: OK"
  else
    echo "  nslookup: FAILED"
  fi

  # Test with dig and measure time
  TIME=$(kubectl exec my-pod -- dig $svc | grep "Query time" | awk '{print $4}')
  echo "  dig query time: ${TIME}ms"

  echo
done
```

Automated testing catches DNS issues early.

## Debugging Pod-Specific DNS Issues

Some pods might have DNS issues while others do not:

```bash
# Compare /etc/resolv.conf across pods
kubectl exec pod-a -- cat /etc/resolv.conf
kubectl exec pod-b -- cat /etc/resolv.conf

# Should be identical for pods in same namespace
# Differences indicate pod-specific issues

# Check dnsPolicy in pod spec
kubectl get pod pod-a -o yaml | grep dnsPolicy

# Default is ClusterFirst
# Other options: Default, None, ClusterFirstWithHostNet
```

Pod-specific DNS policy affects resolution behavior.

## Testing StatefulSet DNS

StatefulSets have unique DNS requirements:

```bash
# StatefulSet pod DNS format:
# pod-name.service-name.namespace.svc.cluster.local

# Test StatefulSet pod DNS
kubectl exec -it other-pod -- nslookup my-statefulset-0.my-service.my-namespace.svc.cluster.local

# Should resolve to specific pod's IP
# Use dig to verify
kubectl exec -it other-pod -- dig my-statefulset-0.my-service.my-namespace.svc.cluster.local +short
```

StatefulSet DNS resolution confirms headless service configuration.

## Debugging Custom DNS Configuration

Some pods use custom DNS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 8.8.8.8
    searches:
    - my-namespace.svc.cluster.local
    options:
    - name: ndots
      value: "2"
  containers:
  - name: app
    image: nginx
```

Test custom DNS configuration:

```bash
# Check custom resolv.conf
kubectl exec custom-dns -- cat /etc/resolv.conf

# Test resolution with custom config
kubectl exec custom-dns -- nslookup google.com
kubectl exec custom-dns -- nslookup my-service
```

Custom DNS requires careful configuration to work correctly.

## Conclusion

nslookup and dig are essential tools for DNS debugging in Kubernetes. nslookup provides quick, simple checks while dig offers detailed information and advanced query options. Use nslookup for initial testing and dig for in-depth troubleshooting.

Systematic DNS debugging checks basic resolution, tests cluster and external DNS, queries specific DNS servers, measures query performance, and verifies DNS configuration. Understanding how Kubernetes DNS works, including search domains, the role of CoreDNS, and upstream DNS forwarding, helps you diagnose issues quickly.

Most DNS problems stem from CoreDNS issues, misconfigured /etc/resolv.conf, NetworkPolicies blocking DNS traffic, or upstream DNS failures. Use nslookup and dig to isolate which layer has the problem, then apply the appropriate fix. Master these tools, and you will solve DNS issues efficiently in your Kubernetes clusters.
