# How to Troubleshoot DNS Resolution Issues in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, DNS, Networking

Description: Diagnose and fix DNS resolution failures in Rancher-managed Kubernetes clusters, including CoreDNS configuration, ndots settings, and upstream resolver problems.

## Introduction

DNS failures in Kubernetes can manifest as pod startup errors, service connectivity failures, or intermittent timeouts. Since Kubernetes relies on CoreDNS for internal service discovery, issues with CoreDNS cascade to virtually every networked workload. This guide covers how to debug and resolve DNS issues in Rancher-managed clusters.

## Step 1: Verify CoreDNS is Running

```bash
# Check CoreDNS pods

kubectl get pods -n kube-system -l k8s-app=kube-dns

# If pods are not Running, describe them for events
kubectl describe pod -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100

# Verify the CoreDNS service and EndpointSlices
kubectl get service -n kube-system kube-dns
kubectl get endpointslices -n kube-system -l kubernetes.io/service-name=kube-dns
```

## Step 2: Test DNS Resolution from a Pod

```bash
# Run a temporary debug pod
kubectl run dns-debug --image=nicolaka/netshoot --restart=Never --rm -it --command -- bash

# Inside the debug pod:
# Test Kubernetes service DNS
nslookup kubernetes.default.svc.cluster.local
nslookup <your-service>.<namespace>.svc.cluster.local

# Test external DNS
nslookup google.com

# Check the pod's /etc/resolv.conf
cat /etc/resolv.conf
# Should show: nameserver <kube-dns-cluster-ip>
# And search domains similar to: <namespace>.svc.<cluster-domain> svc.<cluster-domain> <cluster-domain>
```

## Step 3: Check CoreDNS Configuration

```bash
# Find and view the CoreDNS ConfigMap
kubectl get configmap -n kube-system | grep coredns
kubectl get configmap -n kube-system <coredns-configmap-name> -o yaml
```

A typical CoreDNS Corefile looks like:

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

Common issues:

- Missing `forward` stanza (external DNS won't resolve)
- Wrong cluster domain for your cluster (often `cluster.local`)
- `loop` plugin detecting a forwarding loop

## Step 4: Fix the ndots Setting

High `ndots` values cause excessive DNS lookup attempts before trying the absolute domain name:

```bash
# Check the pod's current ndots setting
kubectl exec <pod-name> -- cat /etc/resolv.conf | grep options

# In pod spec, you can override ndots:
# (With ndots:5, names with fewer than 5 dots are tried with the search list first)
```

```yaml
# Optimize DNS for a specific pod
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"   # Reduce from default 5 to speed up external DNS
      - name: single-request-reopen
        value: ""    # Fix intermittent DNS failures on some kernels
```

## Step 5: Debug with DNS Lookup Tools

```bash
# From inside the cluster, use dig for detailed DNS lookups
kubectl run dig-debug --image=nicolaka/netshoot --restart=Never --rm -it --command -- bash

# Detailed lookup against the cluster DNS service
dig @<kube-dns-service-ip> kubernetes.default.svc.cluster.local +norecurse

# Identify the upstream resolver from the CoreDNS Corefile or node resolv.conf,
# then test it directly from the debug pod
dig @<upstream-resolver-ip> google.com
```

## Step 6: Fix CoreDNS Loop Detection

```bash
# If CoreDNS logs show: "Loop (127.0.0.1:43465 -> :53) detected"
# This often happens when the node resolver points to a local stub such as 127.0.0.53

# Option 1: Override CoreDNS to use specific reachable upstream resolvers
kubectl edit configmap -n kube-system <coredns-configmap-name>
# Change: forward . /etc/resolv.conf
# To:     forward . <upstream-dns-ip-1> <upstream-dns-ip-2>

# Option 2: Point kubelet/RKE2/K3s at the real resolv.conf on systemd-resolved nodes
# Use /run/systemd/resolve/resolv.conf instead of the stub resolver file.
# Example RKE2/K3s config:
# resolv-conf: /run/systemd/resolve/resolv.conf
```

## Step 7: Scale CoreDNS for High Load

```bash
# Find the CoreDNS deployment name
kubectl get deployment -n kube-system -l k8s-app=kube-dns

# Check the CoreDNS metrics endpoint
kubectl port-forward -n kube-system deployment/<coredns-deployment-name> 9153:9153
curl http://localhost:9153/metrics | grep coredns_dns_requests_total

# Scale CoreDNS replicas
kubectl scale deployment -n kube-system <coredns-deployment-name> --replicas=3

# Enable NodeLocal DNSCache for improved performance
# On RKE2, enable it with a HelmChartConfig for rke2-coredns.
# The upstream Kubernetes manifest requires cluster-specific substitutions before use.
```

## Conclusion

DNS resolution issues in Rancher-managed clusters almost always trace back to CoreDNS misconfiguration, upstream resolver problems, or networking issues between pods and the CoreDNS service. Using a debug pod with `netshoot` or `dnsutils`, combined with CoreDNS log analysis, will quickly identify the root cause. For production clusters, consider scaling CoreDNS replicas and enabling NodeLocal DNSCache to improve reliability and performance.
