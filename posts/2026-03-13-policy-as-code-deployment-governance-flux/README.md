# How to Implement Policy-as-Code for Deployment Governance with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Policy-as-Code, OPA, Gatekeeper, Governance

Description: Use OPA Gatekeeper policies alongside Flux CD to enforce deployment governance rules that prevent non-compliant resources from ever reaching your cluster.

---

## Introduction

Policy-as-Code applies the same GitOps principles used for application configuration to governance rules. Instead of enforcing standards through manual review alone, you define policies as code, store them in Git, and apply them automatically to every resource that tries to enter your cluster.

Open Policy Agent (OPA) Gatekeeper is a Kubernetes admission controller that evaluates resources against policies defined as `ConstraintTemplate` and `Constraint` objects before allowing them to be created or modified. When combined with Flux CD, Gatekeeper policies are themselves managed by Flux - they live in Git, require PR review, and are reconciled automatically. Any resource that violates a policy is rejected at admission time, regardless of whether it came from Flux or any other source.

This guide covers installing Gatekeeper via Flux, defining governance policies, and integrating policy validation into your PR workflow.

## Prerequisites

- Flux CD bootstrapped on a Kubernetes cluster
- Admin access to the cluster for Gatekeeper installation
- `flux` CLI and `kubectl` installed
- Familiarity with Rego policy language (basic level sufficient)

## Step 1: Install OPA Gatekeeper via Flux

Manage Gatekeeper itself as a Flux HelmRelease for GitOps consistency:

```yaml
# infrastructure/controllers/gatekeeper.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gatekeeper
  namespace: flux-system
spec:
  interval: 24h
  url: https://open-policy-agent.github.io/gatekeeper/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: gatekeeper
  namespace: gatekeeper-system
spec:
  interval: 10m
  chart:
    spec:
      chart: gatekeeper
      version: ">=3.14.0"
      sourceRef:
        kind: HelmRepository
        name: gatekeeper
        namespace: flux-system
  values:
    replicas: 2
    auditInterval: 60
    constraintViolationsLimit: 100
    # Emit events for policy violations (for alerting)
    emitAdmissionEvents: true
    emitAuditEvents: true
```

## Step 2: Define Governance Policies as ConstraintTemplates

A `ConstraintTemplate` defines the policy logic in Rego. Store these in Git:

```yaml
# infrastructure/policies/templates/require-resource-limits.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requiredresourcelimits
  annotations:
    description: "Requires all containers to have CPU and memory resource limits set"
spec:
  crd:
    spec:
      names:
        kind: RequiredResourceLimits
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requiredresourcelimits

        # Violation when any container is missing resource limits
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf(
            "Container '%v' is missing CPU resource limits",
            [container.name]
          )
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf(
            "Container '%v' is missing memory resource limits",
            [container.name]
          )
        }
```

```yaml
# infrastructure/policies/templates/require-non-root.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requirenonroot
spec:
  crd:
    spec:
      names:
        kind: RequireNonRoot
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requirenonroot

        violation[{"msg": msg}] {
          # Check pod-level security context
          input.review.object.spec.securityContext.runAsNonRoot != true
          msg := "Pod must set securityContext.runAsNonRoot: true"
        }
```

## Step 3: Apply Constraints to Specific Namespaces

A `Constraint` applies a `ConstraintTemplate` to specific scopes:

```yaml
# infrastructure/policies/constraints/production-resource-limits.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequiredResourceLimits
metadata:
  name: production-must-have-limits
spec:
  # enforcement vs. dryrun: start with dryrun to assess impact
  enforcementAction: enforce
  match:
    # Apply to all Pods in namespaces labeled for production
    namespaceSelector:
      matchLabels:
        environment: production
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    exemptImages:
      - "gcr.io/gke-release/*"    # Exempt GKE system images
```

```yaml
# infrastructure/policies/constraints/non-root-policy.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireNonRoot
metadata:
  name: require-non-root-production
spec:
  enforcementAction: enforce
  match:
    namespaceSelector:
      matchLabels:
        environment: production
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

## Step 4: Manage Policies via Flux Kustomization

```yaml
# clusters/production/policies/kustomization.yaml
# Flux manages policy deployment - policies themselves go through PR review
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: policies
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/policies
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Policies depend on Gatekeeper being ready
  dependsOn:
    - name: gatekeeper
  healthChecks:
    - apiVersion: templates.gatekeeper.sh/v1
      kind: ConstraintTemplate
      name: requiredresourcelimits
    - apiVersion: templates.gatekeeper.sh/v1
      kind: ConstraintTemplate
      name: requirenonroot
```

## Step 5: Validate Policies in CI Before They Reach the Cluster

Test new policies in CI using Conftest before they are applied:

```yaml
# .github/workflows/policy-validation.yaml
name: Policy Validation

on:
  pull_request:
    branches: [main]
    paths:
      - 'infrastructure/policies/**'
      - 'apps/**'

jobs:
  validate-policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Conftest
        run: |
          curl -sL https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz \
            | tar xz && sudo mv conftest /usr/local/bin/

      - name: Test app manifests against policies
        run: |
          # Test all app manifests against the Rego policies in the repo
          conftest test \
            --policy infrastructure/policies/templates/ \
            $(find apps/ -name "*.yaml") \
            --output table

      - name: Install kube-linter for additional checks
        run: |
          curl -sL https://github.com/stackrox/kube-linter/releases/latest/download/kube-linter-linux.tar.gz \
            | tar xz && sudo mv kube-linter /usr/local/bin/

      - name: Run kube-linter
        run: |
          kube-linter lint apps/ \
            --config .kube-linter.yaml
```

## Step 6: Alert on Policy Violations

Configure alerting when Gatekeeper rejects a resource in production:

```yaml
# clusters/production/monitoring/policy-violation-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: policy-violation-alert
  namespace: flux-system
spec:
  summary: "GOVERNANCE: Gatekeeper policy violation detected"
  providerRef:
    name: slack-production
  eventSeverity: error
  eventSources:
    - kind: Kustomization
  inclusionList:
    - ".*admission webhook.*denied.*"
    - ".*constraint.*violation.*"
```

View current policy violations across the cluster:

```bash
# List all current Gatekeeper constraint violations
kubectl get constraints --all-namespaces \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.status.totalViolations} violations{"\n"}{end}'

# Detailed violations for a specific constraint
kubectl describe requiredresourcelimits production-must-have-limits
```

## Best Practices

- Start all new policies with `enforcementAction: dryrun` and run in audit mode for at least one week before switching to `enforce`. Dryrun surfaces violations in existing resources without blocking new ones.
- Store Gatekeeper `ConstraintTemplate` and `Constraint` resources in a dedicated `infrastructure/policies/` path with a separate CODEOWNERS entry requiring security team review.
- Write unit tests for your Rego policies using `opa test` and include them in CI to prevent policy regressions.
- Create an exemption process: define how teams can request a policy exemption (via a PR adding their namespace to the `exemptNamespaces` list) and require a security review for each exemption.
- Use Gatekeeper's audit mode reports to generate a weekly policy compliance dashboard showing which namespaces have outstanding violations.

## Conclusion

Policy-as-Code with OPA Gatekeeper and Flux CD creates a governance layer that is enforced at the cluster level, not just at code review. Every resource that Flux reconciles - or that any user tries to apply manually - is evaluated against your policy set before it can enter the cluster. By managing policies through the same GitOps workflow as applications, you ensure that governance rules are version-controlled, peer-reviewed, and automatically applied across your entire cluster estate.
