# How to Debug DNS Resolution Issues in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Troubleshooting, Kubernetes, CoreDNS, Networking

Description: Practical debugging techniques for diagnosing and resolving DNS resolution failures in Talos Linux at both the host level and within Kubernetes pods.

---

DNS problems are probably the most common source of frustration in any Kubernetes cluster, and Talos Linux is no exception. When DNS breaks, everything breaks - pods cannot pull images, services cannot find each other, and even basic health checks fail. The challenge with Talos Linux is that you cannot just SSH in and run dig or nslookup directly on the host. You need to use talosctl and understand the DNS resolution chain to effectively debug issues.

This guide walks through a systematic approach to debugging DNS resolution issues in Talos Linux.

## Understanding the DNS Resolution Chain

Before you can fix DNS issues, you need to understand how DNS queries flow through a Talos Linux cluster. There are two distinct resolution paths:

**Host-level DNS (for system services):**
1. System process makes a DNS query
2. Query goes to the Talos host DNS proxy (127.0.0.53 or link-local address)
3. Host DNS proxy forwards to configured upstream resolvers
4. Response returns to the process

**Pod-level DNS (for Kubernetes workloads):**
1. Pod makes a DNS query
2. Query goes to CoreDNS (typically at 10.96.0.10)
3. For cluster-local names, CoreDNS resolves directly
4. For external names, CoreDNS forwards to upstream resolvers
5. Response returns to the pod

Problems can occur at any point in these chains, so the first step is always figuring out where in the chain the failure is happening.

## Step 1: Determine the Scope of the Problem

Start by figuring out whether the DNS issue is cluster-wide, node-specific, or pod-specific:

```bash
# Test DNS from the host level on multiple nodes
talosctl -n 192.168.1.10 read /etc/resolv.conf
talosctl -n 192.168.1.11 read /etc/resolv.conf
talosctl -n 192.168.1.12 read /etc/resolv.conf

# Test DNS from within a pod
kubectl run dns-test --rm -it --image=busybox:1.36 --restart=Never -- nslookup google.com

# Test cluster-internal DNS
kubectl run dns-test --rm -it --image=busybox:1.36 --restart=Never -- nslookup kubernetes.default.svc.cluster.local
```

This tells you:
- If host DNS is failing on all nodes: upstream resolver problem
- If host DNS fails on one node: that node's DNS config or network issue
- If pod DNS fails but host DNS works: CoreDNS problem
- If only cluster-internal DNS fails: CoreDNS or service configuration issue

## Step 2: Check Host-Level DNS Configuration

```bash
# Check what resolvers are configured
talosctl -n <node-ip> get resolvers
# Expected output: list of DNS server IPs

# Check the generated resolv.conf
talosctl -n <node-ip> read /etc/resolv.conf
# Should show nameserver entries matching your configuration

# Check if host DNS service is running
talosctl -n <node-ip> services | grep dns

# Look at host DNS logs for errors
talosctl -n <node-ip> logs dns-resolve-cache
```

If the resolvers list is empty or contains unreachable IPs, update your machine configuration:

```yaml
# Fix DNS resolver configuration
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

## Step 3: Test Upstream Resolver Connectivity

Just because a DNS server is configured does not mean the node can reach it:

```bash
# Capture DNS traffic to see if queries are going out
talosctl -n <node-ip> pcap --interface eth0 --bpf-filter "port 53" --duration 10s -o dns-debug.pcap

# Check the capture locally
tcpdump -r dns-debug.pcap -nn

# Check network connectivity to DNS servers
talosctl -n <node-ip> netstat | grep ":53"
```

If DNS packets are leaving the node but no responses are coming back, the problem is somewhere between your node and the DNS server. This could be a firewall rule, a routing issue, or the DNS server itself being down.

## Step 4: Debug CoreDNS Issues

If host DNS works but pod DNS does not, focus on CoreDNS:

```bash
# Check CoreDNS pod status
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide

# Look at CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100

# Check the CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml

# Verify the CoreDNS service has endpoints
kubectl get endpoints kube-dns -n kube-system
```

Common CoreDNS issues and their symptoms:

**CoreDNS pods in CrashLoopBackOff:**
```bash
# Check why CoreDNS is crashing
kubectl describe pod -n kube-system -l k8s-app=kube-dns

# Look at the events
kubectl get events -n kube-system --field-selector reason=BackOff
```

**CoreDNS running but not responding:**
```bash
# Check CoreDNS readiness
kubectl get pods -n kube-system -l k8s-app=kube-dns -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}'

# Check if CoreDNS can reach upstream resolvers
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=kube-dns -o name | head -1) -- cat /etc/resolv.conf
```

## Step 5: Check Pod DNS Configuration

Each pod gets a /etc/resolv.conf that tells it where to send DNS queries:

```bash
# Check a pod's DNS configuration
kubectl exec <pod-name> -- cat /etc/resolv.conf

