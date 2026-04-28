# How to Implement Networking Best Practices in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Networking, CNI, Network Policies, Calico, Security, Kubernetes

Description: Implement networking best practices in Rancher including CNI selection, network policy enforcement, service mesh considerations, ingress configuration, and DNS management for production Kubernetes...

## Introduction

Network architecture in Rancher clusters affects performance, security, and operability. Key decisions include CNI selection, overlay vs. BGP routing, network policy enforcement, ingress controller configuration, and DNS management. This guide covers the networking best practices that prevent the most common production issues.

## Step 1: Choose the Right CNI

| CNI | Best For | Avoid When |
|---|---|---|
| Calico (BGP) | High performance, firewall integration | Simple cloud deployments (BGP not supported) |
| Calico (VXLAN) | Cloud environments, L3-only networks | Latency-sensitive workloads |
| Flannel | Simplicity, K3s defaults | Advanced network policy needs |
| Cilium | eBPF performance, observability | Older kernels (< 4.19) |
| Canal | Flannel + Calico policies | New deployments (use pure Calico) |

```yaml
# Calico VXLAN configuration for cloud deployments

apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - cidr: 10.244.0.0/16
        encapsulation: VXLAN
        natOutgoing: Enabled
```

## Step 2: Enforce Network Policies

Always start with a default deny-all and explicitly allow required traffic:

```yaml
# Apply to every production namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
# Allow DNS egress (required for service discovery)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes: [Egress]
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

## Step 3: Ingress Controller Best Practices

```yaml
# NGINX Ingress with rate limiting and security headers
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/limit-rpm: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;
spec:
  ingressClassName: nginx
  tls:
    - secretName: myapp-tls
      hosts:
        - app.company.com
  rules:
    - host: app.company.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

## Step 4: DNS Best Practices

```yaml
# CoreDNS tuning for large clusters
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health { lameduck 5s }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
          ttl 30
        }
        # Cache for external DNS (reduces upstream queries)
        cache 30
        forward . /etc/resolv.conf {
          max_concurrent 1000
        }
        loop
        reload
        loadbalance
    }
```

## Step 5: Service Mesh Considerations

```bash
# Use Istio for mTLS between services (service-to-service auth)
# Only deploy if you need: mTLS, traffic management, circuit breaking

# Install lightweight alternative: Linkerd
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
linkerd check --pre
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Enable mTLS for a namespace
kubectl annotate namespace production linkerd.io/inject=enabled

# Verify mTLS
linkerd viz tap namespace/production
```

## Step 6: Load Balancer and MetalLB

For bare-metal clusters without cloud load balancers:

```yaml
# MetalLB Layer 2 mode
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250   # Dedicated IP range for LBs
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-pool
```

## Networking Checklist

- CNI selected based on performance and environment requirements
- Pod CIDR and Service CIDR sized for growth (use /16 for pods)
- Network policies: default deny-all + explicit allows per namespace
- Ingress controller with TLS, rate limiting, and security headers
- CoreDNS tuned for cluster size (cache, concurrent queries)
- MetalLB or cloud LB configured for LoadBalancer services
- Firewall rules allow: VXLAN (8472), BGP (179), etcd (2379-2380)
- Network segmentation: prod, staging, dev in separate namespaces

## Conclusion

Rancher networking best practices center on three principles: use the right CNI for your environment, enforce network policies with default-deny, and configure ingress with security hardening. Start with Calico for CNI (it scales from simple to complex), enforce network policies from day one (retrofitting is painful), and deploy NGINX Ingress with TLS and rate limiting before exposing services externally. Review network policies quarterly as application dependencies evolve.
