# How to Troubleshoot DNS Resolution Failures for IPv4 in Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, CoreDNS, IPv4, Troubleshooting, Networking

Description: Diagnose and fix DNS resolution failures in Kubernetes pods where service names or external hostnames fail to resolve to IPv4 addresses.

DNS failures in pods are a common issue that often presents as application connectivity errors. Systematic debugging from the pod outward reveals whether the issue is in the pod, CoreDNS, or network connectivity.

## Step 1: Test DNS from Inside the Pod

```bash
# Deploy a debug pod with DNS tools

kubectl run dnstest --image=alpine --restart=Never -- sleep 3600

# Test basic Kubernetes service resolution
kubectl exec dnstest -- nslookup kubernetes.default.svc.cluster.local
# Expected:
# Server: 10.96.0.10
# Address: 10.96.0.10:53
# Non-authoritative answer:
# Name: kubernetes.default.svc.cluster.local
# Address: 10.96.0.1

# Test external DNS
kubectl exec dnstest -- nslookup google.com
```

## Step 2: Check the Pod's DNS Configuration

```bash
# View the pod's resolv.conf
kubectl exec dnstest -- cat /etc/resolv.conf
# Expected:
# nameserver 10.96.0.10       ← CoreDNS ClusterIP
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5

# If nameserver is wrong (e.g., 8.8.8.8), DNS policy may be set wrong
kubectl get pod dnstest -o jsonpath='{.spec.dnsPolicy}'
# Should be "ClusterFirst" for normal pods
```

## Step 3: Verify CoreDNS is Running

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns
# All should be Running and Ready

# Check CoreDNS service IP matches nameserver in resolv.conf
kubectl get svc kube-dns -n kube-system
# CLUSTER-IP should be 10.96.0.10 (or whatever's in resolv.conf)

# View CoreDNS logs for NXDOMAIN or error patterns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
# Look for: NXDOMAIN, SERVFAIL, no such host
```

## Step 4: Test Direct Connectivity to CoreDNS

```bash
# From the debug pod, query CoreDNS directly
kubectl exec dnstest -- nslookup kubernetes.default.svc.cluster.local 10.96.0.10

# If this works but automatic DNS doesn't, check /etc/resolv.conf
# If this also fails, CoreDNS is unreachable
```

## Step 5: Check Network Connectivity to CoreDNS

```bash
# Check that the CoreDNS service exposes DNS ports
kubectl get svc kube-dns -n kube-system
# PORT(S) should include 53/UDP and 53/TCP

# If direct nslookup to CoreDNS times out: NetworkPolicy may be blocking DNS traffic

# Check NetworkPolicies blocking DNS
kubectl get networkpolicy --all-namespaces
# Look for policies that might block egress to CoreDNS on UDP or TCP port 53
```

## Step 6: DNS Timeout Issues (ndots Problem)

The `ndots:5` setting causes slow resolution for external names:

```bash
# With ndots:5, "google.com" has fewer than 5 dots, so the resolver tries the configured search domains before the bare name
# This can slow DNS for external hosts

# Fix: add a dot suffix to skip search domains
kubectl exec dnstest -- nslookup google.com.  # trailing dot skips search domains
```

For persistent fix, set a custom DNS config in your pod:

```yaml
# pod with tuned DNS config
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    options:
    - name: ndots
      value: "2"  # Reduce from 5 to 2 for faster external resolution
    - name: timeout
      value: "5"
    - name: attempts
      value: "3"
```

## Common Issues and Fixes

| Symptom | Cause | Fix |
|---|---|---|
| `nslookup: can't resolve` | Wrong nameserver | Check `/etc/resolv.conf` |
| Slow DNS lookups | High `ndots` value | Set `ndots: 2` |
| DNS works for services, not external | Forward rule missing | Add upstream in CoreDNS |
| Intermittent DNS failures | CoreDNS CPU throttling | Increase CoreDNS resources |
| All DNS fails | NetworkPolicy blocking port 53 | Add egress rule for DNS on UDP and TCP port 53 |

## Restart CoreDNS

```bash
kubectl rollout restart deployment/coredns -n kube-system
kubectl rollout status deployment/coredns -n kube-system
```

The most common DNS issues are `ndots`-related slowness and NetworkPolicies blocking egress to CoreDNS on UDP or TCP port 53.
