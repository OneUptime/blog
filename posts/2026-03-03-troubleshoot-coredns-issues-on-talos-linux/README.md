# How to Troubleshoot CoreDNS Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CoreDNS, DNS, Kubernetes, Troubleshooting

Description: Detailed guide to troubleshooting CoreDNS problems on Talos Linux clusters, from pod crashes to resolution failures and performance tuning.

---

CoreDNS is the DNS server that handles all name resolution within a Kubernetes cluster. On Talos Linux, CoreDNS is deployed as part of the default cluster bootstrap and is critical for service discovery. When CoreDNS has problems, pods cannot find services by name, external DNS resolution fails, and many applications break in subtle ways. This guide walks through common CoreDNS issues on Talos Linux and how to fix them.

## How CoreDNS Works in Talos Linux

CoreDNS runs as a Deployment in the `kube-system` namespace, typically with two replicas. It serves DNS queries on port 53 and is exposed through a ClusterIP service called `kube-dns`. Every pod on the cluster has its `/etc/resolv.conf` configured to point to this service IP.

The kubelet on each node tells pods which DNS server to use. This is configured in the Talos machine configuration:

```yaml
machine:
  kubelet:
    clusterDNS:
      - 10.96.0.10  # Must match the kube-dns service ClusterIP
```

## Checking CoreDNS Status

Start with the basics:

```bash
# Check CoreDNS pod status
kubectl -n kube-system get pods -l k8s-app=kube-dns

# Check the CoreDNS service
kubectl -n kube-system get svc kube-dns

# Check CoreDNS endpoints
kubectl -n kube-system get endpoints kube-dns
```

If the pods are not Running, or the endpoints list is empty, CoreDNS is not functional.

## Issue: CoreDNS Pods in CrashLoopBackOff

If CoreDNS keeps crashing, check the logs:

```bash
# View logs from a crashing CoreDNS pod
kubectl -n kube-system logs -l k8s-app=kube-dns --previous

# If there are multiple pods, check each one
kubectl -n kube-system logs <coredns-pod-name> --previous
```

Common reasons for CoreDNS crashes:

**Corefile syntax error:**

```bash
# View the CoreDNS ConfigMap
kubectl -n kube-system get configmap coredns -o yaml
```

If you edited the Corefile and introduced a syntax error, CoreDNS will crash on startup. Fix the ConfigMap:

```bash
# Edit the CoreDNS ConfigMap
kubectl -n kube-system edit configmap coredns
```

The default Corefile should look like this:

```text
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

**Loop detection:**

The `loop` plugin detects forwarding loops and will cause CoreDNS to crash with a message like:

```text
[FATAL] plugin/loop: Loop detected for zone "."
```

This happens when CoreDNS forwards queries to itself. The most common cause is that the node's `/etc/resolv.conf` points to 127.0.0.1 or to the kube-dns service IP. On Talos Linux, this is usually because the host DNS resolver is pointing to localhost.

Fix by configuring CoreDNS to use specific upstream servers instead of `/etc/resolv.conf`:

```bash
# Edit the CoreDNS ConfigMap
kubectl -n kube-system edit configmap coredns
```

Change the `forward` line:

```text
forward . 8.8.8.8 8.8.4.4 {
    max_concurrent 1000
}
```

## Issue: CoreDNS Pods Stuck in Pending

If CoreDNS pods are Pending, they cannot be scheduled:

```bash
# Check why pods are pending
kubectl -n kube-system describe pod -l k8s-app=kube-dns
```

On Talos Linux, this usually happens because:

1. All nodes are control plane nodes with taints, and CoreDNS does not have tolerations (unlikely with default Talos setup, as CoreDNS is configured with proper tolerations)
2. There are not enough resources on any node
3. A PodDisruptionBudget is preventing scheduling

Check node resources:

```bash
# Check available resources
kubectl describe nodes | grep -A 10 "Allocated resources"
```

## Issue: DNS Resolution Fails for External Names

If internal service resolution works but external names (like `google.com`) fail:

```bash
# Test from a debug pod
kubectl run dnstest --image=busybox --restart=Never -- sleep 3600
kubectl exec dnstest -- nslookup kubernetes.default  # Should work
kubectl exec dnstest -- nslookup google.com           # Fails
```

This means CoreDNS cannot reach its upstream DNS servers. Check what upstream servers are configured:

```bash
# Check the upstream resolvers
kubectl -n kube-system exec <coredns-pod> -- cat /etc/resolv.conf
```

If the resolvers are wrong, fix the host DNS configuration in the Talos machine config:

```yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

