# How to Use Conftest with Flux CD for Policy Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Conftest, OPA, Rego, Policy Testing, Kubernetes, GitOps, Compliance

Description: Learn how to use Conftest and Open Policy Agent (OPA) Rego policies to enforce organizational standards on Flux CD manifests before deployment.

---

Conftest is an Open Policy Agent (OPA) based tool that lets you write policy tests against structured data, including Kubernetes manifests. When combined with Flux CD, Conftest enables you to enforce organizational policies on every resource before it reaches your cluster. This guide shows how to write and integrate Conftest policies for Flux CD repositories.

## Prerequisites

- Conftest CLI installed
- Basic understanding of OPA Rego policy language
- A Flux CD repository with Kubernetes manifests
- Familiarity with Kustomize and Helm

## Installing Conftest

```bash
# macOS
brew install conftest

# Linux
curl -sL https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz | \
  tar xz -C /usr/local/bin conftest

# Verify installation
conftest --version
```

## Project Structure

```text
policy/
  base/
    containers.rego
    labels.rego
    security.rego
    flux.rego
    networking.rego
  exceptions/
    exceptions.rego
clusters/
infrastructure/
apps/
```

## Policy 1: Container Best Practices

```rego
# policy/base/containers.rego
# Enforces container best practices for all Deployments

package main

# Deny containers without resource limits
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg := sprintf(
        "Deployment '%s': container '%s' must define resource limits",
        [input.metadata.name, container.name]
    )
}

# Deny containers without resource requests
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.requests
    msg := sprintf(
        "Deployment '%s': container '%s' must define resource requests",
        [input.metadata.name, container.name]
    )
}

# Deny containers using the 'latest' tag
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    endswith(container.image, ":latest")
    msg := sprintf(
        "Deployment '%s': container '%s' must not use ':latest' tag (image: %s)",
        [input.metadata.name, container.name, container.image]
    )
}

# Deny containers without image tag
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not contains(container.image, ":")
    msg := sprintf(
        "Deployment '%s': container '%s' must specify an image tag (image: %s)",
        [input.metadata.name, container.name, container.image]
    )
}

# Warn if containers lack liveness probes
warn[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.livenessProbe
    msg := sprintf(
        "Deployment '%s': container '%s' should define a livenessProbe",
        [input.metadata.name, container.name]
    )
}

# Warn if containers lack readiness probes
warn[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.readinessProbe
    msg := sprintf(
        "Deployment '%s': container '%s' should define a readinessProbe",
        [input.metadata.name, container.name]
    )
}
```

## Policy 2: Required Labels

```rego
# policy/base/labels.rego
# Enforces required labels on all resources

package main

# Required labels for all resources
required_labels := {
    "app.kubernetes.io/name",
    "app.kubernetes.io/managed-by",
}

# Deny resources missing required labels
deny[msg] {
    # Apply to namespaced resources only
    input.kind != "Namespace"
    input.kind != "CustomResourceDefinition"

    # Check for missing labels
    label := required_labels[_]
    not input.metadata.labels[label]
    msg := sprintf(
        "%s '%s': missing required label '%s'",
        [input.kind, input.metadata.name, label]
    )
}

# Deny resources without a namespace (except cluster-scoped resources)
deny[msg] {
    not cluster_scoped_resource
    not input.metadata.namespace
    msg := sprintf(
        "%s '%s': must specify a namespace",
        [input.kind, input.metadata.name]
    )
}

# Define cluster-scoped resource types
cluster_scoped_resource {
    cluster_scoped_kinds[input.kind]
}

cluster_scoped_kinds := {
    "Namespace",
    "ClusterRole",
    "ClusterRoleBinding",
    "CustomResourceDefinition",
    "PersistentVolume",
    "StorageClass",
    "IngressClass",
}
```

## Policy 3: Security Policies

```rego
# policy/base/security.rego
# Enforces security best practices

package main

# Deny containers running as root
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf(
        "Deployment '%s': container '%s' must not run as root (UID 0)",
        [input.metadata.name, container.name]
    )
}

# Deny privileged containers
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf(
        "Deployment '%s': container '%s' must not run in privileged mode",
        [input.metadata.name, container.name]
    )
}

# Deny containers with privilege escalation
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.allowPrivilegeEscalation == true
    msg := sprintf(
        "Deployment '%s': container '%s' must set allowPrivilegeEscalation to false",
        [input.metadata.name, container.name]
    )
}

# Deny Secrets that are not SOPS-encrypted
deny[msg] {
    input.kind == "Secret"
    not input.sops
    msg := sprintf(
        "Secret '%s': must be SOPS-encrypted before committing",
        [input.metadata.name]
    )
}

# Warn about using default service account
warn[msg] {
    input.kind == "Deployment"
    not input.spec.template.spec.serviceAccountName
    msg := sprintf(
        "Deployment '%s': should specify a dedicated serviceAccountName",
        [input.metadata.name]
    )
}
```

