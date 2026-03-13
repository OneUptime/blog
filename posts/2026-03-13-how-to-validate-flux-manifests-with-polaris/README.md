# How to Validate Flux Manifests with Polaris

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Polaris, Validation, Security, Best Practices

Description: Learn how to use Polaris to validate Flux manifests for Kubernetes best practices including security, reliability, and efficiency checks.

---

## Introduction

Polaris is an open-source tool from Fairwinds that validates Kubernetes resources against best practice standards. It provides checks for security, reliability, and efficiency, and can run as a CLI tool, a dashboard, or an admission controller. For Flux workflows, the CLI mode is ideal for validating manifests before they are committed to your GitOps repository.

## Prerequisites

- Polaris CLI installed
- A Flux GitOps repository with manifests
- kustomize installed (for overlay validation)

## Step 1: Install Polaris

```bash
# macOS (Homebrew)
brew install FairwindsOps/tap/polaris

# Linux (binary download)
curl -L -o polaris.tar.gz \
  https://github.com/FairwindsOps/polaris/releases/latest/download/polaris_linux_amd64.tar.gz
tar xzf polaris.tar.gz
sudo mv polaris /usr/local/bin/

# Verify installation
polaris version
```

## Step 2: Run Basic Validation

Validate Kubernetes manifests with Polaris audit.

```bash
# Validate a single file
polaris audit --audit-path deployment.yaml --format pretty

# Validate a directory
polaris audit --audit-path manifests/ --format pretty

# Get a score
polaris audit --audit-path manifests/ --format score
```

## Step 3: Understand Polaris Check Categories

Polaris organizes checks into categories:

- **Security**: Privileged containers, host namespaces, capabilities
- **Reliability**: Resource requests/limits, health probes, replicas
- **Efficiency**: CPU/memory request sizing

```bash
# Run with only security checks
polaris audit \
  --audit-path manifests/ \
  --format pretty \
  --only-show-failed-tests

# View all available checks
polaris audit --audit-path deployment.yaml --format json | \
  jq '.Results[].PodResult.ContainerResults[].Results | keys[]' | sort -u
```

## Step 4: Validate Kustomize Build Output

Validate the rendered output of kustomize overlays.

```bash
# Build and validate
kustomize build overlays/production > /tmp/production-manifests.yaml
polaris audit --audit-path /tmp/production-manifests.yaml --format pretty

# Or use process substitution
polaris audit \
  --audit-path <(kustomize build overlays/production) \
  --format pretty
```

## Step 5: Configure Custom Polaris Rules

Create a custom configuration to match your standards.

```yaml
# polaris-config.yaml
checks:
  # Security
  hostIPCSet: danger
  hostPIDSet: danger
  hostNetworkSet: danger
  notReadOnlyRootFilesystem: warning
  privilegeEscalationAllowed: danger
  runAsRootAllowed: warning
  runAsPrivileged: danger
  dangerousCapabilities: danger
  insecureCapabilities: warning

  # Reliability
  cpuRequestsMissing: warning
  cpuLimitsMissing: warning
  memoryRequestsMissing: danger
  memoryLimitsMissing: danger
  readinessProbeMissing: warning
  livenessProbeMissing: warning
  tagNotSpecified: danger
  pullPolicyNotAlways: warning

  # Efficiency
  cpuRequestsOverset: warning
  memoryRequestsOverset: warning

exemptions:
  - namespace: flux-system
    controllerNames:
      - source-controller
      - kustomize-controller
      - helm-controller
      - notification-controller
    rules:
      - readinessProbeMissing
      - livenessProbeMissing
```

Run Polaris with the custom configuration.

```bash
polaris audit \
  --audit-path manifests/ \
  --config polaris-config.yaml \
  --format pretty
```

## Step 6: Set a Minimum Score Threshold

Use the score format to enforce a minimum quality bar.

```bash
#!/bin/bash
# validate-polaris-score.sh
set -euo pipefail

MINIMUM_SCORE=80
AUDIT_PATH="${1:-manifests/}"

score=$(polaris audit \
  --audit-path "$AUDIT_PATH" \
  --format score)

echo "Polaris score: $score"

if [ "$score" -lt "$MINIMUM_SCORE" ]; then
  echo "FAIL: Score $score is below minimum threshold of $MINIMUM_SCORE"
  echo ""
  echo "Details:"
  polaris audit --audit-path "$AUDIT_PATH" --format pretty --only-show-failed-tests
  exit 1
fi

echo "PASS: Score meets minimum threshold"
```

