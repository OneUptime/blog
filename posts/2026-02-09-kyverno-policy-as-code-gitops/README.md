# How to Implement Kyverno Policy as Code in GitOps Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, GitOps, Policy as Code, ArgoCD, FluxCD

Description: Learn how to manage Kyverno policies as code in Git repositories, integrate with GitOps tools like ArgoCD and FluxCD, implement approval workflows for policy changes, and automate policy deployment across environments.

---

Managing Kyverno policies as code in Git repositories enables version control, code review, and automated deployment through GitOps. Policies become infrastructure as code, with the same rigor as application deployments. This guide shows you how to structure policy repositories, integrate with GitOps tools, and implement safe policy rollout processes.

## Repository Structure

Organize policies in a Git repository:

```
kyverno-policies/
├── base/
│   ├── kustomization.yaml
│   ├── validation/
│   │   ├── require-labels.yaml
│   │   ├── require-resource-limits.yaml
│   │   └── restrict-image-registries.yaml
│   ├── mutation/
│   │   ├── add-default-labels.yaml
│   │   ├── inject-security-context.yaml
│   │   └── add-resource-limits.yaml
│   └── generation/
│       ├── add-networkpolicy.yaml
│       ├── add-resourcequota.yaml
│       └── clone-registry-secret.yaml
├── overlays/
│   ├── development/
│   │   ├── kustomization.yaml
│   │   └── policy-exceptions.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── policy-exceptions.yaml
│   └── production/
│       ├── kustomization.yaml
│       └── policy-exceptions.yaml
├── tests/
│   └── policy-tests.yaml
└── README.md
```

## Base Policies with Kustomize

Create base policies:

```yaml
# base/validation/require-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    policies.kyverno.io/category: Best Practices
spec:
  validationFailureAction: Audit  # Default to audit
  background: true
  rules:
    - name: check-team-label
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Pod must have 'team' label"
        pattern:
          metadata:
            labels:
              team: "?*"
```

Create kustomization:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - validation/require-labels.yaml
  - validation/require-resource-limits.yaml
  - validation/restrict-image-registries.yaml
  - mutation/add-default-labels.yaml
  - mutation/inject-security-context.yaml
  - generation/add-networkpolicy.yaml

commonLabels:
  managed-by: kustomize
  policy-source: gitops
```

## Environment-Specific Overlays

Create production overlay with enforcement:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

patchesStrategicMerge:
  - enforce-policies.yaml

resources:
  - policy-exceptions.yaml

namespace: kyverno
```

Enforce policies in production:

```yaml
# overlays/production/enforce-policies.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  validationFailureAction: Enforce  # Override to Enforce

---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
```

Development overlay remains in audit:

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

# Keep default Audit mode for development
namespace: kyverno
```

## ArgoCD Integration

Create ArgoCD application for policy management:

```yaml
# argocd/kyverno-policies-prod.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno-policies-production
  namespace: argocd
spec:
  project: security
  source:
    repoURL: https://github.com/company/kyverno-policies
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: kyverno
  syncPolicy:
    automated:
      prune: true
      selfHeal: false  # Require manual sync for policy changes
    syncOptions:
      - CreateNamespace=false
      - ServerSideApply=true
  ignoreDifferences:
    - group: kyverno.io
      kind: ClusterPolicy
      jsonPointers:
        - /status
```

Create applications for all environments:

```yaml
# argocd/kyverno-policies-all.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: kyverno-policies
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: development
            cluster: dev-cluster
            autoSync: true
          - env: staging
            cluster: staging-cluster
            autoSync: true
          - env: production
            cluster: prod-cluster
            autoSync: false  # Manual sync for production
  template:
    metadata:
      name: kyverno-policies-{{env}}
    spec:
      project: security
      source:
        repoURL: https://github.com/company/kyverno-policies
        targetRevision: main
        path: overlays/{{env}}
      destination:
        server: "{{cluster}}"
        namespace: kyverno
      syncPolicy:
        automated:
          prune: true
          selfHeal: "{{autoSync}}"
