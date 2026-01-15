# How to Implement IPv6 Network Policies in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Kubernetes, Network Policies, Security, Networking, DevOps

Description: A comprehensive guide to implementing IPv6 network policies in Kubernetes, covering dual-stack configurations, YAML examples, and best practices for securing modern cloud-native applications.

---

IPv4 address exhaustion is real. Kubernetes has supported dual-stack networking since version 1.21, and if you're running production workloads, you need to understand how to secure IPv6 traffic with Network Policies.

## Why IPv6 in Kubernetes?

- **Address Space**: IPv6 provides 340 undecillion addresses compared to IPv4's 4.3 billion
- **Native End-to-End Connectivity**: No more NAT complexity
- **Better Performance**: Simplified header processing and no NAT translation overhead
- **Cloud Provider Requirements**: Major cloud providers are pushing IPv6 adoption

## Prerequisites

### Verify CNI Plugin Support

| CNI Plugin | IPv6 Support | Network Policies | Notes |
|------------|--------------|------------------|-------|
| Calico | Full | Full IPv6 support | Recommended |
| Cilium | Full | Full IPv6 + L7 | Best for advanced use cases |
| Weave Net | Partial | IPv4 only policies | Not recommended for IPv6 |
| Flannel | Basic | No policy support | Avoid for production |

Check your current CNI:

```bash
# Identify CNI plugin
kubectl get pods -n kube-system -o wide | grep -E 'calico|cilium|weave|flannel'

# For Calico, check IPv6 support
kubectl get felixconfiguration default -o yaml | grep -i ipv6
```

### Verify Dual-Stack is Enabled

```bash
# Check cluster CIDR configuration
kubectl cluster-info dump | grep -E "cluster-cidr|service-cluster-ip-range"

# Verify pods have both IPv4 and IPv6 addresses
kubectl get pods -o wide -A | head -20
```

## Enabling Dual-Stack Networking

### Cluster Configuration (kubeadm)

```yaml
# kubeadm-config.yaml
# Enables both IPv4 and IPv6 addressing for pods and services
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  # Dual-stack pod CIDR
  podSubnet: "10.244.0.0/16,fd00:10:244::/48"
  # Dual-stack service CIDR
  serviceSubnet: "10.96.0.0/12,fd00:10:96::/108"
```

### Calico IPv6 Configuration

```yaml
# calico-ipv6-config.yaml
# IPPool for Calico with IPv6 support
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv6-ippool
spec:
  cidr: fd00:10:244::/48
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: false
  nodeSelector: all()
  blockSize: 64
---
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  ipv6Support: true
```

## IPv6 CIDR Notation Reference

| CIDR | Description | Example Use |
|------|-------------|-------------|
| ::/0 | All IPv6 addresses | Allow all IPv6 traffic |
| ::1/128 | Localhost only | Single host |
| fd00::/8 | Unique Local Addresses (ULA) | Private cluster traffic |
| fe80::/10 | Link-local addresses | Node-local traffic |
| 2000::/3 | Global unicast | Public internet |
| 2001:db8::/32 | Documentation prefix | Examples only |

## Implementing Default Deny for IPv6

### Default Deny All Traffic

```yaml
# default-deny-all-ipv6.yaml
# Complete isolation - the foundation of zero-trust
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
  annotations:
    description: "Deny all ingress and egress traffic"
spec:
  # Empty selector = all pods in namespace
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  # No rules = deny all
```

## Essential Allow Policies

### Allow IPv6 DNS Resolution

```yaml
# allow-ipv6-dns.yaml
# Critical: Without this, pods cannot resolve DNS names
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ipv6-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS to kube-dns/CoreDNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow external IPv6 DNS servers
    - to:
        - ipBlock:
            cidr: 2001:4860:4860::8888/128  # Google DNS
        - ipBlock:
            cidr: 2606:4700:4700::1111/128  # Cloudflare DNS
      ports:
        - protocol: UDP
          port: 53
```

### Allow Kubernetes API Access

```yaml
# allow-ipv6-kube-api.yaml
# For pods that need to interact with the cluster
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ipv6-kube-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      needs-kube-api: "true"
  policyTypes:
    - Egress
  egress:
    - to:
        # Replace with your API server IPv6 address
        - ipBlock:
            cidr: fd00:10:96::1/128
      ports:
        - protocol: TCP
          port: 6443
```

## Real-World IPv6 Network Policy Patterns

### Pattern 1: Three-Tier Application

```yaml
# three-tier-policies.yaml
# Complete network policy set for frontend, API, and database

---
# Frontend: receives external traffic, talks to API
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
        # Allow from IPv6 load balancer range
        - ipBlock:
            cidr: 2001:db8:1::/48
      ports:
        - protocol: TCP
          port: 80
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Egress
  egress:
    # Allow to API pods only
    - to:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - protocol: TCP
          port: 8080
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
---
# API: receives from frontend, talks to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Egress
  egress:
    # Allow to database
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # Allow external IPv6 APIs
    - to:
        - ipBlock:
            cidr: 2000::/3
            except:
              - fd00::/8  # Block internal ULA for external calls
      ports:
        - protocol: TCP
          port: 443
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
---
# Database: receives from API only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - protocol: TCP
          port: 5432
```

### Pattern 2: IPv6 Namespace Isolation