# Expected output for a pod using ClusterFirst DNS policy:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

The `ndots:5` setting is important. It means any hostname with fewer than 5 dots will have the search domains appended before trying the original name. So a query for `api.example.com` (2 dots, less than 5) will first try:
- `api.example.com.default.svc.cluster.local`
- `api.example.com.svc.cluster.local`
- `api.example.com.cluster.local`
- `api.example.com`

This can cause slow resolution for external domains. If this is a performance problem, you can either reduce ndots or use fully qualified domain names (with a trailing dot):

```yaml
# Pod spec with custom DNS config
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"
```

## Step 6: Investigate DNS Timeout Issues

DNS timeouts are often more frustrating than outright failures because they are intermittent:

```bash
# Check for conntrack table overflow (can cause DNS packet drops)
talosctl -n <node-ip> dmesg | grep conntrack

# Increase conntrack table size if needed
```

```yaml
# Increase conntrack limits in machine config
machine:
  sysctls:
    net.netfilter.nf_conntrack_max: "131072"
```

Another common cause of DNS timeouts in Kubernetes is the race condition between IPv4 and IPv6 DNS queries. If your cluster does not support IPv6 but the resolver tries IPv6 first, you will see intermittent 5-second delays:

```yaml
# Fix DNS timeout from A/AAAA race condition
spec:
  dnsConfig:
    options:
      - name: single-request-reopen
        value: ""
```

## Step 7: Debug Specific Resolution Failures

If only certain domains fail to resolve, the problem might be domain-specific:

```bash
# Test resolution of different domain types from a debug pod
kubectl run dns-debug --rm -it --image=nicolaka/netshoot --restart=Never -- bash

# Inside the debug pod:
# Test external domain
nslookup google.com

# Test cluster service
nslookup kubernetes.default.svc.cluster.local

# Test cross-namespace service
nslookup my-service.other-namespace.svc.cluster.local

# Test with specific DNS server
nslookup google.com 10.96.0.10    # CoreDNS
nslookup google.com 8.8.8.8        # Google DNS directly

# Check for NXDOMAIN vs timeout
dig +short +timeout=5 problematic-domain.com
```

## Step 8: Monitor DNS Performance

Set up ongoing DNS monitoring to catch issues before they become outages:

```bash
# Check CoreDNS metrics
kubectl port-forward -n kube-system svc/kube-dns-metrics 9153:9153

# Query Prometheus metrics
curl localhost:9153/metrics | grep coredns_dns_requests_total
curl localhost:9153/metrics | grep coredns_dns_responses_total
curl localhost:9153/metrics | grep coredns_forward_requests_total
```

Key metrics to watch:

- `coredns_dns_requests_total`: Total DNS queries received
- `coredns_dns_responses_total` with `rcode="SERVFAIL"`: Server failures
- `coredns_forward_healthcheck_failures_total`: Upstream resolver health issues
- `coredns_dns_request_duration_seconds`: Query latency

## Step 9: Common Fixes

### CoreDNS Cannot Reach Upstream Resolvers

```bash
# Check if CoreDNS pods can reach the internet
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=kube-dns -o name | head -1) -- wget -O- --timeout=5 http://1.1.1.1 2>&1 | head -5
```

If CoreDNS cannot reach upstream resolvers, check:
- Network policies blocking egress from kube-system namespace
- Node firewall rules blocking outbound DNS (UDP/TCP 53)
- Routing issues preventing pods from reaching external networks

### DNS Works But Is Extremely Slow

```yaml
# Scale up CoreDNS for better performance
kubectl scale deployment coredns -n kube-system --replicas=4

# Enable CoreDNS caching with longer TTL
# Edit the CoreDNS ConfigMap
cache 300 {
    success 9984
    denial 9984
}
```

### Intermittent SERVFAIL Responses

```bash
# Check if upstream resolvers are healthy
kubectl logs -n kube-system -l k8s-app=kube-dns | grep -i "servfail\|error\|timeout"

# Consider adding multiple upstream resolvers in CoreDNS
```

## Conclusion

Debugging DNS in Talos Linux comes down to systematically walking through the resolution chain - from pod to CoreDNS to host DNS proxy to upstream resolvers - and figuring out where the breakdown is happening. Use talosctl for host-level diagnostics, kubectl for CoreDNS and pod-level issues, and packet captures when you need to see exactly what is happening on the wire. Most DNS issues in Talos Linux fall into one of three categories: misconfigured upstream resolvers, CoreDNS problems, or network connectivity issues preventing DNS traffic from flowing. Work through them methodically and you will find the root cause.
