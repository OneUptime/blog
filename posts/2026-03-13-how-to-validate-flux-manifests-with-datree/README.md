# How to Validate Flux Manifests with Datree

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Datree, Policy Enforcement, Validation, CI/CD

Description: Learn how to use Datree to validate Flux manifests against policy rules and Kubernetes best practices for secure and compliant deployments.

---

## Introduction

Datree goes beyond schema validation by checking Kubernetes manifests against configurable policy rules. It enforces best practices such as requiring resource limits, prohibiting privileged containers, ensuring label conventions, and more. When combined with Flux, Datree helps ensure that every manifest deployed through your GitOps pipeline meets your organization's standards.

## Prerequisites

- Datree CLI installed
- A Flux GitOps repository with manifests
- kubectl and kustomize installed

## Step 1: Install Datree

```bash
# macOS / Linux (install script)
curl https://get.datree.io | /bin/bash

# macOS (Homebrew)
brew install datree

# Verify installation
datree version
```

## Step 2: Run Basic Validation

Run Datree against your Kubernetes manifests.

```bash
# Validate a single file
datree test deployment.yaml

# Validate a directory
datree test manifests/*.yaml

# Validate with a specific policy
datree test --policy "staging" manifests/*.yaml
```

## Step 3: Understand Datree Output

Datree checks manifests against three categories:

1. **YAML validation** - Is the file valid YAML?
2. **Kubernetes schema validation** - Does it match the Kubernetes API schema?
3. **Policy check** - Does it follow configured best practices?

```bash
# Example output:
# >> File: deployment.yaml
#
# [V] YAML validation
# [V] Kubernetes schema validation
# [X] Policy check
#
# X  Ensure each container has a configured memory request [1 occurrence]
# X  Ensure each container has a configured CPU limit [1 occurrence]
```

## Step 4: Validate Flux Kustomize Output

Pipe kustomize build output through Datree.

```bash
# Validate kustomize build output
kustomize build overlays/production | datree test -

# With a specific Kubernetes version
kustomize build overlays/production | datree test --schema-version 1.30.0 -
```

## Step 5: Configure Custom Policies

Create a Datree policy configuration file for Flux-specific rules.

```yaml
# .datree/policy.yaml
apiVersion: v1
policies:
  - name: flux-production
    isDefault: true
    rules:
      - identifier: CONTAINERS_MISSING_MEMORY_LIMIT_KEY
        messageOnFailure: "All containers must have memory limits"
      - identifier: CONTAINERS_MISSING_CPU_LIMIT_KEY
        messageOnFailure: "All containers must have CPU limits"
      - identifier: CONTAINERS_MISSING_MEMORY_REQUEST_KEY
        messageOnFailure: "All containers must have memory requests"
      - identifier: CONTAINERS_MISSING_CPU_REQUEST_KEY
        messageOnFailure: "All containers must have CPU requests"
      - identifier: CONTAINERS_MISSING_IMAGE_VALUE_VERSION
        messageOnFailure: "Container images must have explicit tags"
      - identifier: WORKLOAD_MISSING_LABEL_OWNER_VALUE
        messageOnFailure: "All workloads must have an owner label"
      - identifier: CONTAINERS_INCORRECT_PRIVILEGED_VALUE_TRUE
        messageOnFailure: "Containers must not run as privileged"
      - identifier: CONTAINERS_MISSING_LIVENESSPROBE_KEY
        messageOnFailure: "All containers must have liveness probes"
      - identifier: CONTAINERS_MISSING_READINESSPROBE_KEY
        messageOnFailure: "All containers must have readiness probes"

customRules:
  - identifier: FLUX_KUSTOMIZATION_MISSING_PRUNE
    name: "Ensure Flux Kustomizations have prune enabled"
    defaultMessageOnFailure: "Flux Kustomizations should have prune: true for garbage collection"
    schema:
      if:
        properties:
          kind:
            enum:
              - Kustomization
          apiVersion:
            pattern: "kustomize.toolkit.fluxcd.io"
      then:
        properties:
          spec:
            properties:
              prune:
                const: true
            required:
              - prune
```

