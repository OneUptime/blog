# How to Deploy Kyverno with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kyverno, Security

Description: Learn how to deploy Kyverno policy engine using ArgoCD for GitOps-managed Kubernetes policy enforcement, mutation, validation, and generation.

---

Kyverno is a Kubernetes-native policy engine that lets you validate, mutate, and generate Kubernetes resources using policies written in YAML. Unlike OPA/Gatekeeper which requires learning Rego, Kyverno policies are written in a familiar Kubernetes resource format. Deploying Kyverno with ArgoCD creates a powerful combination where security policies are managed through Git with full audit trails and automated deployment.

This guide covers deploying Kyverno using ArgoCD, writing and managing policies as code, and handling the common challenges that arise when these two tools interact.

## Why Kyverno with ArgoCD

The combination is natural because:

- Both are Kubernetes-native and use YAML
- Policies become versioned resources in Git
- Policy changes go through pull request reviews
- ArgoCD ensures policies are always deployed across clusters
- Drift detection catches manual policy modifications

## Repository Structure

```text
security/
  kyverno/
    Chart.yaml
    values.yaml
  kyverno-policies/
    baseline/
      disallow-privileged.yaml
      require-labels.yaml
      restrict-host-namespaces.yaml
    restricted/
      require-non-root.yaml
      drop-all-capabilities.yaml
    generation/
      default-network-policy.yaml
      default-resource-quota.yaml
```

## Deploying Kyverno

### Wrapper Chart

```yaml
# security/kyverno/Chart.yaml
apiVersion: v2
name: kyverno
description: Wrapper chart for Kyverno policy engine
type: application
version: 1.0.0
dependencies:
  - name: kyverno
    version: "3.3.1"
    repository: "https://kyverno.github.io/kyverno"
```

### Kyverno Values

```yaml
# security/kyverno/values.yaml
kyverno:
  # Admission controller configuration
  admissionController:
    replicas: 3
    resources:
      requests:
        cpu: 250m
        memory: 384Mi
      limits:
        memory: 768Mi

    # Failure policy - what happens when Kyverno is unavailable
    # "Fail" blocks all requests, "Ignore" allows them through
    container:
      args:
        # Start with Ignore for safety, switch to Fail once stable
        - --webhookFailurePolicy=Ignore

  # Background controller for generate and mutate existing
  backgroundController:
    replicas: 2
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        memory: 256Mi

  # Cleanup controller for policy report cleanup
  cleanupController:
    replicas: 1
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        memory: 256Mi

  # Reports controller
  reportsController:
    replicas: 1
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        memory: 256Mi

  # Exclude namespaces from policy enforcement
  config:
    webhooks:
      - objectSelector:
          matchExpressions:
            - key: kyverno.io/managed-by
              operator: DoesNotExist
    excludeGroups:
      - system:serviceaccounts:kyverno
      - system:serviceaccounts:argocd
    resourceFilters:
      - '[Event,*,*]'
      - '[*,kube-system,*]'
      - '[*,kube-public,*]'
      - '[*,kube-node-lease,*]'
      - '[*,argocd,*]'

  # Install policy reporter for Grafana integration
  features:
    policyExceptions:
      enabled: true
      namespace: "kyverno"
    reporting:
      validatingAdmissionPolicyReports:
        enabled: false

  # CRDs
  crds:
    install: true

  # ServiceMonitor
  serviceMonitor:
    enabled: true
    additionalLabels:
      release: kube-prometheus-stack
```

### ArgoCD Application for Kyverno

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: security
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: security/kyverno
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: kyverno
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ignoreDifferences:
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
        - '.webhooks[]?.rules'
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
        - '.webhooks[]?.rules'
```

## Deploying Policies

### Baseline Policies

These policies enforce minimum security standards.

```yaml
# security/kyverno-policies/baseline/disallow-privileged.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
  annotations:
    policies.kyverno.io/title: Disallow Privileged Containers
    policies.kyverno.io/category: Pod Security Standards (Baseline)
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Privileged containers can access all Linux capabilities and devices.
      This policy ensures containers cannot run in privileged mode.
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: privileged-containers
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - security
      validate:
        message: "Privileged mode is not allowed. Set securityContext.privileged to false."
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: "false"
            =(initContainers):
              - securityContext:
                  privileged: "false"
            =(ephemeralContainers):
              - securityContext:
                  privileged: "false"
```

```yaml
# security/kyverno-policies/baseline/require-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    policies.kyverno.io/title: Require Labels
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: require-team-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      validate:
        message: "The label 'team' is required."
        pattern:
          metadata:
            labels:
              team: "?*"
    - name: require-app-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      validate:
        message: "The label 'app.kubernetes.io/name' is required."
        pattern:
          metadata:
            labels:
              app.kubernetes.io/name: "?*"
```

### Generate Policies

Kyverno can automatically generate resources when others are created.

```yaml
# security/kyverno-policies/generation/default-network-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-network-policy
  annotations:
    policies.kyverno.io/title: Generate Default Network Policy
    policies.kyverno.io/category: Security
    policies.kyverno.io/description: >-
      Generates a default deny-all NetworkPolicy for every new namespace.
spec:
  rules:
    - name: default-deny-ingress
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
                - argocd
                - kyverno
      generate:
        synchronize: true
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny-ingress
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
```

### ArgoCD Application for Policies

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno-policies
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: security
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: security/kyverno-policies
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Handling Kyverno and ArgoCD Interactions

A common issue is that Kyverno's mutating webhook modifies resources that ArgoCD deploys, causing ArgoCD to detect drift. For example, if Kyverno adds default labels, ArgoCD sees the resource as out of sync.

There are two solutions:

1. Use `ignoreDifferences` in your ArgoCD Applications for fields Kyverno mutates
2. Apply Kyverno mutations in Audit mode first, then update your Git manifests to include the expected mutations before switching to Enforce

```yaml
# In ArgoCD Application
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - '.metadata.labels."injected-by-kyverno"'
```

## Verifying the Deployment

```bash
# Check Kyverno pods
kubectl get pods -n kyverno

# List all policies
kubectl get clusterpolicies

# Check policy reports
kubectl get policyreports -A
kubectl get clusterpolicyreports

# Test a policy violation
kubectl run test --image=nginx --privileged=true
# Should be blocked by disallow-privileged-containers policy

# Check ArgoCD sync status
argocd app get kyverno
argocd app get kyverno-policies
```

## Summary

Deploying Kyverno with ArgoCD creates a GitOps-managed policy enforcement layer for your Kubernetes clusters. Policies are versioned in Git, reviewed through pull requests, and automatically deployed by ArgoCD. The key considerations are managing webhook configurations in `ignoreDifferences`, properly excluding system namespaces, and handling the interaction between Kyverno mutations and ArgoCD drift detection. Start with policies in Audit mode, review the reports, and gradually move to Enforce mode as you gain confidence.