```yaml
# ipv6-namespace-isolation.yaml
# Allow only internal IPv6 traffic within namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ipv6-namespace-isolation
  namespace: ipv6-native
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}  # Same namespace
        - ipBlock:
            cidr: fd00::/8  # ULA range
  egress:
    - to:
        - podSelector: {}
        - ipBlock:
            cidr: fd00::/8
    # DNS egress
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

### Pattern 3: Monitoring with IPv6

```yaml
# ipv6-monitoring-policy.yaml
# Allow Prometheus to scrape metrics over IPv6
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape-ipv6
  namespace: production
spec:
  podSelector:
    matchLabels:
      metrics: enabled
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080
```

## Advanced: Cilium IPv6 Policies

### L7 HTTP Filtering

```yaml
# cilium-l7-ipv6-policy.yaml
# HTTP-level filtering for IPv6 traffic
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-l7-ipv6-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "/api/v[12]/.*"
              - method: POST
                path: "/api/v2/orders"
              - method: GET
                path: "/health"
```

### DNS-Based Egress

```yaml
# cilium-dns-ipv6-policy.yaml
# Allow egress to specific FQDNs
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-fqdn-ipv6
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: webhook-service
  egress:
    - toFQDNs:
        - matchName: "api.stripe.com"
        - matchName: "api.github.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Testing IPv6 Network Policies

### Deploy Test Environment

```bash
#!/bin/bash
# Create test namespace and pods
kubectl create namespace ipv6-test

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: ipv6-client
  namespace: ipv6-test
  labels:
    app: client
spec:
  containers:
    - name: client
      image: nicolaka/netshoot:latest
      command: ["sleep", "infinity"]
---
apiVersion: v1
kind: Pod
metadata:
  name: ipv6-server
  namespace: ipv6-test
  labels:
    app: server
spec:
  containers:
    - name: server
      image: nginx:alpine
---
apiVersion: v1
kind: Service
metadata:
  name: ipv6-server
  namespace: ipv6-test
spec:
  selector:
    app: server
  ports:
    - port: 80
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv6
    - IPv4
EOF

kubectl wait --for=condition=Ready pod -l app=client -n ipv6-test --timeout=60s
```

### Test Connectivity

```bash
#!/bin/bash
NAMESPACE="ipv6-test"

# Test before policy
echo "Testing connectivity before policy..."
kubectl exec -n $NAMESPACE ipv6-client -- curl -s --max-time 5 http://ipv6-server

# Apply default deny
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
EOF

sleep 2

# Test after deny - should fail
echo "Testing after deny policy..."
kubectl exec -n $NAMESPACE ipv6-client -- curl -s --max-time 5 http://ipv6-server || echo "BLOCKED (expected)"
```

## Debugging IPv6 Network Policies

### Diagnostic Script

```bash
#!/bin/bash
NAMESPACE=${1:-"default"}

echo "=== IPv6 Network Policy Diagnostics ==="

# Check CNI
kubectl get pods -n kube-system | grep -E 'calico|cilium'

# List policies
kubectl get networkpolicies -n $NAMESPACE -o wide

# Check pod IPv6 addresses
kubectl get pods -n $NAMESPACE -o custom-columns=NAME:.metadata.name,IPs:.status.podIPs

# Calico IPv6 check
kubectl get felixconfiguration default -o yaml 2>/dev/null | grep -A5 -i ipv6
```

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| CNI doesn't support IPv6 | Policies ignored | Upgrade to Calico/Cilium |
| Dual-stack not enabled | No IPv6 addresses | Enable in cluster config |
| Missing DNS egress | All connectivity fails | Add DNS egress rule |
| Wrong CIDR notation | Policy has no effect | Verify IPv6 CIDR syntax |
| Link-local blocked | Node communication fails | Allow fe80::/10 |

## Best Practices

### Do's

1. **Start with default deny** - Apply deny-all policies first, then whitelist
2. **Use ULA for internal traffic** - fd00::/8 for cluster-internal communication
3. **Allow DNS explicitly** - Both UDP and TCP on port 53
4. **Test in staging first** - Validate policies before production
5. **Document every policy** - Use annotations to explain purpose
6. **Monitor policy violations** - Use Cilium Hubble or Calico Enterprise

### Don'ts

1. **Don't assume IPv4 policies cover IPv6** - They're processed separately
2. **Don't forget link-local addresses** - fe80::/10 for node communication
3. **Don't use overly broad CIDR blocks** - Be specific with address ranges
4. **Don't skip egress policies** - Outbound traffic is equally important

### Security Checklist

- [ ] Default deny ingress in all namespaces
- [ ] Default deny egress in all namespaces
- [ ] DNS egress explicitly allowed
- [ ] Kubernetes API egress controlled
- [ ] Node communication allowed (fe80::/10)
- [ ] Cross-namespace traffic restricted
- [ ] External IPv6 access limited to required services
- [ ] Policies tested with IPv6 traffic

## Summary Table

| Policy Type | IPv6 CIDR | Use Case |
|-------------|-----------|----------|
| Default Deny | ::/0 | Block all IPv6 traffic |
| Internal Cluster | fd00::/8 | ULA for pod-to-pod |
| DNS (Google) | 2001:4860:4860::8888/128 | External DNS resolution |
| Node Local | fe80::/10 | Link-local communication |
| External Services | 2000::/3 | Global unicast internet |
| Documentation | 2001:db8::/32 | Examples only (never use in prod) |

---

IPv6 Network Policies in Kubernetes follow the same patterns as IPv4. The key is understanding IPv6 address ranges and ensuring your CNI plugin fully supports dual-stack. Start with default deny, explicitly allow required traffic, and test thoroughly. As IPv4 exhaustion continues, your future self will thank you for building IPv6-native infrastructure today.
