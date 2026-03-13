# How to Scan Flux Manifests for Security Misconfigurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Static Analysis, Kubesec, Trivy, Checkov, Security Scanning

Description: Learn how to scan Flux Kustomization and HelmRelease manifests for security misconfigurations using static analysis tools.

---

Security misconfigurations in Kubernetes manifests are a common source of vulnerabilities. When managing your cluster with Flux, scanning your GitOps manifests for security issues before they reach the cluster is essential. This guide demonstrates how to use static analysis tools like Trivy, Kubesec, and Checkov to scan Flux manifests for security misconfigurations.

## Prerequisites

Before you begin, ensure you have:

- A Git repository with Flux manifests (Kustomizations, HelmReleases, etc.)
- One or more of the following scanning tools installed:
  - Trivy (v0.45 or later)
  - Kubesec
  - Checkov
- Flux CLI (v2.0 or later)
- kubectl for generating rendered manifests

Install the scanning tools:

```bash
# Install Trivy
brew install trivy  # macOS
# or
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Install Kubesec
curl -sSL https://github.com/controlplaneio/kubesec/releases/latest/download/kubesec_linux_amd64.tar.gz | tar -xz -C /usr/local/bin kubesec

# Install Checkov
pip install checkov
```

## Step 1: Scan Manifests with Trivy

Trivy can scan Kubernetes manifest files for misconfigurations:

```bash
# Scan a single manifest file
trivy config clusters/my-cluster/apps/deployment.yaml

# Scan an entire directory of manifests
trivy config clusters/my-cluster/

# Scan with specific severity threshold
trivy config clusters/my-cluster/ --severity HIGH,CRITICAL

# Output results in JSON format
trivy config clusters/my-cluster/ --format json -o trivy-results.json
```

Example output for a misconfigured deployment:

```
clusters/my-cluster/apps/deployment.yaml
==========================================
Tests: 25 (SUCCESSES: 18, FAILURES: 7)
Failures: 7

HIGH: Container is running without a read-only root filesystem
════════════════════════════════════════
Set 'readOnlyRootFilesystem' to true

HIGH: Container is running as root
════════════════════════════════════════
Set 'runAsNonRoot' to true
```

## Step 2: Scan Flux-Specific Resources

Scan Flux Kustomization and HelmRelease resources for best practices:

```bash
# Scan the flux-system directory
trivy config clusters/my-cluster/flux-system/

# Scan with custom policies for Flux resources
trivy config clusters/my-cluster/ --policy ./custom-policies/
```

Create a custom Rego policy for Flux resources:

```rego
# custom-policies/flux_kustomization.rego
package flux.kustomization

import future.keywords.if

deny[msg] if {
    input.kind == "Kustomization"
    input.apiVersion == "kustomize.toolkit.fluxcd.io/v1"
    not input.spec.prune
    msg := "Flux Kustomization should have prune enabled for garbage collection"
}

deny[msg] if {
    input.kind == "Kustomization"
    input.apiVersion == "kustomize.toolkit.fluxcd.io/v1"
    not input.spec.healthChecks
    msg := "Flux Kustomization should have health checks configured"
}
```

## Step 3: Scan Rendered Manifests

Since Flux applies kustomizations and Helm charts, scan the rendered output:

```bash
# Render Kustomization output
kustomize build clusters/my-cluster/apps/ > rendered-manifests.yaml

# Scan the rendered output
trivy config rendered-manifests.yaml

# For Helm charts, render and scan
helm template my-release my-chart/ -f values.yaml > helm-rendered.yaml
trivy config helm-rendered.yaml
```

## Step 4: Scan with Kubesec

Kubesec provides a risk score for Kubernetes resources:

```bash
# Scan a deployment manifest
kubesec scan clusters/my-cluster/apps/deployment.yaml

# Scan multiple files
find clusters/my-cluster/ -name "*.yaml" -exec kubesec scan {} \;
```

Create a scanning script for all manifests:

```bash
#!/bin/bash
set -euo pipefail

MANIFESTS_DIR="clusters/my-cluster"
RESULTS_DIR="./scan-results"
mkdir -p "$RESULTS_DIR"

echo "Scanning Flux manifests with Kubesec..."

find "$MANIFESTS_DIR" -name "*.yaml" -o -name "*.yml" | while read -r manifest; do
  # Only scan resource types that Kubesec supports
  kind=$(grep -m1 "^kind:" "$manifest" 2>/dev/null | awk '{print $2}')
  case "$kind" in
    Deployment|Pod|StatefulSet|DaemonSet)
      echo "Scanning: $manifest"
      result=$(kubesec scan "$manifest" 2>/dev/null || echo "[]")
      score=$(echo "$result" | jq -r '.[0].score // "N/A"')
      echo "  Score: $score"

      if [ "$score" != "N/A" ] && [ "$score" -lt 0 ]; then
        echo "  WARNING: Low security score detected"
      fi
      ;;
  esac
done
```