```

## FluxCD Integration

Create Flux Kustomization:

```yaml
# flux/kyverno-policies.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: kyverno-policies
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/company/kyverno-policies
  ref:
    branch: main

---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kyverno-policies-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: kyverno-policies
  healthChecks:
    - apiVersion: kyverno.io/v1
      kind: ClusterPolicy
      name: require-labels
  validation: client  # Validate before applying
  wait: true
  timeout: 5m
```

## Policy Approval Workflow

Implement pull request workflow:

```yaml
# .github/workflows/policy-pr.yml
name: Policy Pull Request

on:
  pull_request:
    paths:
      - 'base/**'
      - 'overlays/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Validate policies
        run: |
          # Install kyverno CLI
          curl -LO https://github.com/kyverno/kyverno/releases/download/v1.11.0/kyverno-cli_v1.11.0_linux_x86_64.tar.gz
          tar -xzf kyverno-cli_v1.11.0_linux_x86_64.tar.gz
          sudo mv kyverno /usr/local/bin/

          # Validate all policies
          kyverno validate base/validation/*.yaml
          kyverno validate base/mutation/*.yaml

      - name: Test policies
        run: |
          # Run policy tests
          kyverno test tests/

      - name: Check for breaking changes
        run: |
          # Compare with main branch
          git fetch origin main
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD | grep -E '(base|overlays)')

          echo "Changed policy files:"
          echo "$CHANGED_FILES"

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Policy validation completed. Please have a security team member review before merging.'
            })
```

## Progressive Rollout

Implement canary deployment for policies:

```yaml
# overlays/production/progressive-rollout.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-security-context
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Deploy first
spec:
  validationFailureAction: Audit  # Start in audit mode
  background: true
  rules:
    - name: check-security-context
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - canary-*  # Only apply to canary namespaces initially
      validate:
        message: "Security context required"
        pattern:
          spec:
            containers:
              - securityContext:
                  runAsNonRoot: true
```

After validation, expand scope:

```yaml
# After 1 week, expand to all namespaces
rules:
  - name: check-security-context
    match:
      any:
        - resources:
            kinds:
              - Pod
            namespaces:
              - "*"
```

After more validation, enforce:

```yaml
# After 2 weeks, enforce
spec:
  validationFailureAction: Enforce
```

## Monitoring Policy Changes

Track policy drift with ArgoCD notifications:

```yaml
# argocd-notifications.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-policy-changed: |
    - when: app.status.sync.status == 'OutOfSync' && app.metadata.labels.type == 'policy'
      send: [policy-out-of-sync]

  template.policy-out-of-sync: |
    message: |
      Policy application {{.app.metadata.name}} is out of sync.
      Manual review required before sync.
    slack:
      attachments: |
        [{
          "title": "Policy Out of Sync",
          "color": "warning",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Environment", "value": "{{.app.spec.destination.name}}", "short": true}
          ]
        }]
```

## Backup and Recovery

Create policy backups:

```bash
#!/bin/bash
# backup-policies.sh

BACKUP_DIR="backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup all Kyverno policies
kubectl get clusterpolicies -o yaml > "$BACKUP_DIR/clusterpolicies.yaml"
kubectl get policies -A -o yaml > "$BACKUP_DIR/policies.yaml"
kubectl get policyexceptions -A -o yaml > "$BACKUP_DIR/exceptions.yaml"

# Commit to backup repository
git add "$BACKUP_DIR"
git commit -m "Backup policies $(date +%Y-%m-%d)"
git push
```

## Conclusion

Implementing Kyverno policies as code with GitOps provides version control, code review, and safe deployment workflows. Structure policies in Git with base configurations and environment-specific overlays, integrate with ArgoCD or FluxCD for automated deployment, and implement approval workflows through pull requests. Use progressive rollout to test policies in canary environments before cluster-wide enforcement, monitor policy changes with notifications, and maintain backups for disaster recovery.

Policy as code treats governance rules with the same rigor as application code, enabling safe evolution of security controls alongside infrastructure.
