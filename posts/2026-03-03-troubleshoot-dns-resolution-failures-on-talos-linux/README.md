# How to Troubleshoot DNS Resolution Failures on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, CoreDNS, Kubernetes, Troubleshooting, Networking

Description: Comprehensive guide to fixing DNS resolution failures on Talos Linux at both the host level and within Kubernetes pods using CoreDNS.

---

DNS resolution failures on Talos Linux can affect both the host system and workloads running inside the cluster. When DNS is broken, container images cannot be pulled, pods cannot reach external services, and internal service discovery stops working. This guide walks through troubleshooting DNS at every level in a Talos Linux cluster.

## Two Levels of DNS

It is important to understand that DNS operates at two levels in a Talos Linux Kubernetes cluster:

1. **Host-level DNS** - Used by the Talos system itself for pulling images, reaching the API server by hostname, and NTP resolution
2. **Cluster DNS (CoreDNS)** - Used by pods for service discovery and external name resolution

Problems at either level have different symptoms and different fixes.

## Troubleshooting Host-Level DNS

If the Talos node itself cannot resolve DNS names, you will see failures in image pulls and system operations. Check the host DNS configuration:

```bash
# Check configured nameservers
talosctl -n <node-ip> get resolvers

# Check the host DNS configuration
talosctl -n <node-ip> get hostdnsconfig
```

If the resolvers are empty or point to unreachable servers, update the machine configuration:

```yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

Apply the updated configuration:

```bash
# Apply the DNS configuration change
talosctl apply-config -n <node-ip> --file machine-config.yaml
```

## Verifying Host DNS Works

Since Talos does not have `dig` or `nslookup`, you need alternative methods to test host DNS:

```bash
# Check if the node can resolve container registry names
# by looking at image pull status
talosctl -n <node-ip> containers

# Check system logs for DNS-related errors
talosctl -n <node-ip> dmesg | grep -i dns
```

You can also test indirectly by seeing if containers can be pulled:

```bash
# If images pull successfully, host DNS is working
talosctl -n <node-ip> images
```

## Troubleshooting CoreDNS

CoreDNS handles all in-cluster DNS resolution. Check if CoreDNS is running:

```bash
# Check CoreDNS pod status
kubectl -n kube-system get pods -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=100
```

Common CoreDNS issues include:

- CoreDNS pods in CrashLoopBackOff
- CoreDNS pods stuck in Pending
- CoreDNS running but not resolving queries

## Testing DNS from Inside a Pod

The best way to test cluster DNS is from inside a pod:

```bash
# Deploy a DNS debug pod
kubectl run dnstest --image=busybox:latest --restart=Never -- sleep 3600

# Test internal service resolution
kubectl exec dnstest -- nslookup kubernetes.default.svc.cluster.local

# Test external resolution
kubectl exec dnstest -- nslookup google.com
```

If internal resolution works but external does not, CoreDNS may not be able to reach the upstream DNS servers. If neither works, CoreDNS itself may be unreachable.

## CoreDNS Not Starting

If CoreDNS pods are stuck in Pending, check for scheduling issues:

```bash
# Describe the pod to see why it is pending
kubectl -n kube-system describe pod -l k8s-app=kube-dns

# Check for resource constraints
kubectl describe nodes | grep -A 5 "Allocated resources"
```

If CoreDNS is in CrashLoopBackOff, the logs will show why:

```bash
# Get logs from the crashing CoreDNS pod
kubectl -n kube-system logs -l k8s-app=kube-dns --previous
```

A common cause is a misconfigured Corefile. Check the CoreDNS ConfigMap:

```bash
# View the CoreDNS configuration
kubectl -n kube-system get configmap coredns -o yaml
```

The default Corefile should look something like:

```
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

## CoreDNS Cannot Reach Upstream Servers

If pods can resolve internal names (like `kubernetes.default`) but not external names (like `google.com`), CoreDNS cannot reach its upstream DNS servers:

```bash
# Check what upstream servers CoreDNS is using
kubectl -n kube-system exec -it <coredns-pod> -- cat /etc/resolv.conf
```

The resolv.conf inside the CoreDNS pod comes from the host. If the host DNS is wrong, CoreDNS will also be wrong. Fix the host DNS configuration first.

You can also configure CoreDNS to use specific upstream servers by editing the ConfigMap:

```bash
# Edit the CoreDNS ConfigMap
kubectl -n kube-system edit configmap coredns
```

Change the `forward` directive to point to specific servers:

```
forward . 8.8.8.8 8.8.4.4 {
    max_concurrent 1000
}
```

After editing, restart CoreDNS:

```bash
# Restart CoreDNS pods
kubectl -n kube-system rollout restart deployment coredns
```

## DNS Resolution Is Slow

If DNS queries work but are very slow (taking several seconds), there are a few things to check:

1. **Search domain expansion** - Kubernetes pods have multiple search domains by default. A query for `google.com` may first try `google.com.default.svc.cluster.local`, `google.com.svc.cluster.local`, and `google.com.cluster.local` before trying the bare name.

You can reduce this by using fully qualified domain names (with a trailing dot) in your application configuration, or by configuring dnsConfig in your pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"  # Reduce from default of 5
  containers:
    - name: myapp
      image: myapp:latest
```

2. **CoreDNS resource limits** - If CoreDNS is CPU or memory constrained, it may be slow to respond. Check the resource usage:

```bash
# Check CoreDNS resource consumption
kubectl -n kube-system top pods -l k8s-app=kube-dns
```

If CoreDNS is consistently near its resource limits, increase them.

## DNS Not Working After Configuration Change

If DNS stops working after you modify the Talos machine configuration, the new DNS settings may be incorrect. Check what changed:

```bash
# View the current machine configuration
talosctl -n <node-ip> get machineconfiguration -o yaml | grep -A5 nameservers
```

Revert to known-good nameservers if needed:

```bash
# Apply a configuration patch to fix DNS
talosctl -n <node-ip> patch machineconfig --patch '[{"op": "replace", "path": "/machine/network/nameservers", "value": ["8.8.8.8", "1.1.1.1"]}]'
```

## CoreDNS Service IP Mismatch

The kubelet on each node is configured to tell pods which IP to use for DNS. This must match the actual CoreDNS service IP:

```bash
# Check what kubelet tells pods to use
talosctl -n <node-ip> get machineconfiguration -o yaml | grep -A2 clusterDNS

# Check the actual CoreDNS service IP
kubectl -n kube-system get svc kube-dns
```

If these do not match, pods will try to reach a DNS server that does not exist. Update the machine configuration to match:

```yaml
machine:
  kubelet:
    clusterDNS:
      - 10.96.0.10  # Must match kube-dns service ClusterIP
```

## Summary

DNS troubleshooting on Talos Linux requires checking both the host level and the cluster level. Start by verifying that host DNS resolvers are correct, then check that CoreDNS pods are healthy, and finally test from inside a pod. Most DNS issues come down to incorrect nameserver configuration, CoreDNS pods not running, or a mismatch between the kubelet DNS configuration and the actual CoreDNS service IP. Fix these three things and DNS will work reliably.