Or override the upstream servers directly in the CoreDNS ConfigMap as shown above.

## Issue: DNS Resolution Fails for Internal Services

If external resolution works but you cannot resolve Kubernetes service names:

```bash
# Test internal resolution
kubectl exec dnstest -- nslookup myservice.mynamespace.svc.cluster.local
```

Check if the service exists and has endpoints:

```bash
# Verify the service exists
kubectl get svc myservice -n mynamespace

# Check endpoints
kubectl get endpoints myservice -n mynamespace
```

If the service exists but DNS fails, check the CoreDNS Kubernetes plugin configuration:

```bash
# The kubernetes plugin in the Corefile should match your cluster domain
# kubernetes cluster.local in-addr.arpa ip6.arpa {
```

Make sure `cluster.local` matches the cluster domain in your Talos configuration:

```yaml
cluster:
  clusterName: my-cluster
  network:
    dnsDomain: cluster.local
```

## Issue: Slow DNS Resolution

Slow DNS can make applications feel sluggish. Common causes on Talos Linux:

**ndots setting too high:**

By default, Kubernetes sets `ndots:5` in pod resolv.conf. This means any name with fewer than 5 dots gets the search domains appended first. A query for `api.example.com` (2 dots) will try `api.example.com.default.svc.cluster.local`, `api.example.com.svc.cluster.local`, `api.example.com.cluster.local` before trying `api.example.com` directly.

Fix per pod:

```yaml
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"
```

**CoreDNS resource starvation:**

If CoreDNS does not have enough CPU, queries will queue up:

```bash
# Check CoreDNS resource usage
kubectl -n kube-system top pods -l k8s-app=kube-dns
```

Increase CoreDNS resources if needed by editing the deployment:

```bash
kubectl -n kube-system edit deployment coredns
```

**Not enough CoreDNS replicas:**

For larger clusters, two replicas may not be enough:

```bash
# Scale CoreDNS
kubectl -n kube-system scale deployment coredns --replicas=4
```

## Issue: kube-dns Service IP Mismatch

The kubelet tells each pod which DNS server to use via the `clusterDNS` setting. If this does not match the actual `kube-dns` service ClusterIP, DNS will completely fail:

```bash
# Check the configured clusterDNS
talosctl -n <node-ip> get machineconfiguration -o yaml | grep -A2 clusterDNS

# Check the actual service IP
kubectl -n kube-system get svc kube-dns
```

If these do not match, update the Talos machine configuration:

```yaml
machine:
  kubelet:
    clusterDNS:
      - 10.96.0.10  # Match this to the kube-dns service ClusterIP
```

## Issue: CoreDNS After Talos Upgrade

After upgrading Talos, CoreDNS might need to be restarted or its configuration might need adjustment:

```bash
# Restart CoreDNS after a Talos upgrade
kubectl -n kube-system rollout restart deployment coredns

# Verify it is running correctly
kubectl -n kube-system get pods -l k8s-app=kube-dns -w
```

## Monitoring CoreDNS

CoreDNS exposes Prometheus metrics on port 9153. Set up monitoring to catch issues early:

```bash
# Check CoreDNS metrics directly
kubectl -n kube-system port-forward svc/kube-dns 9153:9153
curl http://localhost:9153/metrics
```

Key metrics to watch:

- `coredns_dns_requests_total` - Total query count
- `coredns_dns_responses_total` - Response count by rcode (watch for SERVFAIL)
- `coredns_forward_requests_total` - Upstream forwarding count
- `coredns_cache_hits_total` - Cache hit ratio

## Summary

CoreDNS issues on Talos Linux most commonly stem from incorrect upstream resolver configuration, Corefile syntax errors, or mismatched service IPs. Always check CoreDNS pod logs first, verify the Corefile configuration, and test DNS from inside a pod to isolate whether the issue is internal resolution, external resolution, or both. Keep the CoreDNS deployment properly resourced and consider increasing replicas for larger clusters.
