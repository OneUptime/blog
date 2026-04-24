# How to Troubleshoot Kubernetes DNS Issues in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, DNS, CoreDNS, Networking

Description: Diagnose and fix Kubernetes DNS resolution failures in clusters managed with Portainer, covering CoreDNS, service discovery, and network policies.

## Introduction

DNS is the backbone of Kubernetes service discovery. When DNS fails, services can't communicate, and applications crash with connection errors. Portainer helps you navigate namespaces and services visually, but DNS debugging requires systematic CLI investigation. This guide covers the most common DNS failure scenarios and their fixes.

## Common DNS Error Symptoms

```text
# Application logs showing DNS failures:

Error: getaddrinfo ENOTFOUND my-service.production.svc.cluster.local
dial tcp: lookup postgres on 10.96.0.10:53: no such host
curl: (6) Could not resolve host: redis
```

## Step 1: Verify CoreDNS is Running

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Should see one or more Running pods
# NAME                       READY   STATUS    RESTARTS   AGE
# coredns-5d78c9869d-8xbdj   1/1     Running   0          5d

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Look for:
# [ERROR] plugin/errors: 2 SERVFAIL
# CoreDNS overloaded warnings
```

## Step 2: Test DNS from Inside a Pod

```bash
# Deploy a DNS debugging pod
kubectl run dns-debug --image=busybox:1.35 --rm -it --restart=Never -- sh

# Inside the pod:
# Test cluster DNS
nslookup kubernetes.default
nslookup my-service.production.svc.cluster.local

# Test external DNS
nslookup google.com

# Check the resolv.conf
cat /etc/resolv.conf
# Should show:
# nameserver 10.96.0.10    <- CoreDNS ClusterIP
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

## Step 3: Check the CoreDNS Service

```bash
# Verify the kube-dns service
kubectl get svc kube-dns -n kube-system
# NAME       TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)         AGE
# kube-dns   ClusterIP   10.96.0.10   <none>        53/UDP,53/TCP   30d

# Verify EndpointSlices exist
kubectl get endpointslice -n kube-system -l kubernetes.io/service-name=kube-dns
```

If no EndpointSlices appear, check that the CoreDNS Service selector still matches the CoreDNS pods.

## Step 4: Diagnose Service Name Resolution

```bash
# Full DNS name format: <service>.<namespace>.svc.<cluster-domain>
# Default cluster domain is: cluster.local

# Test from debug pod
nslookup my-service               # Short name (works within same namespace)
nslookup my-service.production    # Namespace-qualified
nslookup my-service.production.svc.cluster.local  # Fully qualified

# Inspect the kubernetes line in the Corefile to see the cluster domain
kubectl get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}' | grep '^ *kubernetes '
```

## Step 5: Check NetworkPolicy Blocking DNS

A NetworkPolicy may be blocking UDP/TCP port 53:

```bash
# Check for NetworkPolicies in the pod's namespace
kubectl get networkpolicy -n production

# A restrictive egress policy can block DNS
kubectl describe networkpolicy -n production
```

Fix: Allow DNS egress in your NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}  # Apply to all pods
  policyTypes:
  - Egress
  egress:
  # Allow DNS to CoreDNS in kube-system
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - port: 53
      protocol: UDP
    - port: 53
      protocol: TCP
```

## Step 6: Fix CoreDNS Configuration Issues

```bash
# View the CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml
```

Common issues in the Corefile:

```text
# Corefile example with fixes:
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
    # Add this for external DNS forwarding
    forward . /etc/resolv.conf {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
```

```bash
# Apply updated CoreDNS config
kubectl edit configmap coredns -n kube-system

# Wait a minute or two for the updated ConfigMap to propagate,
# or restart CoreDNS if you need the change applied immediately
kubectl rollout restart deployment/coredns -n kube-system
```

## Step 7: Fix ndots and Search Domain Issues

The `ndots:5` setting means any hostname with fewer than 5 dots goes through search domain expansion before being tried as absolute. This causes latency:

```yaml
# In your pod spec, customize DNS config
spec:
  dnsConfig:
    options:
    - name: ndots
      value: "2"      # Reduce from 5 to 2
    - name: single-request-reopen
  dnsPolicy: ClusterFirst
```

## Step 8: Debug with dig

```bash
# More detailed DNS debugging
kubectl run dig-debug --image=tutum/dnsutils --rm -it --restart=Never -- sh

# Inside the pod:
# Replace <kube-dns-cluster-ip> with the ClusterIP from Step 3
dig @<kube-dns-cluster-ip> my-service.production.svc.cluster.local
dig @<kube-dns-cluster-ip> google.com

# Check for SERVFAIL
# Check response time (Query time)
```

## CoreDNS Performance Tuning

```bash
# Increase CoreDNS replicas if under heavy load
kubectl scale deployment coredns --replicas=3 -n kube-system

# Consider autopath for faster resolution only if you also change
# the kubernetes plugin to `pods verified`
# In Corefile, add:
# autopath @kubernetes
```

## DNS Troubleshooting Checklist

```bash
#!/bin/bash
# dns-check.sh - Quick DNS health check
echo "=== CoreDNS Pods ==="
kubectl get pods -n kube-system -l k8s-app=kube-dns

echo ""
echo "=== CoreDNS Service ==="
kubectl get svc kube-dns -n kube-system
kubectl get endpointslice -n kube-system -l kubernetes.io/service-name=kube-dns

echo ""
echo "=== CoreDNS ConfigMap ==="
kubectl get cm coredns -n kube-system -o yaml | grep -A30 "Corefile:"

echo ""
echo "=== Recent CoreDNS Errors ==="
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20 | grep -i error
```

## Conclusion

Kubernetes DNS issues follow predictable patterns: CoreDNS pod failures, NetworkPolicy blocking port 53, incorrect service names, or misconfigured Corefile. The systematic approach of verifying CoreDNS health, testing from within a pod, checking NetworkPolicies, and inspecting the Corefile resolves the vast majority of DNS failures. Portainer's namespace and service views help navigate the cluster structure, while these CLI tools provide the deep inspection needed to diagnose DNS problems.
