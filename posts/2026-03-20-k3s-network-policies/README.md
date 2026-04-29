# How to Set Up Network Policies in K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Network Policies, Security, Networking, DevOps

Description: Learn how to implement Kubernetes Network Policies in K3s to control pod-to-pod traffic and enforce zero-trust networking.

## Introduction

By default, all pods in a Kubernetes cluster can communicate with each other freely. Network Policies provide a way to restrict this communication, implementing a form of zero-trust networking where you explicitly allow only the traffic you need. K3s includes a built-in Network Policy controller alongside the default Flannel CNI, and you can also use custom CNIs such as Canal or Cilium if you disable the built-in controller to avoid conflicts. This guide covers setting up and using Network Policies effectively.

## Understanding Network Policy Behavior

**Without Network Policies**: All pods can communicate with all other pods across all namespaces.

**With Network Policies**: Once you apply a NetworkPolicy that selects a pod for ingress or egress, traffic in that direction is allowed only if a policy permits it. Pods without any NetworkPolicy selecting them for a given direction remain non-isolated in that direction.

## Step 1: Enable Network Policy Support in K3s

K3s already includes a Network Policy controller, so a default installation is enough to use standard Kubernetes `NetworkPolicy` resources:

```bash
# Install K3s with the default Flannel CNI and built-in network policy controller
curl -sfL https://get.k3s.io | sh -
```

If you prefer a custom CNI such as Canal or Cilium, disable Flannel and the built-in K3s controller first, then follow that CNI's official installation guide:

```bash
# Install K3s without Flannel, then install your CNI of choice
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--flannel-backend=none --disable-network-policy" \
  sh -
```

## Step 2: Default Deny All Policy

Start with a default-deny policy and explicitly allow needed traffic:

```yaml
# default-deny.yaml
---
# Deny all ingress traffic in the production namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # Applies to all pods in the namespace
  policyTypes:
    - Ingress
---
# Deny all egress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

Apply it:

```bash
kubectl apply -f default-deny.yaml
kubectl get networkpolicy -n production
```

## Step 3: Allow DNS Resolution

After default-deny, pods need DNS access:

```yaml
# allow-dns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}  # Applies to all pods
  policyTypes:
    - Egress
  egress:
    # Allow DNS queries on port 53
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

## Step 4: Allow Specific Service Communication

With a default-deny policy in place, you need matching egress and ingress rules for each allowed communication path:

```yaml
# allow-frontend-to-backend.yaml
---
# Allow frontend pods to send traffic to backend pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-egress-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - port: 8080
          protocol: TCP
---
# Allow backend pods to receive traffic from frontend pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  # Applies to backend pods
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        # Only allow traffic from frontend pods
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080
          protocol: TCP
---
# Allow backend pods to send traffic to database pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-egress-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - port: 5432
          protocol: TCP
---
# Allow database pods to receive traffic from backend pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-to-db
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
        - port: 5432
          protocol: TCP
```

## Step 5: Allow External Traffic via Ingress

```yaml
# allow-ingress-controller.yaml
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
        # Allow from the ingress-nginx namespace
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 80
          protocol: TCP
        - port: 443
          protocol: TCP
```

## Step 6: Cross-Namespace Communication

```yaml
# cross-namespace-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector: {}  # All pods in production
  policyTypes:
    - Ingress
  ingress:
    - from:
        # Allow Prometheus scraping from monitoring namespace
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app.kubernetes.io/name: prometheus
      ports:
        - port: 9090
          protocol: TCP
```

## Step 7: Allow External IP Ranges

```yaml
# allow-external-cidr.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-office-network
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: admin-portal
  policyTypes:
    - Ingress
  ingress:
    - from:
        # Allow from office network CIDR
        - ipBlock:
            cidr: 203.0.113.0/24
      ports:
        - port: 443
          protocol: TCP
```

## Step 8: Complete Production Setup Example

A complete example for a three-tier application:

```yaml
# production-network-policies.yaml
---
# Default deny all in production
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow DNS from all pods
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
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
---
# Frontend: accept from ingress, send to backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: production
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
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - port: 8080
    # DNS
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
---
# Backend: accept from frontend, send to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
  namespace: production
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
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
---
# Database: accept only from backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: production
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

## Step 9: Test Network Policies

```bash
# Deploy test pods that match the example policies
kubectl run client --image=busybox -n production --restart=Never \
  --labels="tier=frontend" -- sleep 3600
kubectl run server --image=python:3.12-alpine -n production --restart=Never \
  --labels="tier=backend" --command -- python -m http.server 8080
kubectl expose pod server --port=8080 --target-port=8080 -n production

kubectl wait --for=condition=Ready pod/client pod/server -n production --timeout=60s

# Test connection (should work if the frontend and backend policies are applied)
kubectl exec -n production client -- wget -O- http://server:8080/ --timeout=5

# Test blocked connection (should timeout)
kubectl run blocked --image=busybox -n default --restart=Never -- sleep 3600
kubectl wait --for=condition=Ready pod/blocked -n default --timeout=60s
kubectl exec -n default blocked -- wget -O- http://server.production:8080/ --timeout=5
# Should timeout (not allowed by policy)

# Clean up
kubectl delete pod client server -n production
kubectl delete svc server -n production
kubectl delete pod blocked -n default
```

## Conclusion

Network Policies are essential for securing K3s clusters by implementing zero-trust networking between pods. The recommended approach is to start with default-deny policies per namespace, then explicitly allow only required communication paths. Always remember to allow DNS egress after applying default-deny, as pods need to resolve service names. K3s's built-in network policy controller works for standard Kubernetes `NetworkPolicy` resources, and if you switch to a custom CNI such as Canal or Cilium, disable the built-in controller to avoid conflicts.
