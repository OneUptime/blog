# How to Deploy NetworkPolicies with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, NetworkPolicies, Security

Description: Learn how to deploy and manage Kubernetes NetworkPolicies with ArgoCD for micro-segmentation, zero-trust networking, and GitOps-driven network security enforcement.

---

NetworkPolicies are Kubernetes resources that control traffic flow between pods, namespaces, and external endpoints. They are the built-in way to implement micro-segmentation and zero-trust networking. Managing NetworkPolicies through ArgoCD means your network security rules are version-controlled, auditable, and consistently applied across environments.

## Why GitOps for NetworkPolicies

Network security rules are critical infrastructure. Without GitOps, network policies are often:

- Applied manually with `kubectl apply` and forgotten
- Inconsistent between environments
- Difficult to audit or review
- Easy to accidentally delete

With ArgoCD managing your NetworkPolicies, every change goes through code review, you have a complete audit trail in Git history, and ArgoCD's self-heal ensures policies are always enforced.

## NetworkPolicy Fundamentals

By default, Kubernetes allows all traffic between pods. NetworkPolicies are additive - they define what is allowed. Once you create a NetworkPolicy that selects a pod, all other traffic to that pod is denied unless explicitly allowed.

Important prerequisites:

- Your cluster must have a CNI plugin that supports NetworkPolicies (Calico, Cilium, Weave Net)
- The default kubenet does not support NetworkPolicies
- GKE, EKS, and AKS all support NetworkPolicies with their respective CNI plugins

## Default Deny Policy

Start with a default deny policy for each namespace. This is the foundation of zero-trust networking:

```yaml
# apps/security/default-deny.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "-5"  # Apply before other resources
spec:
  podSelector: {}  # Selects all pods in the namespace
  policyTypes:
    - Ingress
    - Egress
```

This blocks all traffic to and from every pod in the namespace. Then you add specific policies to allow required traffic.

## Common NetworkPolicy Patterns

### Allow Internal Application Communication

```yaml
# Allow frontend to talk to backend
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
---
# Allow backend to talk to database
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

### Allow DNS Egress

Pods need DNS resolution. Always allow egress to kube-dns:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}  # All pods
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

### Allow Ingress Controller Traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
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
          port: 8080
```

### Cross-Namespace Communication

```yaml
# Allow monitoring namespace to scrape metrics from production
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector: {}  # All pods expose metrics
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

## ArgoCD Application for NetworkPolicies

Group your NetworkPolicies in a dedicated ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: network-policies
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: security/network-policies
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true      # Remove policies that are no longer in Git
      selfHeal: true    # Revert manual changes immediately
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

Enabling `selfHeal` is particularly important for NetworkPolicies. If someone manually deletes a policy to "debug" connectivity issues, ArgoCD restores it immediately.

## Directory Structure for Network Security

Organize policies by namespace and application:

```
security/
  network-policies/
    production/
      default-deny.yaml
      allow-dns.yaml
      allow-ingress.yaml
      frontend-to-backend.yaml
      backend-to-database.yaml
      backend-to-cache.yaml
    staging/
      default-deny.yaml
      allow-dns.yaml
      allow-all-internal.yaml   # More permissive for testing
    monitoring/
      allow-scrape-all.yaml
      allow-grafana-to-prometheus.yaml
    kustomization.yaml
```

## Sync Waves for NetworkPolicies

NetworkPolicies should be created early in the sync process, before the pods they protect:

```yaml
# Wave -5: Default deny (lock everything down)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  annotations:
    argocd.argoproj.io/sync-wave: "-5"

---
# Wave -4: Allow DNS (pods need this to start)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  annotations:
    argocd.argoproj.io/sync-wave: "-4"

---
# Wave -3: Application-specific policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  annotations:
    argocd.argoproj.io/sync-wave: "-3"

---
# Wave 0: Application deployments
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

## Using Kustomize for Environment-Specific Policies

Different environments need different levels of network restriction:

```yaml
# base/kustomization.yaml
resources:
  - default-deny.yaml
  - allow-dns.yaml

# overlays/production/kustomization.yaml
resources:
  - ../../base
  - strict-egress.yaml
  - app-specific-policies.yaml

# overlays/staging/kustomization.yaml
resources:
  - ../../base
patches:
  # Allow broader access in staging for debugging
  - target:
      kind: NetworkPolicy
      name: default-deny-all
    patch: |
      - op: replace
        path: /spec/policyTypes
        value:
          - Ingress
          # No egress restriction in staging
```

## Validating NetworkPolicies Before Sync

Use a PreSync hook to validate that your NetworkPolicies will not break connectivity:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: network-policy-validation
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validator
          image: controlplane/netassert:latest
          command: [sh, -c]
          args:
            - |
              # Test that critical paths will remain open
              netassert test \
                --from frontend \
                --to backend:8080 \
                --expect allow

              netassert test \
                --from backend \
                --to database:5432 \
                --expect allow

              echo "Network policy validation passed"
      restartPolicy: Never
```

## Monitoring NetworkPolicy Effectiveness

Track which policies are active and how they affect traffic:

```yaml
# Deploy a network policy logging sidecar
# (Works with Calico or Cilium)
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-config
  namespace: kube-system
data:
  # Enable logging for denied traffic
  calicoNetwork: |
    logSeverityScreen: Info
    logSeverityFile: Warning
```

With Cilium, you can use Hubble for NetworkPolicy observability:

```bash
# View traffic flows and policy decisions
hubble observe --namespace production --verdict DROPPED
```

## Troubleshooting NetworkPolicy Issues

When pods cannot communicate after applying NetworkPolicies, check these common issues:

```bash
# List all policies affecting a pod
kubectl get networkpolicy -n production

# Describe a specific policy
kubectl describe networkpolicy allow-frontend-to-backend -n production

# Check if your CNI supports NetworkPolicies
kubectl get pods -n kube-system -l k8s-app=calico-node
```

Common mistakes:

1. Forgetting to allow DNS egress (pods cannot resolve service names)
2. Using wrong label selectors (check pod labels match policy selectors)
3. Missing namespace selectors for cross-namespace traffic
4. Not specifying ports (empty ports means all ports when combined with a from/to rule)

## Summary

NetworkPolicies managed through ArgoCD give you version-controlled, auditable, self-healing network security. Start with default deny policies, add specific allow rules for each communication path, and use sync waves to ensure policies are in place before pods start. The combination of GitOps review processes and ArgoCD's self-heal makes it very difficult for network security to drift from your intended configuration. This approach implements zero-trust networking where every allowed communication path is explicitly declared in Git.