## Step 7: Validate All Overlays

```bash
#!/bin/bash
# validate-all-overlays-polaris.sh
set -euo pipefail

CONFIG="polaris-config.yaml"
MINIMUM_SCORE=75
ERRORS=0

for overlay in overlays/*/; do
  echo "=== Validating: $overlay ==="

  # Build the overlay
  output_file="/tmp/polaris-$(basename "$overlay").yaml"
  kustomize build "$overlay" > "$output_file" 2>/dev/null || {
    echo "  SKIP: kustomize build failed"
    continue
  }

  # Check if the file has content
  if [ ! -s "$output_file" ]; then
    echo "  SKIP: Empty output"
    continue
  fi

  # Run Polaris
  score=$(polaris audit \
    --audit-path "$output_file" \
    --config "$CONFIG" \
    --format score 2>/dev/null || echo "0")

  if [ "$score" -ge "$MINIMUM_SCORE" ]; then
    echo "  PASS (score: $score)"
  else
    echo "  FAIL (score: $score, minimum: $MINIMUM_SCORE)"
    polaris audit \
      --audit-path "$output_file" \
      --config "$CONFIG" \
      --format pretty \
      --only-show-failed-tests 2>/dev/null | head -30
    ERRORS=$((ERRORS + 1))
  fi

  rm -f "$output_file"
  echo ""
done

if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS overlay(s) below minimum score"
  exit 1
fi
echo "All overlays meet minimum Polaris score"
```

## Step 8: Use Polaris as a Dashboard

Deploy Polaris as an in-cluster dashboard for ongoing monitoring.

```yaml
# polaris-dashboard.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: polaris
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/polaris
  prune: true
```

```bash
# Install Polaris dashboard via Helm
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm install polaris fairwinds-stable/polaris \
  --namespace polaris \
  --create-namespace \
  --set dashboard.enable=true \
  --set webhook.enable=false

# Access the dashboard
kubectl port-forward svc/polaris-dashboard -n polaris 8080:80
```

## Output Formats

```bash
# Pretty printed (human readable)
polaris audit --audit-path manifests/ --format pretty

# JSON (for programmatic processing)
polaris audit --audit-path manifests/ --format json

# Score only (for threshold checks)
polaris audit --audit-path manifests/ --format score

# YAML
polaris audit --audit-path manifests/ --format yaml
```

## CI Integration

```yaml
# .github/workflows/polaris.yaml
name: Polaris Validation
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

      - name: Install Polaris
        run: |
          curl -L -o polaris.tar.gz \
            https://github.com/FairwindsOps/polaris/releases/latest/download/polaris_linux_amd64.tar.gz
          tar xzf polaris.tar.gz
          sudo mv polaris /usr/local/bin/

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Run Polaris audit
        run: |
          MINIMUM_SCORE=80
          for overlay in overlays/*/; do
            echo "Checking $overlay..."
            score=$(kustomize build "$overlay" | \
              polaris audit --audit-path /dev/stdin --format score)
            echo "Score: $score"
            if [ "$score" -lt "$MINIMUM_SCORE" ]; then
              echo "FAIL: Score below $MINIMUM_SCORE"
              kustomize build "$overlay" | \
                polaris audit --audit-path /dev/stdin --format pretty --only-show-failed-tests
              exit 1
            fi
          done
```

## Best Practices

- Set realistic minimum scores and increase them gradually
- Use exemptions for Flux system controllers that have different requirements
- Run Polaris in both CLI mode (pre-merge) and dashboard mode (ongoing monitoring)
- Configure check severities (danger, warning, ignore) based on your organization's risk tolerance
- Review failed checks before suppressing them to understand the security implications
- Combine Polaris with schema validators for comprehensive manifest validation

## Conclusion

Polaris provides comprehensive best-practice validation for Kubernetes manifests deployed through Flux. Its scoring system makes it easy to set and enforce quality thresholds, while the customizable configuration lets you tailor checks to your organization's needs. By running Polaris in CI and deploying its dashboard in-cluster, you get both pre-merge validation and ongoing compliance monitoring for your Flux-managed workloads.
