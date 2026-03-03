# How to Enforce Network Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Policies, Kubernetes, Security, CNI

Description: A hands-on guide to implementing and enforcing Kubernetes network policies on Talos Linux for pod-level network segmentation.

---

By default, Kubernetes allows all pods to communicate with each other without restriction. While this simplifies development, it creates a significant security risk in production. If an attacker compromises a single pod, they can reach every other pod in the cluster. Network policies provide pod-level firewall rules that control which pods can communicate with each other and with external endpoints.

Talos Linux supports network policies through its CNI plugins. Depending on which CNI you use - Cilium, Calico, or Flannel with a network policy engine - you can enforce fine-grained network segmentation. This guide covers how to design, implement, and verify network policies on a Talos Linux cluster.

## Prerequisites

- A Talos Linux cluster with a CNI that supports network policies (Cilium or Calico recommended)
- kubectl installed locally

Important: The default Flannel CNI does not support network policies. If you are using Flannel on Talos, you will need to switch to Cilium or Calico, or add a network policy engine like Calico alongside Flannel.

## Verifying CNI Support

First, check which CNI your Talos cluster uses and whether it supports network policies.

```bash
# Check the CNI in use
kubectl get pods -n kube-system | grep -E 'cilium|calico|flannel'

# For Cilium, verify network policy support
kubectl get ciliumnodes

# For Calico, verify the installation
kubectl get pods -n calico-system
```

If you are setting up a new Talos cluster, configure Cilium in the machine config.

```yaml
# talos-cilium-patch.yaml
cluster:
  network:
    cni:
      name: none  # Disable default CNI
  inlineManifests:
    - name: cilium
      contents: |
        # Apply Cilium via Helm after cluster bootstrap
```

## The Default Deny Strategy

The foundation of network policy enforcement is starting with a default deny rule and then explicitly allowing required traffic. This follows the principle of least privilege.

```yaml
# default-deny-all.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}  # Apply to all pods in the namespace
  policyTypes:
    - Ingress
    - Egress
```

This blocks all traffic to and from pods in the namespace. Now you need to add rules to allow legitimate traffic.

```bash
kubectl apply -f default-deny-all.yaml

# After applying, pods in the production namespace cannot communicate
# with anything - including DNS. We will fix that next.
```

## Allowing DNS Traffic

Almost every pod needs DNS resolution. Create a policy that allows DNS traffic first.

```yaml
# allow-dns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Common Network Policy Patterns

### Allow Frontend to Backend Communication

```yaml
# allow-frontend-to-backend.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
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
```

### Allow Backend to Database

```yaml
# allow-backend-to-database.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-to-database
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 5432
```

### Allow Ingress Controller Traffic

```yaml
# allow-from-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress-controller
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
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 80
```

### Allow Cross-Namespace Communication

```yaml
# allow-monitoring-scrape.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector: {}
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

### Allow Egress to External APIs

```yaml
# allow-external-api.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-api-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow HTTPS to external services
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8       # Block internal ranges
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

## A Complete Application Network Policy Set

Here is a complete set of policies for a typical three-tier application.

```yaml
# complete-app-policies.yaml
# Default deny for the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: my-app
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow DNS for all pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: my-app
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
# Frontend: allow ingress from load balancer, egress to backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: my-app
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 80
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - port: 8080
---
# Backend: allow ingress from frontend, egress to database and external
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
  namespace: my-app
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: frontend
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: database
      ports:
        - port: 5432
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - port: 443
---
# Database: only allow ingress from backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: my-app
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - port: 5432
```

## Testing Network Policies

Always test your policies to make sure they work as expected.

```bash
# Deploy a test pod for connectivity checks
kubectl run nettest --image=nicolaka/netshoot -n my-app -- sleep 3600

# Test connectivity to a specific pod
kubectl exec -n my-app nettest -- curl -s --connect-timeout 3 http://frontend-svc:80
# Should timeout if the policy blocks it

# Test DNS resolution
kubectl exec -n my-app nettest -- nslookup kubernetes.default

# Test external connectivity
kubectl exec -n my-app nettest -- curl -s --connect-timeout 3 https://api.github.com

# Clean up
kubectl delete pod nettest -n my-app
```

## Visualizing Network Policies

Use tools like Cilium's Hubble to visualize network flows and policy decisions.

```bash
# If using Cilium, install Hubble
cilium hubble enable --ui

# Port-forward to access the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Use Hubble CLI to observe flows
hubble observe --namespace my-app
hubble observe --namespace my-app --verdict DROPPED
```

## Automating Network Policy Deployment

Use Kyverno to auto-generate default deny policies for every new namespace.

```yaml
# auto-network-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-deny
spec:
  rules:
    - name: default-deny
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              names:
                - kube-system
                - kube-public
                - default
      generate:
        kind: NetworkPolicy
        apiVersion: networking.k8s.io/v1
        name: default-deny
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
              - Egress
```

## Wrapping Up

Network policies on Talos Linux are essential for limiting the blast radius of any security incident. A compromised pod with proper network policies in place can only reach the specific services it is allowed to talk to, dramatically reducing the impact of an attack. Start with default deny policies, add explicit allows for legitimate traffic, and use tools like Hubble to verify your policies are working correctly. On Talos Linux, where the OS is already hardened, network policies complete the security picture at the application layer.
