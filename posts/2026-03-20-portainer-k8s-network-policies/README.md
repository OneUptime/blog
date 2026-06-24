# How to Configure Network Policies via Portainer on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Network Policies, Security, Zero Trust

Description: Implement Kubernetes Network Policies to enforce zero-trust networking between pods using Portainer's YAML manifest interface.

## Introduction

Kubernetes Network Policies control traffic flow between pods, namespaces, and external IPs. By default, all pods can communicate with all other pods. Network policies implement microsegmentation-allowing only explicitly permitted traffic. Portainer allows managing these policies via YAML manifests.

## Prerequisites

- Kubernetes cluster with a CNI plugin that supports Network Policies (Calico, Cilium, Weave Net)
- Note: Flannel by itself does NOT support Network Policies

## Default Deny Policies

Start with a default deny-all policy, then add explicit allows:

```yaml
# default-deny.yml - deploy via Portainer

# Block all ingress to the namespace by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # Apply to ALL pods in the namespace
  policyTypes:
  - Ingress

---
# Block all egress from the namespace by default
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

## Allowing Specific Traffic

```yaml
# app-network-policies.yml
# Allow frontend to communicate with backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend        # This policy applies to backend pods
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend   # Only allow traffic from frontend pods
    ports:
    - protocol: TCP
      port: 8080
---
# Allow frontend pods to send traffic to backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-egress
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
    - protocol: TCP
      port: 8080
---
# Allow backend to access database
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
---
# Allow backend pods to send traffic to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-egress
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
    - protocol: TCP
      port: 5432
---
# Allow monitoring to scrape all pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scraping
  namespace: production
spec:
  podSelector: {}  # Apply to all pods
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: monitoring
    ports:
    - protocol: TCP
      port: 9090
    - protocol: TCP
      port: 8080
---
# Allow DNS resolution for all pods
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
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
---
# Allow internet access for specific pods (e.g., API clients)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      needs-internet: "true"
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8      # Exclude internal networks
        - 172.16.0.0/12
        - 192.168.0.0/16
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```

## Cross-Namespace Communication

```yaml
# Allow staging to call production read-only APIs
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-staging-read
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: read-api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: staging
      podSelector:
        matchLabels:
          role: api-client
```

## Testing Network Policies

```bash
# Test frontend -> backend from a pod that matches the allow policy
kubectl run frontend-test --image=busybox --rm -it --restart=Never \
  --labels="app=frontend" -n production --command -- nc -zv backend 8080

# Test a pod without the required label - should fail
kubectl run debug --image=busybox --rm -it --restart=Never \
  -n production --command -- nc -zv backend 8080

# Test outbound internet access from a pod without needs-internet=true - should fail
kubectl run debug-egress --image=busybox --rm -it --restart=Never \
  -n production --command -- nc -zv example.com 443

# Test cross-namespace access from a staging API client - should succeed
kubectl run api-client-test --image=busybox --rm -it --restart=Never \
  --labels="role=api-client" -n staging --command -- \
  nc -zv read-api.production.svc.cluster.local 8080
```

## Conclusion

Network Policies deployed via Portainer implement zero-trust networking in Kubernetes. By starting with a default-deny posture and adding explicit allow rules, you limit the blast radius of any compromised pod. Portainer's web editor makes applying and updating manifest-based network policies straightforward.
