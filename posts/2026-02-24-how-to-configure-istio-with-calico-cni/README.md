# How to Configure Istio with Calico CNI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Calico, CNI, Kubernetes, Networking

Description: A practical guide to configuring Istio service mesh to work correctly with Calico CNI including network policy integration and troubleshooting tips.

---

Calico is one of the most popular CNI plugins for Kubernetes, known for its network policy enforcement and BGP-based routing. Running Istio on top of Calico works well, but there are some configuration details you need to get right to avoid connectivity issues. The two systems operate at different layers of the network stack, and understanding where they overlap is important for a smooth deployment.

## How Calico and Istio Interact

Calico handles Layer 3/4 networking: IP address management, pod-to-pod routing, and Kubernetes NetworkPolicy enforcement. Istio operates at Layer 7: HTTP routing, load balancing, mTLS, and observability.

The interaction points are:

1. **Traffic interception**: Istio uses iptables rules to redirect traffic through the sidecar proxy. Calico also uses iptables for network policy enforcement. The order of these rules matters.
2. **Network policies**: Calico enforces NetworkPolicy resources. Istio adds its own AuthorizationPolicy layer. Both need to allow traffic for services to communicate.
3. **IP address management**: Calico assigns pod IPs. Istio needs these IPs for service discovery and routing.

## Prerequisites

Before starting, verify your Calico installation:

```bash
# Check Calico version
kubectl get pods -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].spec.containers[0].image}'

# Verify Calico is healthy
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=calico-kube-controllers

# Check Calico configuration
kubectl get felixconfiguration default -o yaml
```

## Installing Istio with Calico

The standard Istio installation works with Calico. The key consideration is whether to use the Istio init container or the Istio CNI plugin for traffic interception.

### Option 1: Using Istio Init Container (Default)

The default approach uses an init container with `NET_ADMIN` capability to set up iptables rules:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: "10m"
            memory: "64Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

```bash
istioctl install -f istio-calico.yaml -y
```

This works fine with Calico in most cases. Calico's iptables rules are in the `filter` table, while Istio's rules are in the `nat` table, so they do not conflict directly.

### Option 2: Using Istio CNI Plugin (Recommended for Restricted Environments)

If your security policy does not allow `NET_ADMIN` capability on pods, use the Istio CNI plugin:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
        - istio-system
        - kube-system
        - calico-system
      chained: true
```

The `chained: true` setting is important. It tells the Istio CNI plugin to chain with Calico's CNI configuration rather than replacing it.

Verify the CNI plugin chain:

```bash
# Check the CNI config on a node
kubectl get nodes -o jsonpath='{.items[0].metadata.name}'
# SSH to a node or use a debug pod to check:
# cat /etc/cni/net.d/10-calico.conflist

# The Istio CNI should appear as a plugin in the chain
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=20
```

## Configuring Network Policies for Istio

Calico's network policy enforcement happens before traffic reaches the Istio sidecar. You need to make sure Calico allows the traffic that Istio needs:

### Allow istiod Communication

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istiod
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: istiod
  ingress:
    - from: []
      ports:
        - port: 15010
          protocol: TCP
        - port: 15012
          protocol: TCP
        - port: 15014
          protocol: TCP
        - port: 15017
          protocol: TCP
  egress:
    - to: []
```

### Allow Sidecar-to-istiod Communication

Every sidecar needs to reach istiod for configuration and certificate management:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-sidecar-to-istiod
  namespace: default
spec:
  podSelector: {}
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
        - podSelector:
            matchLabels:
              app: istiod
      ports:
        - port: 15012
          protocol: TCP
```

### Allow Inter-Pod mTLS Traffic

If you have restrictive default-deny policies, you need to allow traffic on the ports your services use:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-mesh-traffic
  namespace: default
spec:
  podSelector: {}
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
```

### Using Calico's GlobalNetworkPolicy

For mesh-wide rules, Calico's GlobalNetworkPolicy is more efficient than per-namespace NetworkPolicies:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-istio-system
spec:
  selector: all()
  egress:
    - action: Allow
      destination:
        namespaceSelector: kubernetes.io/metadata.name == "istio-system"
  ingress:
    - action: Allow
      source:
        namespaceSelector: kubernetes.io/metadata.name == "istio-system"
```

## Handling Calico and Istio Policy Overlap

Both Calico and Istio can enforce access control. The key difference:

- **Calico NetworkPolicy**: Enforced at Layer 3/4 (IP and port level)
- **Istio AuthorizationPolicy**: Enforced at Layer 7 (HTTP method, path, headers)

Best practice is to use them in complementary ways:

```yaml
# Calico: Allow traffic on the port level
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api-server
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: frontend
      ports:
        - port: 8080
          protocol: TCP

---
# Istio: Fine-grained access control at L7
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-server-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  rules:
    - from:
        - source:
            namespaces: ["frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/v1/*"]
```

## Troubleshooting Common Issues

### Issue: Pods Cannot Reach istiod

```bash
# Test connectivity from a pod to istiod
kubectl exec <pod> -c istio-proxy -- curl -s -o /dev/null -w "%{http_code}" \
  https://istiod.istio-system.svc:15012/healthz/ready --insecure

# Check Calico logs for denied traffic
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50 | grep -i "denied\|drop"

# Check if there is a default-deny policy blocking traffic
kubectl get networkpolicies --all-namespaces
```

### Issue: iptables Rule Conflicts

```bash
# Check iptables rules on a pod
kubectl exec <pod> -c istio-proxy -- iptables -t nat -L -n -v

# Check Calico's iptables rules
kubectl exec <pod> -c istio-proxy -- iptables -L -n -v | grep cali
```

### Issue: DNS Resolution Fails

Calico with DNS policy can interfere with Istio's DNS capture:

```bash
# Check if Istio DNS capture is working
kubectl exec <pod> -c <app-container> -- nslookup kubernetes.default.svc.cluster.local

# If DNS fails, check Calico DNS policy
kubectl get globalnetworkpolicies -o yaml | grep -A 10 "dns"

# Ensure kube-dns/CoreDNS traffic is allowed
```

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
spec:
  selector: all()
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 53
```

## Performance Considerations

Running both Calico and Istio means traffic passes through two enforcement points. Calico processes packets at the kernel level (or eBPF if configured), while Istio processes at the user-space proxy level. The combined overhead is generally acceptable, but be aware:

- Calico's eBPF mode can sometimes conflict with Istio's iptables rules. If using Calico eBPF dataplane, test thoroughly.
- Calico's WireGuard encryption and Istio mTLS are redundant. Use one or the other, not both.

```bash
# Check if Calico is using eBPF
kubectl get felixconfiguration default -o jsonpath='{.spec.bpfEnabled}'

# If using eBPF mode, you may need additional configuration for Istio
# Refer to Calico's documentation for eBPF + Istio compatibility
```

The combination of Calico and Istio gives you defense in depth: network-level segmentation from Calico and application-level security from Istio. Configure them to work together rather than fighting each other, and you get a much stronger security posture than either tool provides alone.