## Policy 4: Flux CD Resource Policies

```rego
# policy/base/flux.rego
# Enforces Flux CD resource best practices

package main

# Deny Kustomization without prune enabled
deny[msg] {
    input.kind == "Kustomization"
    input.apiVersion == "kustomize.toolkit.fluxcd.io/v1"
    not input.spec.prune
    msg := sprintf(
        "Kustomization '%s': must enable 'prune: true' for garbage collection",
        [input.metadata.name]
    )
}

# Deny HelmRelease without version pinning
deny[msg] {
    input.kind == "HelmRelease"
    not input.spec.chart.spec.version
    msg := sprintf(
        "HelmRelease '%s': must pin chart version",
        [input.metadata.name]
    )
}

# Deny HelmRelease with version ranges
deny[msg] {
    input.kind == "HelmRelease"
    version := input.spec.chart.spec.version
    contains(version, ">=")
    msg := sprintf(
        "HelmRelease '%s': must use exact version, not range (%s)",
        [input.metadata.name, version]
    )
}

# Warn HelmRelease without remediation
warn[msg] {
    input.kind == "HelmRelease"
    not input.spec.install.remediation
    msg := sprintf(
        "HelmRelease '%s': should configure install remediation",
        [input.metadata.name]
    )
}

# Warn HelmRelease without upgrade remediation
warn[msg] {
    input.kind == "HelmRelease"
    not input.spec.upgrade.remediation
    msg := sprintf(
        "HelmRelease '%s': should configure upgrade remediation",
        [input.metadata.name]
    )
}

# Deny Kustomization with interval less than 1 minute
deny[msg] {
    input.kind == "Kustomization"
    input.apiVersion == "kustomize.toolkit.fluxcd.io/v1"
    interval := input.spec.interval
    contains(interval, "s")
    not contains(interval, "m")
    msg := sprintf(
        "Kustomization '%s': interval must be at least 1m (got: %s)",
        [input.metadata.name, interval]
    )
}

# Deny GitRepository without interval
deny[msg] {
    input.kind == "GitRepository"
    not input.spec.interval
    msg := sprintf(
        "GitRepository '%s': must specify an interval",
        [input.metadata.name]
    )
}
```

## Policy 5: Networking Policies

```rego
# policy/base/networking.rego
# Enforces networking best practices

package main

# Deny Services of type LoadBalancer in non-production namespaces
deny[msg] {
    input.kind == "Service"
    input.spec.type == "LoadBalancer"
    not production_namespace
    msg := sprintf(
        "Service '%s': LoadBalancer type is not allowed in namespace '%s'",
        [input.metadata.name, input.metadata.namespace]
    )
}

production_namespace {
    production_namespaces[input.metadata.namespace]
}

production_namespaces := {
    "production",
    "ingress-system",
    "monitoring",
}

# Deny Ingress without TLS
deny[msg] {
    input.kind == "Ingress"
    not input.spec.tls
    msg := sprintf(
        "Ingress '%s': must configure TLS",
        [input.metadata.name]
    )
}
```

## Running Conftest Locally

### Test Individual Files

```bash
# Test a single manifest
conftest test infrastructure/base/deployment.yaml \
  --policy policy/base/

# Test with verbose output
conftest test infrastructure/base/deployment.yaml \
  --policy policy/base/ \
  --all-namespaces

# Test with custom output format
conftest test infrastructure/base/deployment.yaml \
  --policy policy/base/ \
  --output json
```

### Test Kustomize Output

```bash
# Build kustomize overlay and pipe to conftest
kustomize build infrastructure/overlays/production | \
  conftest test - --policy policy/base/
```

### Test All Overlays

```bash
#!/bin/bash
# scripts/conftest-all.sh
# Runs conftest against all rendered Kustomize overlays

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
POLICY_DIR="$REPO_ROOT/policy/base"
ERRORS=0

echo "Running Conftest policy tests..."

# Test raw manifests
echo ""
echo "--- Raw Manifests ---"
find "$REPO_ROOT" -name "*.yaml" -type f \
  -not -path "*/policy/*" \
  -not -path "*/.github/*" | \
  xargs conftest test --policy "$POLICY_DIR" --all-namespaces 2>&1 || ERRORS=$((ERRORS + 1))

# Test rendered overlays
echo ""
echo "--- Rendered Overlays ---"
find "$REPO_ROOT" -path "*/overlays/*/kustomization.yaml" | while read -r ks_file; do
  OVERLAY_DIR=$(dirname "$ks_file")
  OVERLAY_NAME=$(echo "$OVERLAY_DIR" | sed "s|$REPO_ROOT/||")

  echo ""
  echo "Testing: $OVERLAY_NAME"

  if kustomize build "$OVERLAY_DIR" | \
    conftest test - --policy "$POLICY_DIR" --all-namespaces 2>&1; then
    echo "  PASSED"
  else
    echo "  FAILED"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "Policy testing failed with $ERRORS error(s)"
  exit 1
fi
echo "All policy tests passed"
```

