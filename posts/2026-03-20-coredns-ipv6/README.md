# How to Configure CoreDNS for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, CoreDNS, DNS, Dual-Stack, Service Discovery

Description: Configure CoreDNS in Kubernetes clusters to resolve IPv6 service addresses, handle AAAA record queries, and support dual-stack DNS resolution for pods and services.

## Introduction

CoreDNS is the default DNS provider for Kubernetes and handles both A (IPv4) and AAAA (IPv6) record resolution for services and pods. In dual-stack clusters, CoreDNS automatically returns both A and AAAA records for services that have both IPv4 and IPv6 ClusterIPs. CoreDNS also resolves external AAAA queries, enabling pods to reach IPv6 internet services by name.

## Verify CoreDNS IPv6 Configuration

```bash
# Check CoreDNS pods are running

kubectl -n kube-system get pods -l k8s-app=kube-dns

# View CoreDNS ConfigMap
kubectl -n kube-system get configmap coredns -o yaml

# CoreDNS ClusterIP (should have both IPv4 and IPv6 in dual-stack)
kubectl -n kube-system get svc kube-dns
kubectl -n kube-system get svc kube-dns -o jsonpath='{.spec.clusterIPs}'
```

## CoreDNS Corefile for Dual-Stack

```text
# Default Corefile that works with dual-stack
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

```bash
# The key line is: kubernetes cluster.local in-addr.arpa ip6.arpa
# - ip6.arpa enables reverse IPv6 DNS lookups
# - CoreDNS serves AAAA records for dual-stack services automatically

# Apply updated Corefile
kubectl -n kube-system edit configmap coredns
# Edit and save, CoreDNS auto-reloads via the 'reload' plugin
```

## Test CoreDNS IPv6 Resolution

```bash
# Deploy a test pod for DNS testing
kubectl run dnstest --image=alpine --command -- sleep infinity

# Test A record resolution
kubectl exec dnstest -- nslookup kubernetes.default.svc.cluster.local

# Test AAAA record resolution for a dual-stack service
kubectl exec dnstest -- nslookup -type=AAAA kubernetes.default.svc.cluster.local

# Test AAAA record for a service
kubectl exec dnstest -- sh -c "
    nslookup -type=AAAA kubernetes.default.svc.cluster.local
    # Expected: returns IPv6 ClusterIP
"

# Test external AAAA resolution
kubectl exec dnstest -- nslookup -type=AAAA google.com
# Expected: returns Google's AAAA records

# Test reverse IPv6 lookup
SVC_IPV6="fd00:10:96::1"
kubectl exec dnstest -- nslookup "$SVC_IPV6"
```

## Configure External DNS64 Forwarder

```text
# Corefile with DNS64 forwarder for IPv6-only pods
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
    }
    # Forward external queries to DNS64 server (for IPv6-only clusters)
    forward . 64:ff9b::8.8.8.8 64:ff9b::8.8.4.4 {
        policy sequential
    }
    cache 30
    loop
    reload
    loadbalance
}
```

## CoreDNS with Dual-Stack ClusterIP

```yaml
# CoreDNS service with dual-stack ClusterIPs
apiVersion: v1
kind: Service
metadata:
  name: kube-dns
  namespace: kube-system
spec:
  selector:
    k8s-app: kube-dns
  clusterIP: 10.96.0.10
  clusterIPs:
    - 10.96.0.10
    - fd00:10:96::a
  ports:
    - name: dns
      port: 53
      protocol: UDP
      targetPort: 53
    - name: dns-tcp
      port: 53
      protocol: TCP
      targetPort: 53
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv4
    - IPv6
```

## Troubleshoot CoreDNS IPv6 Issues

```bash
# Check CoreDNS logs for IPv6 query errors
kubectl -n kube-system logs deployment/coredns | grep -i "aaaa\|ipv6\|ip6"

# Debug DNS from a pod
kubectl exec dnstest -- sh -c "
    cat /etc/resolv.conf
    # Shows: nameserver 10.96.0.10 (or dual-stack DNS IP)
"

# Test CoreDNS directly using dig from a pod
kubectl exec dnstest -- sh -c "
    apk add bind-tools -q
    # Test AAAA for service
    dig AAAA myservice.default.svc.cluster.local @10.96.0.10
"

# Check CoreDNS readiness (ready plugin listens on 8181 by default)
kubectl -n kube-system exec deployment/coredns -- \
    wget -qO- http://localhost:8181/ready
# Output: OK
```

## Conclusion

CoreDNS in dual-stack Kubernetes clusters automatically serves both A and AAAA records for services with dual-stack ClusterIPs. The `kubernetes` plugin in the Corefile must include `ip6.arpa` in its zone list for reverse IPv6 lookups. Test AAAA resolution from pods using `nslookup -type=AAAA service.namespace.svc.cluster.local`. For IPv6-only clusters needing access to IPv4 services, configure a DNS64 forwarder in the Corefile. CoreDNS reloads its Corefile automatically when the ConfigMap is updated.