## Step 6: Skip Flux CRDs

When validating standard Kubernetes resources from Flux, skip CRD validation for Flux-specific resources.

```bash
# Skip Flux resource types
datree test \
  --ignore-missing-schemas \
  --schema-version 1.30.0 \
  manifests/*.yaml
```

## Step 7: Validate All Overlays

```bash
#!/bin/bash
# validate-flux-datree.sh
set -euo pipefail

ERRORS=0
SCHEMA_VERSION="${K8S_VERSION:-1.30.0}"

for overlay in overlays/*/; do
  echo "=== Validating: $overlay ==="

  build_output=$(kustomize build "$overlay" 2>&1) || {
    echo "  FAIL: kustomize build failed"
    ERRORS=$((ERRORS + 1))
    continue
  }

  if echo "$build_output" | datree test \
    --schema-version "$SCHEMA_VERSION" \
    --ignore-missing-schemas \
    -; then
    echo "  PASS"
  else
    ERRORS=$((ERRORS + 1))
  fi
  echo ""
done

echo "=== Summary ==="
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS overlay(s) have policy violations"
  exit 1
fi
echo "All overlays passed policy checks"
```

## Step 8: Enforce Policies per Environment

Use different policies for different environments.

```bash
# Staging: warning-level policies
datree test --policy "staging" \
  <(kustomize build overlays/staging)

# Production: strict policies
datree test --policy "production" \
  <(kustomize build overlays/production)
```

## Common Policy Rules for Flux Deployments

Here are recommended policy rules for Flux-managed workloads.

```bash
# Security rules
- CONTAINERS_INCORRECT_PRIVILEGED_VALUE_TRUE    # No privileged containers
- CONTAINERS_INCORRECT_RUNASNONROOT_VALUE       # Run as non-root
- CONTAINERS_INCORRECT_READONLYROOTFILESYSTEM_VALUE  # Read-only root filesystem

# Reliability rules
- CONTAINERS_MISSING_LIVENESSPROBE_KEY          # Require liveness probes
- CONTAINERS_MISSING_READINESSPROBE_KEY         # Require readiness probes
- CONTAINERS_MISSING_MEMORY_LIMIT_KEY           # Require memory limits
- CONTAINERS_MISSING_CPU_LIMIT_KEY              # Require CPU limits

# Best practice rules
- CONTAINERS_MISSING_IMAGE_VALUE_VERSION        # Require image tags
- WORKLOAD_INCORRECT_RESTARTPOLICY_VALUE_ALWAYS # Correct restart policy
- DEPLOYMENT_INCORRECT_REPLICAS_VALUE           # Minimum replica count
```

## CI Integration

```yaml
# .github/workflows/datree-validation.yaml
name: Datree Policy Check
on:
  pull_request:
    paths:
      - '**.yaml'
      - '**.yml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Datree
        run: curl https://get.datree.io | /bin/bash

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Run policy checks
        run: |
          for overlay in overlays/*/; do
            echo "Checking $overlay..."
            kustomize build "$overlay" | \
              datree test --ignore-missing-schemas -
          done
```

## Best Practices

- Define different policy sets for development, staging, and production
- Start with a small set of critical rules and expand gradually
- Use policy exceptions sparingly and document them
- Run Datree in CI to block non-compliant changes before merge
- Review and update policies quarterly to reflect evolving standards
- Combine Datree with schema validators like kubeconform for comprehensive coverage

## Conclusion

Datree adds policy enforcement to your Flux validation pipeline, going beyond schema validation to check for best practices and organizational standards. By configuring policies that match your security and reliability requirements, you ensure that every manifest deployed through Flux meets your quality bar. Running Datree in CI creates an automated gate that catches violations before they reach production.
