# How to Enforce Resource Standards with Admission Webhooks and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Admission Webhooks, Kyverno, Resource Standards, Governance

Description: Combine Kubernetes admission webhooks with Flux CD to enforce resource standards - labeling requirements, security contexts, and naming conventions - for all resources entering your cluster.

---

## Introduction

Admission webhooks intercept Kubernetes API requests before resources are persisted to etcd, allowing you to validate or mutate them based on custom logic. Combined with Flux CD, admission webhooks create an enforceable policy layer: even if a misconfigured manifest passes code review and is committed to Git, the admission webhook prevents it from entering the cluster.

Kyverno is a Kubernetes-native policy engine that uses admission webhooks and stores policies as Custom Resources - making it perfectly suited for GitOps management by Flux. Unlike OPA Gatekeeper (which uses Rego), Kyverno policies are written in YAML, making them more accessible to engineers who work primarily with Kubernetes manifests.

This guide covers installing Kyverno via Flux, defining resource standards as Kyverno policies, and validating them in CI before they reach the cluster.

## Prerequisites

- Flux CD bootstrapped on a Kubernetes cluster
- `flux` CLI and `kubectl` installed
- Admin access for Kyverno installation
- Understanding of your organization's resource standards (labels, limits, naming)

## Step 1: Install Kyverno via Flux HelmRelease

```yaml
# infrastructure/controllers/kyverno.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 24h
  url: https://kyverno.github.io/kyverno/
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kyverno
  namespace: kyverno
spec:
  interval: 10m
  chart:
    spec:
      chart: kyverno
      version: ">=3.1.0"
      sourceRef:
        kind: HelmRepository
        name: kyverno
        namespace: flux-system
  values:
    replicaCount: 2      # HA for production
    admissionController:
      replicas: 2
    backgroundController:
      replicas: 1
    cleanupController:
      replicas: 1
    reportsController:
      replicas: 1
```

## Step 2: Define Required Label Standards

Enforce consistent labeling so resources are always discoverable and cost-attributable:

```yaml
# infrastructure/policies/kyverno/require-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-standard-labels
  annotations:
    policies.kyverno.io/title: Required Standard Labels
    policies.kyverno.io/description: >
      All Deployments and StatefulSets must include standard labels for
      cost attribution, ownership tracking, and operational dashboards.
spec:
  validationFailureAction: enforce
  background: true
  rules:
    - name: require-app-labels
      match:
        any:
          - resources:
              kinds: ["Deployment", "StatefulSet"]
              namespaces: ["production", "staging"]
      validate:
        message: "Resources must include labels: app, team, version, and cost-center"
        pattern:
          metadata:
            labels:
              app: "?*"             # Required: application name
              team: "?*"           # Required: owning team
              version: "?*"        # Required: application version
              cost-center: "?*"    # Required: for cost attribution
```

## Step 3: Enforce Container Security Standards

```yaml
# infrastructure/policies/kyverno/container-security.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: container-security-standards
  annotations:
    policies.kyverno.io/title: Container Security Standards
spec:
  validationFailureAction: enforce
  background: true
  rules:
    - name: require-non-root
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaces: ["production"]
      validate:
        message: "Containers must not run as root"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true

    - name: disallow-privilege-escalation
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaces: ["production"]
      validate:
        message: "Containers must not allow privilege escalation"
        pattern:
          spec:
            containers:
              - securityContext:
                  allowPrivilegeEscalation: false

    - name: require-read-only-root-fs
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaces: ["production"]
      validate:
        message: "Containers must use a read-only root filesystem"
        pattern:
          spec:
            containers:
              - securityContext:
                  readOnlyRootFilesystem: true
```

## Step 4: Mutate Resources to Add Missing Labels (Auto-Remediation)

Kyverno can also mutate resources - automatically adding missing metadata rather than rejecting:

```yaml
# infrastructure/policies/kyverno/add-default-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-flux-managed-label
  annotations:
    policies.kyverno.io/title: Add Flux Managed Label
spec:
  rules:
    - name: add-managed-by-flux
      match:
        any:
          - resources:
              kinds: ["Deployment", "StatefulSet", "DaemonSet"]
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              # Automatically label all Flux-reconciled resources
              managed-by: flux
              reconciled-at: "{{request.object.metadata.annotations.\"reconcile.fluxcd.io/requestedAt\"}}"
```

## Step 5: Enforce Naming Conventions

```yaml
# infrastructure/policies/kyverno/naming-conventions.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-naming-conventions
spec:
  validationFailureAction: enforce
  background: true
  rules:
    - name: deployment-name-pattern
      match:
        any:
          - resources:
              kinds: ["Deployment"]
              namespaces: ["production", "staging"]
      validate:
        message: "Deployment names must match pattern: <team>-<service>-<suffix>"
        deny:
          conditions:
            all:
              # Deny if the name does not match the pattern team-service[-anything]
              - key: "{{request.object.metadata.name}}"
                operator: NotMatch
                value: "^[a-z][a-z0-9-]+-[a-z][a-z0-9-]+$"
```

## Step 6: Manage Kyverno Policies via Flux

```yaml
# clusters/production/policies/kyverno-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kyverno-policies
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/policies/kyverno
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: kyverno          # Policies require Kyverno to be installed first
  healthChecks:
    - apiVersion: kyverno.io/v1
      kind: ClusterPolicy
      name: require-standard-labels
    - apiVersion: kyverno.io/v1
      kind: ClusterPolicy
      name: container-security-standards
```

## Step 7: Validate Policies in CI

Test manifests against Kyverno policies before they reach the cluster:

```yaml
# .github/workflows/kyverno-test.yaml
name: Kyverno Policy Test

on:
  pull_request:
    branches: [main]

jobs:
  kyverno-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Kyverno CLI
        run: |
          curl -sL https://github.com/kyverno/kyverno/releases/latest/download/kyverno-cli_linux_x86_64.tar.gz \
            | tar xz && sudo mv kyverno /usr/local/bin/

      - name: Test policies with unit tests
        run: |
          # Run Kyverno policy unit tests defined in kyverno/tests/
          kyverno test infrastructure/policies/kyverno/

      - name: Apply policies to changed manifests
        run: |
          # Get the list of changed app manifests
          CHANGED=$(git diff --name-only origin/main...HEAD | grep '^apps/' | grep '\.yaml$')

          if [ -n "$CHANGED" ]; then
            # Apply all policies to the changed manifests
            kyverno apply \
              infrastructure/policies/kyverno/ \
              --resource $CHANGED \
              --detailed-results
          fi
```

## Best Practices

- Deploy Kyverno with 2+ replicas in production to prevent a single point of failure in the admission webhook path - a Kyverno outage can block all new resource creation.
- Start new policies in `Audit` mode (set `validationFailureAction: audit`) to see what would be rejected before switching to `enforce`.
- Create a policy exemption process: add an `exclude` block in the policy for specific namespaces or resources that have legitimate exceptions, and require a PR with security team approval to add exemptions.
- Write Kyverno unit tests (`kyverno test`) for every policy and include them in CI to catch policy regressions early.
- Use Kyverno's `PolicyReport` resources to view current violations across namespaces without querying events.

## Conclusion

Admission webhooks with Kyverno and Flux CD create a defense-in-depth approach to resource standards enforcement. Even if a non-compliant manifest passes code review and is committed to Git, Kyverno rejects it at the API server before Flux can apply it. By managing Kyverno policies through Flux, the policies themselves are subject to the same GitOps review and approval process as application manifests - creating a governance layer that is auditable, consistent, and continuously enforced across your entire cluster.
