# How to Manage Network Policies with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Network Policies, GitOps, Security, Zero Trust, Calico

Description: A practical guide to managing Kubernetes Network Policies with Flux CD for implementing zero-trust network security in your clusters.

---

## Introduction

Kubernetes Network Policies control traffic flow between pods, namespaces, and external endpoints at the network layer. They are fundamental to implementing a zero-trust security model in your clusters. By managing Network Policies through Flux CD, you ensure that your network security rules are version-controlled, auditable, and automatically enforced across all environments.

This guide covers creating and managing Network Policies with Flux CD, from basic isolation patterns to advanced Calico policies.

## Prerequisites

- Kubernetes cluster v1.26 or later with a CNI that supports Network Policies (Calico, Cilium, or Weave)
- Flux CD v2 installed and bootstrapped
- kubectl access to the cluster

## Repository Structure

```yaml
# Organize network policies by scope
# infrastructure/
#   network-policies/
#     base/
#       default-deny.yaml
#       dns-egress.yaml
#     namespaces/
#       production/
#       staging/
#     calico/
#       global-policies.yaml
```

## Flux Kustomization for Network Policies

```yaml
# clusters/my-cluster/network-policies.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: network-policies
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/network-policies/production
  prune: true
  wait: true
  # Apply network policies before deploying applications
  dependsOn:
    - name: namespaces
```

## Default Deny All Traffic

The foundation of zero-trust networking -- deny all traffic by default:

```yaml
# infrastructure/network-policies/base/default-deny.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
    policy-type: baseline
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  # No ingress or egress rules means all traffic is denied
```

## Allow DNS Egress

After denying all traffic, allow DNS resolution which is needed by nearly every pod:

```yaml
# infrastructure/network-policies/base/allow-dns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS queries to kube-dns/CoreDNS
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

## Frontend to Backend Communication

Allow the frontend to communicate with the API:

```yaml
# infrastructure/network-policies/namespaces/production/frontend-policy.yaml
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
    # Allow traffic to API server pods
    - to:
        - podSelector:
            matchLabels:
              app: api-server
      ports:
        - protocol: TCP
          port: 8080
```

```yaml
# infrastructure/network-policies/namespaces/production/api-server-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-server-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
    - Ingress
  ingress:
    # Accept traffic from frontend pods
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
    # Accept traffic from ingress controller namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
```

## Database Access Policy

Restrict database access to only authorized services:

```yaml
# infrastructure/network-policies/namespaces/production/database-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgresql
  policyTypes:
    - Ingress
  ingress:
    # Only allow API server and migration jobs to access the database
    - from:
        - podSelector:
            matchLabels:
              app: api-server
        - podSelector:
            matchLabels:
              app: migration-job
      ports:
        - protocol: TCP
          port: 5432
```

## Cross-Namespace Communication

Allow a monitoring namespace to scrape metrics:

```yaml
# infrastructure/network-policies/namespaces/production/allow-monitoring.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scraping
  namespace: production
spec:
  podSelector:
    matchLabels:
      # All pods with metrics enabled
      prometheus.io/scrape: "true"
  policyTypes:
    - Ingress
  ingress:
    # Allow Prometheus from the monitoring namespace
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

## Egress to External Services

Allow specific pods to reach external APIs:

```yaml
# infrastructure/network-policies/namespaces/production/external-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Egress
  egress:
    # Allow HTTPS egress to payment gateway IP ranges
    - to:
        - ipBlock:
            cidr: 203.0.113.0/24
      ports:
        - protocol: TCP
          port: 443
    # Allow DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

## Calico GlobalNetworkPolicy

For cluster-wide policies using Calico:

```yaml
# infrastructure/network-policies/calico/global-deny.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny
spec:
  # Apply to all non-system namespaces
  namespaceSelector: >
    kubernetes.io/metadata.name != "kube-system" &&
    kubernetes.io/metadata.name != "flux-system" &&
    kubernetes.io/metadata.name != "calico-system"
  types:
    - Ingress
    - Egress
```

```yaml
# infrastructure/network-policies/calico/allow-dns-global.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
spec:
  # Higher order number means lower priority
  order: 100
  namespaceSelector: has(kubernetes.io/metadata.name)
  types:
    - Egress
  egress:
    - action: Allow
      protocol: UDP
      destination:
        selector: k8s-app == "kube-dns"
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        selector: k8s-app == "kube-dns"
        ports:
          - 53
```

## Calico Network Policy with Application Layer Rules

```yaml
# infrastructure/network-policies/calico/http-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: api-http-methods
  namespace: production
spec:
  selector: app == "api-server"
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == "frontend"
      destination:
        ports:
          - 8080
      http:
        # Only allow specific HTTP methods
        methods:
          - GET
          - POST
          - PUT
        paths:
          - prefix: /api/
```

## Environment-Specific Overlays

```yaml
# infrastructure/network-policies/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - default-deny.yaml
  - allow-dns.yaml
```

```yaml
# infrastructure/network-policies/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
  - frontend-policy.yaml
  - api-server-policy.yaml
  - database-policy.yaml
  - allow-monitoring.yaml
  - external-egress.yaml
```

```yaml
# infrastructure/network-policies/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
  - frontend-policy.yaml
  - api-server-policy.yaml
  # Staging uses a shared database, different policy
  - staging-database-policy.yaml
```

## Notifications for Policy Changes

```yaml
# clusters/my-cluster/netpol-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: network-policy-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: network-policies
      namespace: flux-system
  summary: "Network policy change detected"
```

## Testing Network Policies

Verify your policies are working correctly:

```bash
# List all network policies
kubectl get networkpolicy --all-namespaces

# Describe a specific policy
kubectl describe networkpolicy api-server-ingress -n production

# Test connectivity from frontend to api-server (should succeed)
kubectl exec -n production deploy/frontend -- wget -qO- --timeout=5 http://api-server:8080/healthz

# Test connectivity from unauthorized pod (should fail)
kubectl exec -n production deploy/worker -- wget -qO- --timeout=5 http://postgresql:5432

# Verify Flux reconciliation
flux get kustomizations network-policies
```

## Best Practices

1. Always start with a default-deny policy in every namespace
2. Explicitly allow DNS egress since most applications need name resolution
3. Use label selectors instead of IP addresses whenever possible
4. Allow monitoring traffic so Prometheus can scrape metrics from all pods
5. Test policies in staging before applying to production
6. Use Calico GlobalNetworkPolicies for cluster-wide baseline rules
7. Document the purpose of each policy in metadata annotations
8. Review and audit network policies regularly as services evolve

## Conclusion

Managing Network Policies through Flux CD provides automated, version-controlled enforcement of network security rules. By adopting a default-deny approach and explicitly allowing only required traffic, you implement a zero-trust security model that is consistently applied across environments. Flux CD ensures that network policy changes go through your standard GitOps review process, providing an audit trail for all security-related changes.