## Step 5: Scan with Checkov

Checkov provides comprehensive policy checking for infrastructure as code:

```bash
# Scan a directory of Kubernetes manifests
checkov -d clusters/my-cluster/ --framework kubernetes

# Scan with specific checks
checkov -d clusters/my-cluster/ --framework kubernetes \
  --check CKV_K8S_1,CKV_K8S_8,CKV_K8S_9,CKV_K8S_20

# Output results in JSON
checkov -d clusters/my-cluster/ --framework kubernetes \
  --output json > checkov-results.json
```

Key Checkov checks for Flux-managed resources:

```bash
# Check for privileged containers
checkov -d clusters/my-cluster/ --check CKV_K8S_1

# Check for root user
checkov -d clusters/my-cluster/ --check CKV_K8S_6

# Check for read-only filesystem
checkov -d clusters/my-cluster/ --check CKV_K8S_22

# Check for resource limits
checkov -d clusters/my-cluster/ --check CKV_K8S_11,CKV_K8S_13
```

## Step 6: Integrate Scanning into a Pre-Commit Hook

Add manifest scanning to your Git pre-commit workflow:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.0
    hooks:
      - id: checkov
        args: ['--framework', 'kubernetes']

  - repo: local
    hooks:
      - id: trivy-config
        name: Trivy Config Scan
        entry: trivy config --exit-code 1 --severity HIGH,CRITICAL
        language: system
        files: '\.ya?ml$'
        pass_filenames: true
```

## Step 7: Create a Comprehensive Scanning Pipeline

Build a scanning script that combines multiple tools:

```bash
#!/bin/bash
set -euo pipefail

MANIFESTS_DIR="${1:-clusters/my-cluster}"
EXIT_CODE=0

echo "=========================================="
echo "Flux Manifest Security Scan"
echo "=========================================="
echo ""

# Step 1: Trivy scan
echo "--- Trivy Config Scan ---"
if trivy config "$MANIFESTS_DIR" --severity HIGH,CRITICAL --exit-code 1; then
  echo "Trivy: PASS"
else
  echo "Trivy: FAIL"
  EXIT_CODE=1
fi
echo ""

# Step 2: Checkov scan
echo "--- Checkov Scan ---"
if checkov -d "$MANIFESTS_DIR" --framework kubernetes --quiet --compact; then
  echo "Checkov: PASS"
else
  echo "Checkov: FAIL"
  EXIT_CODE=1
fi
echo ""

# Step 3: YAML lint
echo "--- YAML Lint ---"
if find "$MANIFESTS_DIR" -name "*.yaml" -o -name "*.yml" | xargs yamllint -d relaxed; then
  echo "YAML Lint: PASS"
else
  echo "YAML Lint: FAIL"
  EXIT_CODE=1
fi

echo ""
echo "=========================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "All scans PASSED"
else
  echo "Some scans FAILED - review results above"
fi
echo "=========================================="

exit $EXIT_CODE
```

## Verification

After setting up scanning, verify the following:

1. Run the scanning tools against your manifest directory:

```bash
trivy config clusters/my-cluster/ --severity HIGH,CRITICAL
```

2. Confirm that known misconfigurations are detected (test with an intentionally misconfigured manifest)

3. Verify that the pre-commit hook triggers on manifest changes:

```bash
git add clusters/my-cluster/apps/deployment.yaml
git commit -m "test scanning"
```

4. Check scan results for false positives and adjust policies as needed

## Troubleshooting

### Trivy reports false positives for Flux CRDs

Trivy may flag Flux custom resources incorrectly. Exclude Flux CRDs:

```bash
trivy config clusters/my-cluster/ \
  --skip-files "clusters/my-cluster/flux-system/gotk-components.yaml"
```

### Checkov does not recognize Flux resource types

Checkov may not have built-in checks for Flux CRDs. Use custom policies:

```bash
checkov -d clusters/my-cluster/ --framework kubernetes \
  --external-checks-dir ./custom-checkov-policies/
```

### Scanning Helm chart values

Helm values files are not Kubernetes resources and will not be scanned by most tools. Render the chart first:

```bash
helm template my-release ./charts/my-chart -f values.yaml | trivy config -
```

### Large manifests cause timeout

For very large manifest directories, scan in batches:

```bash
find clusters/my-cluster/ -name "*.yaml" | xargs -n 10 trivy config
```

## Summary

Scanning Flux manifests for security misconfigurations is a proactive approach to identifying and fixing vulnerabilities before they reach your Kubernetes cluster. By combining tools like Trivy, Kubesec, and Checkov, and integrating them into your Git workflow, you create a shift-left security practice that catches issues early. Regular scanning of both raw manifests and rendered output ensures comprehensive coverage across your GitOps pipeline.
