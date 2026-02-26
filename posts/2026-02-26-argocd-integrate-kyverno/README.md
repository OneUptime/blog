# How to Integrate ArgoCD with Kyverno for Policy Enforcement

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kyverno, Policy Enforcement

Description: Learn how to integrate ArgoCD with Kyverno to enforce Kubernetes policies, auto-generate resources, mutate configurations, and implement policy-as-code in your GitOps pipeline.

---

Kyverno is a Kubernetes-native policy engine that uses YAML for policy definitions instead of Rego. This makes it significantly more approachable for teams already comfortable with Kubernetes manifests. When integrated with ArgoCD, Kyverno policies become part of your GitOps workflow - version-controlled, automatically deployed, and continuously enforced. This guide covers the complete integration.

## Why Kyverno with ArgoCD

Kyverno stands out from OPA Gatekeeper in several ways that matter for ArgoCD integration:

- **No custom language** - Policies are YAML, the same format as everything else in your GitOps repo
- **Mutation support** - Kyverno can modify resources during admission, which affects how ArgoCD sees diffs
- **Generation support** - Kyverno can create resources when other resources are created
- **Validation, mutation, and generation** all in one tool

## Installing Kyverno with ArgoCD

Deploy Kyverno through ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://kyverno.github.io/kyverno
    chart: kyverno
    targetRevision: 3.1.0
    helm:
      values: |
        replicaCount: 3
        resources:
          limits:
            memory: 384Mi
          requests:
            cpu: 100m
            memory: 128Mi
        # Exclude ArgoCD namespace from policy enforcement
        config:
          excludeGroups:
            - system:nodes
          webhooks:
            - namespaceSelector:
                matchExpressions:
                  - key: kubernetes.io/metadata.name
                    operator: NotIn
                    values:
                      - kube-system
                      - kyverno
  destination:
    server: https://kubernetes.default.svc
    namespace: kyverno
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

## Managing Kyverno Policies in Git

Store policies in your GitOps repository and deploy them with ArgoCD:

### Validation Policies

```yaml
# Git: policies/validation/require-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    policies.kyverno.io/title: Require Labels
    policies.kyverno.io/description: >-
      All Deployments and StatefulSets must have team and environment labels.
    policies.kyverno.io/severity: medium
spec:
  validationFailureAction: Enforce  # or Audit
  background: true
  rules:
    - name: require-team-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
              namespaces:
                - production
                - staging
      validate:
        message: "The label 'team' is required."
        pattern:
          metadata:
            labels:
              team: "?*"
    - name: require-environment-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
      validate:
        message: "The label 'environment' is required."
        pattern:
          metadata:
            labels:
              environment: "production | staging | development"

---
# Git: policies/validation/no-latest-tag.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-image-tag
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      validate:
        message: "Using ':latest' tag is not allowed. Use a specific version."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - image: "!*:latest"

---
# Git: policies/validation/resource-limits.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-limits
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
      validate:
        message: "CPU and memory limits are required for all containers."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - resources:
                      limits:
                        memory: "?*"
                        cpu: "?*"
```

### Mutation Policies

Kyverno mutation policies can automatically add labels, inject sidecars, or set defaults:

```yaml
# Git: policies/mutation/add-default-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
spec:
  rules:
    - name: add-managed-by-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - Service
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              managed-by: argocd

---
# Git: policies/mutation/default-security-context.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: default-security-context
spec:
  rules:
    - name: add-run-as-non-root
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
      mutate:
        patchStrategicMerge:
          spec:
            template:
              spec:
                securityContext:
                  +(runAsNonRoot): true
                  +(seccompProfile):
                    type: RuntimeDefault
```

### Generation Policies

Kyverno can auto-generate resources when certain conditions are met:

```yaml
# Git: policies/generation/network-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-network-policy
spec:
  rules:
    - name: default-deny-ingress
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  environment: production
      generate:
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

## Handling Kyverno Mutation with ArgoCD

Mutation policies create a special challenge for ArgoCD. When Kyverno mutates a resource during admission, the live state differs from the Git state. ArgoCD sees this as drift.

### Option 1: Ignore Mutated Fields

Configure ArgoCD to ignore fields that Kyverno adds:

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      # Ignore labels added by Kyverno mutation policy
      - .metadata.labels["managed-by"]
      - .spec.template.spec.securityContext.runAsNonRoot
      - .spec.template.spec.securityContext.seccompProfile
```

### Option 2: Include Mutated Fields in Git

The better approach is to include the mutated values in your Git manifests so there is no diff:

```yaml
# Include what Kyverno would add
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    managed-by: argocd  # Already present, Kyverno won't change it
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
```

### Option 3: Use Server-Side Diff

```yaml
# argocd-cm ConfigMap
data:
  controller.diff.server.side: "true"
```

Server-side diff handles mutation webhook effects more accurately.

## ArgoCD Application for Policies

Create a dedicated ArgoCD application for your policies:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno-policies
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # After Kyverno is installed
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/my-org/platform-config.git
    targetRevision: main
    path: policies
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
```

## Custom Health Checks for Kyverno Resources

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.health.kyverno.io_ClusterPolicy: |
    hs = {}
    if obj.status ~= nil and obj.status.ready then
      hs.status = "Healthy"
      hs.message = "Policy is ready"
    else
      hs.status = "Progressing"
      hs.message = "Policy is being processed"
    end
    return hs

  resource.customizations.health.kyverno.io_Policy: |
    hs = {}
    if obj.status ~= nil and obj.status.ready then
      hs.status = "Healthy"
    else
      hs.status = "Progressing"
    end
    return hs
```

## Handling Sync Failures from Policy Violations

When Kyverno blocks a resource, ArgoCD shows a sync failure:

```bash
# Check why sync failed
argocd app get my-app

# Output includes the Kyverno violation message:
# ComparisonError: resource Deployment/my-app has validation errors:
# policy require-labels/require-team-label: validation error:
# The label 'team' is required.
```

Fix the violation in Git and sync again. The PR review process naturally becomes your policy compliance gate.

## Policy Exception for Special Cases

When certain applications need to bypass a policy:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: allow-system-without-limits
  namespace: kyverno
spec:
  exceptions:
    - policyName: require-resource-limits
      ruleNames:
        - require-limits
  match:
    any:
      - resources:
          namespaces:
            - kube-system
            - monitoring
```

## Best Practices

1. **Start with Audit mode** (`validationFailureAction: Audit`) before switching to `Enforce`.
2. **Use sync waves** to install Kyverno before policies, and policies before workloads.
3. **Separate validation from mutation** policies for clearer management.
4. **Handle mutation diffs** either by including mutated values in Git or configuring ignore rules.
5. **Use PolicyExceptions** for legitimate exemptions rather than disabling policies.
6. **Monitor policy violations** through Kyverno metrics in Prometheus.
7. **Use background scanning** (`background: true`) to audit existing resources, not just new ones.

Kyverno's YAML-native approach makes it a natural fit for GitOps with ArgoCD. Policies are written in the same language as everything else in your repository, making them accessible to the entire team. For an alternative approach using OPA, see [How to Integrate ArgoCD with OPA](https://oneuptime.com/blog/post/2026-02-26-argocd-integrate-opa/view).