## Policy Exceptions

Define exceptions for resources that legitimately need to bypass certain policies.

```rego
# policy/exceptions/exceptions.rego
# Defines exceptions to standard policies

package main

import future.keywords.in

# List of deployments allowed to run as root
root_allowed_deployments := {
    "node-exporter",
    "falco",
    "cilium-agent",
}

# Exception: Allow specific deployments to run as root
exception[rules] {
    input.kind == "Deployment"
    input.metadata.name in root_allowed_deployments
    rules := ["containers_run_as_root"]
}

# Exception: System namespaces skip label requirements
exception[rules] {
    system_namespaces[input.metadata.namespace]
    rules := ["required_labels"]
}

system_namespaces := {
    "kube-system",
    "flux-system",
}
```

## CI Pipeline Integration

```yaml
# .github/workflows/conftest.yaml
name: Policy Testing
on:
  pull_request:
    paths:
      - "clusters/**"
      - "infrastructure/**"
      - "apps/**"
      - "policy/**"

jobs:
  conftest:
    name: Conftest Policy Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install conftest
          curl -sL https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz | \
            tar xz -C /usr/local/bin conftest
          # Install kustomize
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/

      - name: Verify policies
        run: |
          # Verify that all Rego policies compile
          conftest verify --policy policy/base/

      - name: Test raw manifests
        run: |
          find clusters/ infrastructure/ apps/ \
            -name "*.yaml" -type f | \
            xargs conftest test \
              --policy policy/base/ \
              --all-namespaces

      - name: Test rendered overlays
        run: |
          for overlay_dir in infrastructure/overlays/*/; do
            echo "Testing: $overlay_dir"
            kustomize build "$overlay_dir" | \
              conftest test - \
                --policy policy/base/ \
                --all-namespaces
          done

          for overlay_dir in apps/overlays/*/; do
            echo "Testing: $overlay_dir"
            kustomize build "$overlay_dir" | \
              conftest test - \
                --policy policy/base/ \
                --all-namespaces
          done

      - name: Generate policy report
        if: always()
        run: |
          echo "## Policy Test Results" > /tmp/policy-report.md

          # Run tests and capture output
          find clusters/ infrastructure/ apps/ \
            -name "*.yaml" -type f | \
            xargs conftest test \
              --policy policy/base/ \
              --output table \
              --all-namespaces >> /tmp/policy-report.md 2>&1 || true

          cat /tmp/policy-report.md
```

## Writing Policy Tests

Test your policies to ensure they work correctly.

```rego
# policy/base/containers_test.rego
# Unit tests for container policies

package main

# Test: Deployment with resource limits should pass
test_deployment_with_limits {
    not deny with input as {
        "kind": "Deployment",
        "metadata": {"name": "test", "namespace": "default"},
        "spec": {"template": {"spec": {"containers": [{
            "name": "app",
            "image": "app:1.0.0",
            "resources": {
                "requests": {"cpu": "100m", "memory": "128Mi"},
                "limits": {"cpu": "500m", "memory": "256Mi"}
            }
        }]}}}
    }
}

# Test: Deployment without limits should fail
test_deployment_without_limits {
    deny["Deployment 'test': container 'app' must define resource limits"] with input as {
        "kind": "Deployment",
        "metadata": {"name": "test", "namespace": "default"},
        "spec": {"template": {"spec": {"containers": [{
            "name": "app",
            "image": "app:1.0.0",
            "resources": {"requests": {"cpu": "100m"}}
        }]}}}
    }
}

# Test: Container with latest tag should fail
test_latest_tag_denied {
    count(deny) > 0 with input as {
        "kind": "Deployment",
        "metadata": {"name": "test", "namespace": "default"},
        "spec": {"template": {"spec": {"containers": [{
            "name": "app",
            "image": "app:latest",
            "resources": {
                "requests": {"cpu": "100m"},
                "limits": {"cpu": "500m"}
            }
        }]}}}
    }
}
```

```bash
# Run policy unit tests
conftest verify --policy policy/base/
```

## Summary

Conftest brings policy-as-code to your Flux CD workflow, allowing you to enforce organizational standards on every Kubernetes manifest. Write Rego policies for container best practices, required labels, security constraints, Flux CD resource configuration, and networking rules. Test policies with unit tests, run them against rendered Kustomize overlays, and integrate them into your CI pipeline for automated policy enforcement. Use exceptions for legitimate policy bypasses rather than removing the policies themselves.
