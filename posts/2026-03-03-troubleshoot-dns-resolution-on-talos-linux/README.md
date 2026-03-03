# How to Troubleshoot DNS Resolution on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Troubleshooting, CoreDNS, Kubernetes, Debugging

Description: A practical troubleshooting guide for diagnosing and fixing DNS resolution problems on Talos Linux Kubernetes clusters.

---

DNS issues are among the most common problems in Kubernetes clusters, and Talos Linux is no exception. When DNS breaks, almost everything breaks with it. Services cannot find each other, pods cannot pull images from registries, and your applications start throwing connection errors everywhere. The good news is that DNS problems on Talos Linux follow predictable patterns, and with a systematic approach, you can diagnose and fix them quickly.

## The DNS Resolution Chain

Before troubleshooting, understand how DNS resolution flows in a Talos Linux cluster:

1. A pod makes a DNS query (e.g., `my-service.default.svc.cluster.local`)
2. The query goes to the pod's configured DNS server (usually CoreDNS at 10.96.0.10)
3. CoreDNS checks if it matches a Kubernetes service
4. If not, CoreDNS forwards the query to upstream DNS servers
5. The upstream server resolves the name and returns the answer

A failure at any step in this chain causes DNS problems.

## Step 1: Identify Where the Problem Is

Start by figuring out whether the issue is with cluster DNS, external DNS, or the pod's DNS configuration:

```bash
# Test cluster DNS (service resolution)
kubectl run dns-test --rm -it --restart=Never --image=busybox:1.36 -- \
    nslookup kubernetes.default.svc.cluster.local

# Test external DNS
kubectl run dns-test --rm -it --restart=Never --image=busybox:1.36 -- \
    nslookup google.com

# Test with a specific DNS server (bypass pod DNS config)
kubectl run dns-test --rm -it --restart=Never --image=busybox:1.36 -- \
    nslookup google.com 8.8.8.8
```

These three tests tell you:
- If cluster DNS fails but external works: CoreDNS kubernetes plugin issue
- If external DNS fails but cluster works: upstream forwarder issue
- If both fail: CoreDNS itself is down or unreachable
- If direct 8.8.8.8 query works but others fail: network policy or pod DNS config issue

## Step 2: Check CoreDNS Health

Make sure CoreDNS pods are running and healthy:

```bash
# Check CoreDNS pod status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Check if the CoreDNS service has endpoints
kubectl get endpoints kube-dns -n kube-system

# Check CoreDNS resource usage
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

Common issues you might find:
- Pods in CrashLoopBackOff: usually a configuration error
- Pods running but no endpoints: service selector mismatch
- High CPU/memory usage: too many queries or a loop condition

## Step 3: Verify Pod DNS Configuration

Check what DNS configuration a pod is actually using:

```bash
# Look at resolv.conf inside a pod
kubectl run dns-debug --rm -it --restart=Never --image=busybox:1.36 -- \
    cat /etc/resolv.conf

# Expected output for default dnsPolicy:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

The `ndots:5` setting means that any name with fewer than 5 dots will be tried with each search domain appended before querying it as an absolute name. This is important for understanding query amplification.

```bash
# A query for "google.com" (1 dot, less than 5) will first try:
# google.com.default.svc.cluster.local
# google.com.svc.cluster.local
# google.com.cluster.local
# google.com              <- finally the actual query

# A query for "my-service.default.svc.cluster.local" (4 dots, less than 5) follows the same pattern
```

If ndots is causing excessive queries and slowdowns, you can reduce it per pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  dnsConfig:
    options:
    - name: ndots
      value: "2"
  containers:
  - name: app
    image: my-app:latest
```

## Step 4: Test DNS from the Node Level

Talos Linux does not have SSH, so you use `talosctl` to diagnose node-level DNS:

```bash
# Check the node's resolv.conf
talosctl read /etc/resolv.conf --nodes 10.0.0.10

# Test DNS resolution from the node
talosctl dns resolve google.com --nodes 10.0.0.10

# Check if CoreDNS pods are reachable from the node
talosctl netstat --nodes 10.0.0.10 | grep 53
```

## Step 5: Check for Network Policy Issues

Network policies can silently block DNS traffic. CoreDNS runs on port 53 (both TCP and UDP), and pods need to reach it:

```bash
# List network policies in all namespaces
kubectl get networkpolicies --all-namespaces

