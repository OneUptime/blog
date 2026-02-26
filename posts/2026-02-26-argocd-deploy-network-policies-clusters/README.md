# How to Deploy Network Policies Across Clusters with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Network Policies, Security

Description: Learn how to deploy and manage Kubernetes NetworkPolicy resources across multiple clusters using ArgoCD for consistent network segmentation and zero-trust security.

---

Network Policies are Kubernetes' built-in mechanism for controlling pod-to-pod communication. They implement network segmentation at the cluster level, allowing you to define which pods can talk to which other pods. In a multi-cluster setup, maintaining consistent network policies is critical for security but challenging to manage manually.

ArgoCD solves this by deploying NetworkPolicy resources from Git across all your clusters, ensuring consistent security posture everywhere.

## Why GitOps for Network Policies

Network policies directly impact security and availability:

- **A missing policy** can leave services exposed to unauthorized access
- **A misconfigured policy** can block legitimate traffic and cause outages
- **Inconsistent policies across clusters** create security gaps

With ArgoCD:
- Policies are reviewed in PRs before deployment
- Every cluster gets the same policies from the same Git source
- Drift is automatically detected and corrected
- Changes are auditable through Git history

## Network Policy Fundamentals

Before deploying with ArgoCD, understand the key concepts:

```yaml
# Default deny all ingress - foundation of zero-trust
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # Applies to all pods
  policyTypes:
    - Ingress
```

```yaml
# Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-database
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
              app: api-server
      ports:
        - protocol: TCP
          port: 5432
```

## Repository Structure for Multi-Cluster Policies

Organize policies in a hierarchical structure:

```
network-policies/
  base/
    kustomization.yaml
    default-deny/
      deny-all-ingress.yaml
      deny-all-egress.yaml
    allow-system/
      allow-dns.yaml
      allow-kube-system.yaml
      allow-monitoring.yaml
    allow-common/
      allow-ingress-controller.yaml
  namespaces/
    production/
      kustomization.yaml
      api-policies.yaml
      database-policies.yaml
      cache-policies.yaml
    staging/
      kustomization.yaml
      relaxed-policies.yaml
  overlays/
    cluster-us-east/
      kustomization.yaml
    cluster-eu-west/
      kustomization.yaml
    cluster-ap-south/
      kustomization.yaml
```

## Base Policies

### Default Deny

```yaml
# base/default-deny/deny-all-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress

---
# base/default-deny/deny-all-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

### Allow Essential Traffic

```yaml
# base/allow-system/allow-dns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
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
# base/allow-system/allow-monitoring.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
spec:
  podSelector: {}
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
# base/allow-system/allow-kube-system.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-kube-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
```

## Application-Specific Policies

```yaml
# namespaces/production/api-policies.yaml
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
    - Egress
  ingress:
    # Allow traffic from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Allow traffic to database
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
    # Allow traffic to cache
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    # Allow traffic to external APIs
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

## Deploying with ApplicationSet Across Clusters

Use an ApplicationSet to deploy policies to all clusters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: network-policies
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
  template:
    metadata:
      name: "network-policies-{{name}}"
    spec:
      project: security
      source:
        repoURL: https://github.com/your-org/network-policies
        path: "overlays/{{metadata.labels.region}}"
        targetRevision: main
      destination:
        server: "{{server}}"
        namespace: production
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
        syncOptions:
          - ApplyOutOfSyncOnly=true
```

Register your clusters with appropriate labels:

```bash
# Add clusters with region labels
argocd cluster add cluster-us-east \
  --label region=cluster-us-east \
  --label environment=production

argocd cluster add cluster-eu-west \
  --label region=cluster-eu-west \
  --label environment=production

argocd cluster add cluster-ap-south \
  --label region=cluster-ap-south \
  --label environment=production
```

## Per-Namespace Policy Deployment

Deploy namespace-specific policies:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: namespace-network-policies
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - clusters:
              selector:
                matchLabels:
                  environment: production
          - list:
              elements:
                - namespace: production
                  path: namespaces/production
                - namespace: staging
                  path: namespaces/staging
  template:
    metadata:
      name: "netpol-{{name}}-{{namespace}}"
    spec:
      project: security
      source:
        repoURL: https://github.com/your-org/network-policies
        path: "{{path}}"
        targetRevision: main
      destination:
        server: "{{server}}"
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
```

## Validating Network Policies

### Pre-Sync Validation Hook

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-network-policies
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validate
          image: bitnami/kubectl:1.29
          command:
            - sh
            - -c
            - |
              # Validate all NetworkPolicy manifests
              for policy in /policies/*.yaml; do
                kubectl apply --dry-run=server -f "$policy"
                if [ $? -ne 0 ]; then
                  echo "Validation failed for $policy"
                  exit 1
                fi
              done
              echo "All network policies valid"
      restartPolicy: Never
  backoffLimit: 0
```

### Testing with Network Policy Simulator

Use tools like `netpol-analyzer` to verify policies:

```bash
# Install netpol-analyzer
go install github.com/np-guard/netpol-analyzer/cmd/npa@latest

# Analyze connectivity
npa list --dirpath ./network-policies/base/ \
  --output-format txt
```

## Monitoring Network Policy Effectiveness

Track policy enforcement with Cilium or Calico metrics:

```promql
# Packets dropped by NetworkPolicy (Calico)
sum(rate(
  calico_denied_packets_total[5m]
)) by (policy)

# Packets dropped by NetworkPolicy (Cilium)
sum(rate(
  cilium_drop_count_total{reason="POLICY_DENIED"}[5m]
)) by (direction)

# Connection attempts blocked
sum(increase(
  cilium_policy_l4_total{action="denied"}[1h]
)) by (direction)
```

## Rollback Strategy

If a network policy change causes connectivity issues:

```bash
# Quick rollback via Git
git revert HEAD
git push

# ArgoCD auto-syncs the revert
# Or use ArgoCD rollback directly
argocd app rollback network-policies-cluster-us-east
```

## Summary

Deploying network policies across clusters with ArgoCD ensures consistent security posture everywhere. Start with default-deny policies as a foundation, add allow rules for legitimate traffic patterns, and use ApplicationSets to deploy policies to all clusters from a single Git source. Pre-sync validation catches errors before they cause outages, and self-heal ensures policies cannot be manually weakened without Git approval. This approach implements zero-trust networking through GitOps principles.

For related networking patterns, see our guide on [configuring egress rules with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-configure-egress-rules/view).
