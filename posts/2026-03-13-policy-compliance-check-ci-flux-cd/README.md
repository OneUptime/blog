# How to Configure Policy Compliance Check in CI for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, OPA, Kyverno, Policy Compliance, CI/CD, GitOps, Security, Kubernetes

Description: Learn how to run OPA Conftest and Kyverno policy checks in CI pipelines to enforce governance rules before Flux CD deploys manifests to Kubernetes.

---

## Introduction

GitOps repositories are only as good as the quality of the manifests they contain. Policy compliance checks in CI enforce organizational rules—such as requiring resource limits, disallowing privileged containers, or mandating specific labels—before manifests are merged to the fleet repository. This shifts governance left, catching policy violations at PR time rather than in the cluster.

Two popular tools for this are Conftest (using OPA Rego policies) and Kyverno CLI (using Kyverno policies). Both can run in CI without a running Kubernetes cluster, evaluating rendered manifests against a policy library. Failing policies block the PR merge, ensuring Flux CD only ever reconciles compliant manifests.

This guide covers integrating both Conftest and Kyverno CLI into GitHub Actions for a Flux CD fleet repository.

## Prerequisites

- A Flux CD fleet repository with Kubernetes manifests
- GitHub Actions or another CI system
- `conftest` CLI or `kyverno` CLI installed
- A policy library (custom Rego policies or Kyverno policies)
- `kustomize` for rendering Kustomize overlays before evaluation

## Step 1: Define OPA Rego Policies with Conftest

```rego
# policy/kubernetes.rego
package main

import future.keywords.if
import future.keywords.contains

# Deny containers without resource limits
deny contains msg if {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg := sprintf("Container '%v' in Deployment '%v' must have resource limits defined", [container.name, input.metadata.name])
}

# Deny containers running as root
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
    container := input.spec.template.spec.containers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf("Container '%v' in '%v' must not run as root (runAsUser: 0)", [container.name, input.metadata.name])
}

# Deny containers without readOnlyRootFilesystem
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet"]
    container := input.spec.template.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg := sprintf("Container '%v' in '%v' should set readOnlyRootFilesystem: true", [container.name, input.metadata.name])
}

# Require specific labels
deny contains msg if {
    input.kind == "Deployment"
    required_labels := {"app", "team", "environment"}
    provided_labels := {label | input.metadata.labels[label]}
    missing := required_labels - provided_labels
    count(missing) > 0
    msg := sprintf("Deployment '%v' is missing required labels: %v", [input.metadata.name, missing])
}

# Warn on missing liveness probes
warn contains msg if {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.livenessProbe
    msg := sprintf("Container '%v' in Deployment '%v' has no liveness probe", [container.name, input.metadata.name])
}
```

## Step 2: Define Kyverno Policies for CLI Validation

```yaml
# policy/require-resource-limits.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
  annotations:
    policies.kyverno.io/title: Require Resource Limits
    policies.kyverno.io/description: All containers must define CPU and memory limits.
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-container-limits
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
      validate:
        message: "Resource limits are required for all containers."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - resources:
                      limits:
                        cpu: "?*"
                        memory: "?*"
---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-privileged
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      validate:
        message: "Privileged containers are not allowed."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - =(securityContext):
                      =(privileged): "false"
```

## Step 3: Configure GitHub Actions for Policy Validation

```yaml
# .github/workflows/policy-check.yml
name: Policy Compliance Check

on:
  pull_request:
    paths:
      - 'clusters/**'
      - 'apps/**'
      - 'infrastructure/**'

jobs:
  conftest:
    name: OPA Conftest
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install conftest
          CONFTEST_VERSION="0.50.0"
          curl -sL "https://github.com/open-policy-agent/conftest/releases/download/v${CONFTEST_VERSION}/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz" \
            | tar xz -C /usr/local/bin/

          # Install kustomize
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/

      - name: Render and test with Conftest
        run: |
          # Render each kustomization and run policy check
          find . -name 'kustomization.yaml' -not -path '*/flux-system/*' | while read kfile; do
            dir=$(dirname "$kfile")
            echo "=== Running policy check on: $dir ==="
            kustomize build "$dir" | conftest test \
              --policy policy/ \
              --namespace main \
              --all-namespaces \
              -
          done

  kyverno:
    name: Kyverno CLI
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Kyverno CLI
        run: |
          KYVERNO_VERSION="v1.11.1"
          curl -sL "https://github.com/kyverno/kyverno/releases/download/${KYVERNO_VERSION}/kyverno-cli_${KYVERNO_VERSION}_linux_x86_64.tar.gz" \
            | tar xz -C /usr/local/bin/ kyverno

      - name: Install kustomize
        run: |
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/

      - name: Apply Kyverno policies
        run: |
          find . -name 'kustomization.yaml' -not -path '*/flux-system/*' | while read kfile; do
            dir=$(dirname "$kfile")
            echo "=== Kyverno check on: $dir ==="
            kustomize build "$dir" > /tmp/rendered.yaml
            kyverno apply policy/ --resource /tmp/rendered.yaml
          done
```

## Step 4: Add Policy Results to PR Summary

```yaml
      - name: Generate policy report
        if: always()
        run: |
          echo "## Policy Compliance Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          find . -name 'kustomization.yaml' -not -path '*/flux-system/*' | while read kfile; do
            dir=$(dirname "$kfile")
            echo "### $dir" >> $GITHUB_STEP_SUMMARY
            kustomize build "$dir" | conftest test \
              --policy policy/ \
              --output table \
              - >> $GITHUB_STEP_SUMMARY 2>&1 || true
          done
```

## Step 5: Enforce Policies as Required Checks

Configure branch protection to require both `conftest` and `kyverno` jobs to pass before merging PRs to the fleet repository main branch. This ensures every merged commit has been validated against your governance policies.

## Best Practices

- Start with `warn` severity for new policies before promoting them to `deny` to avoid breaking existing resources.
- Organize policies into modules by concern (security, labeling, resource management) so teams can understand what each check enforces.
- Publish your policy library as an OCI artifact that CI can pull, allowing centralized policy management across multiple fleet repositories.
- Use `conftest pull oci://your-registry/policies:latest` to pull shared policies from a central OCI repository.
- Document every policy with a `title` and `description` annotation so PR authors understand what they need to fix.
- Test your policies themselves using Conftest's built-in test framework to prevent false positives that block legitimate PRs.

## Conclusion

Policy compliance checks in CI transform governance from a manual review burden into an automated gate. By catching resource limit omissions, security misconfigurations, and label policy violations at PR time, you ensure that Flux CD's GitOps reconciliation loop only processes manifests that meet your organization's standards.