# Check if any policy could block DNS
kubectl get networkpolicies -n kube-system -o yaml

# Check if there is a default-deny policy in the pod's namespace
kubectl get networkpolicies -n default -o yaml
```

If you have a default-deny network policy, you need to allow DNS traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Step 6: Diagnose Loop Detection Issues

CoreDNS has a `loop` plugin that detects and stops forwarding loops. If you see this in the logs:

```text
Loop (127.0.0.1:43051 -> :53) detected for zone ".", see https://coredns.io/plugins/loop
```

This usually means CoreDNS is forwarding to itself. On Talos Linux, this can happen when the node's `/etc/resolv.conf` points to the CoreDNS service IP. Fix it by using explicit upstream forwarders instead of `/etc/resolv.conf`:

```text
# Instead of this:
forward . /etc/resolv.conf

# Use explicit servers:
forward . 8.8.8.8 1.1.1.1
```

Or fix the Talos machine configuration to use proper nameservers:

```yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

## Step 7: Check for SERVFAIL Responses

Use `dig` for more detailed debugging than `nslookup`:

```bash
kubectl run dns-debug --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1

    echo "=== Query with full details ==="
    dig my-service.default.svc.cluster.local @10.96.0.10

    echo ""
    echo "=== Query external domain ==="
    dig google.com @10.96.0.10

    echo ""
    echo "=== Query with TCP (if UDP is blocked) ==="
    dig +tcp google.com @10.96.0.10

    echo ""
    echo "=== Check response time ==="
    dig google.com @10.96.0.10 | grep "Query time"
'
```

Look at the response status:
- NOERROR: Query succeeded
- NXDOMAIN: Domain does not exist (but DNS is working)
- SERVFAIL: DNS server could not process the query
- REFUSED: DNS server refused the query

## Step 8: Monitor CoreDNS Metrics

CoreDNS exposes Prometheus metrics that can reveal patterns:

```bash
# Port-forward to CoreDNS metrics
kubectl port-forward -n kube-system svc/kube-dns 9153:9153 &

# Check key metrics
curl -s localhost:9153/metrics | grep coredns_dns_requests_total
curl -s localhost:9153/metrics | grep coredns_dns_responses_total
curl -s localhost:9153/metrics | grep coredns_forward_request_duration_seconds
curl -s localhost:9153/metrics | grep coredns_panics_total
```

High latency in `coredns_forward_request_duration_seconds` points to slow upstream servers. High counts in responses with rcode=SERVFAIL indicate upstream issues.

## Step 9: Restart CoreDNS

Sometimes the simplest fix is a restart. This is safe because CoreDNS is stateless:

```bash
# Rolling restart of CoreDNS
kubectl rollout restart deployment coredns -n kube-system

# Watch the rollout
kubectl rollout status deployment coredns -n kube-system
```

## Common Problems and Quick Fixes

Here is a reference table for the most common DNS issues:

```bash
# Problem: Pods cannot resolve external domains
# Fix: Check upstream forwarders in CoreDNS config
kubectl get configmap coredns -n kube-system -o yaml | grep forward

# Problem: Pods cannot resolve cluster services
# Fix: Check CoreDNS is running and has endpoints
kubectl get endpoints kube-dns -n kube-system

# Problem: DNS is slow (queries take seconds)
# Fix: Reduce ndots or add nodelocaldns cache
# Also check if upstream DNS servers are reachable

# Problem: Intermittent DNS failures
# Fix: Often caused by conntrack table exhaustion on UDP
# Check with:
talosctl dmesg --nodes 10.0.0.10 | grep conntrack

# Problem: DNS works for some pods but not others
# Fix: Check network policies and pod dnsPolicy settings
kubectl get pod problematic-pod -o yaml | grep -A5 dnsPolicy
```

## Wrapping Up

DNS troubleshooting on Talos Linux follows a systematic approach: verify CoreDNS health, check pod DNS configuration, test at both the pod and node level, look for network policy interference, and monitor metrics for ongoing issues. Most DNS problems fall into a few categories: CoreDNS misconfiguration, network policy blocks, upstream server issues, or the ndots search amplification problem. With the techniques in this guide, you should be able to identify and resolve most DNS issues in minutes rather than hours.
