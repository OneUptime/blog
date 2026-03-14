# How to Use flux version to Check Component Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, CLI, Version, Upgrade, Compatibility

Description: Learn how to use the flux version command to check Flux CD component versions, identify version mismatches, and plan upgrades.

---

## Introduction

Keeping Flux CD components in sync and up to date is important for stability and security. The `flux version` command provides a quick way to check the versions of your Flux CLI and all deployed controller components. This helps you identify version mismatches, plan upgrades, and troubleshoot compatibility issues.

This guide walks through practical usage of `flux version` and related version management tasks.

## Prerequisites

- Flux CLI installed
- A running Kubernetes cluster with Flux installed (for cluster version checks)
- kubectl configured with cluster access

## Basic Version Check

The simplest way to check versions:

```bash
# Check CLI and all controller versions
flux version
```

Example output:

```yaml
flux: v2.4.0
helm-controller: v0.37.4
kustomize-controller: v1.2.2
notification-controller: v1.2.4
source-controller: v1.2.4
```

This shows the Flux CLI version on the first line, followed by each controller version deployed in the cluster.

## CLI-Only Version Check

If you only want to check the CLI version without connecting to a cluster:

```bash
# Check only the CLI version (no cluster connection needed)
flux version --client
```

Output:

```yaml
flux: v2.4.0
```

This is useful when you do not have cluster access or just want to verify your local installation.

## JSON Output for Automation

For scripting and automation, use the JSON output format:

```bash
# Get version information as JSON
flux version -o json
```

Output:

```json
{
  "flux": "v2.4.0",
  "helm-controller": "v0.37.4",
  "kustomize-controller": "v1.2.2",
  "notification-controller": "v1.2.4",
  "source-controller": "v1.2.4"
}
```

### Parsing JSON Output

```bash
# Extract a specific component version using jq
flux version -o json | jq -r '.["source-controller"]'
# Output: v1.2.4

# Get the CLI version
flux version -o json | jq -r '.flux'
# Output: v2.4.0

# List all controller versions (excluding CLI)
flux version -o json | jq -r 'to_entries[] | select(.key != "flux") | "\(.key): \(.value)"'
```

## Detecting Version Mismatches

Version mismatches between the CLI and controllers can cause unexpected behavior. Here is how to detect them:

```bash
#!/bin/bash
# check-version-mismatch.sh
# Detect version mismatches between Flux CLI and controllers

set -euo pipefail

# Get version info as JSON
VERSION_JSON=$(flux version -o json 2>/dev/null)

# Extract CLI version
CLI_VERSION=$(echo "${VERSION_JSON}" | jq -r '.flux')
CLI_MINOR=$(echo "${CLI_VERSION}" | sed 's/v//' | cut -d. -f1-2)

echo "Flux CLI version: ${CLI_VERSION}"
echo "CLI minor version: ${CLI_MINOR}"
echo ""

# Check each controller
MISMATCH_FOUND=false

for COMPONENT in helm-controller kustomize-controller notification-controller source-controller; do
  COMP_VERSION=$(echo "${VERSION_JSON}" | jq -r --arg c "${COMPONENT}" '.[$c] // "not found"')

  if [ "${COMP_VERSION}" = "not found" ]; then
    echo "WARNING: ${COMPONENT} is not deployed"
    MISMATCH_FOUND=true
  else
    echo "${COMPONENT}: ${COMP_VERSION}"
  fi
done

echo ""
if [ "${MISMATCH_FOUND}" = true ]; then
  echo "Version mismatches detected. Consider upgrading."
else
  echo "All components are present."
fi
```

## Comparing Against Latest Release

Check if your installation is up to date:

```bash
#!/bin/bash
# check-latest-version.sh
# Compare installed Flux version against the latest release

# Get the current CLI version
CURRENT=$(flux version --client -o json | jq -r '.flux')

# Get the latest release from GitHub
LATEST=$(curl -s https://api.github.com/repos/fluxcd/flux2/releases/latest | jq -r '.tag_name')

echo "Installed: ${CURRENT}"
echo "Latest:    ${LATEST}"

if [ "${CURRENT}" = "${LATEST}" ]; then
  echo "You are running the latest version."
else
  echo "An update is available."
  echo "Upgrade CLI: curl -s https://fluxcd.io/install.sh | sudo bash"
  echo "Upgrade cluster: flux install"
fi
```

## Version Check in CI/CD Pipelines

Integrate version checks into your CI/CD pipelines:

```bash
#!/bin/bash
# ci-version-check.sh
# Ensure minimum Flux version in CI/CD pipeline

REQUIRED_CLI_VERSION="v2.3.0"
CURRENT_CLI_VERSION=$(flux version --client -o json | jq -r '.flux')

# Compare versions using sort -V (version sort)
OLDER=$(echo -e "${REQUIRED_CLI_VERSION}\n${CURRENT_CLI_VERSION}" | sort -V | head -n1)

if [ "${OLDER}" = "${REQUIRED_CLI_VERSION}" ] || [ "${CURRENT_CLI_VERSION}" = "${REQUIRED_CLI_VERSION}" ]; then
  echo "Flux CLI version ${CURRENT_CLI_VERSION} meets minimum requirement (${REQUIRED_CLI_VERSION})"
else
  echo "ERROR: Flux CLI version ${CURRENT_CLI_VERSION} is below minimum (${REQUIRED_CLI_VERSION})"
  echo "Please upgrade the Flux CLI."
  exit 1
fi
```

## Multi-Cluster Version Tracking

When managing multiple clusters, track versions across all of them:

```bash
#!/bin/bash
# multi-cluster-versions.sh
# Check Flux versions across multiple clusters

# Define your cluster contexts
CLUSTERS=(
  "production-us-east"
  "production-eu-west"
  "staging"
  "development"
)

echo "Flux Version Report"
echo "==================="
echo ""
printf "%-25s %-15s %-20s %-20s %-20s %-20s\n" \
  "CLUSTER" "CLI" "SOURCE" "KUSTOMIZE" "HELM" "NOTIFICATION"
echo "-----------------------------------------------------------------------------------------------------------"

for CLUSTER in "${CLUSTERS[@]}"; do
  # Switch context and get versions
  VERSION_JSON=$(kubectl config use-context "${CLUSTER}" > /dev/null 2>&1 && \
    flux version -o json 2>/dev/null || echo '{}')

  if [ "${VERSION_JSON}" = "{}" ]; then
    printf "%-25s %-15s\n" "${CLUSTER}" "UNREACHABLE"
    continue
  fi

  CLI=$(echo "${VERSION_JSON}" | jq -r '.flux // "N/A"')
  SRC=$(echo "${VERSION_JSON}" | jq -r '.["source-controller"] // "N/A"')
  KS=$(echo "${VERSION_JSON}" | jq -r '.["kustomize-controller"] // "N/A"')
  HELM=$(echo "${VERSION_JSON}" | jq -r '.["helm-controller"] // "N/A"')
  NOTIF=$(echo "${VERSION_JSON}" | jq -r '.["notification-controller"] // "N/A"')

  printf "%-25s %-15s %-20s %-20s %-20s %-20s\n" \
    "${CLUSTER}" "${CLI}" "${SRC}" "${KS}" "${HELM}" "${NOTIF}"
done
```

## Checking Image Automation Controller Versions

If you have image automation controllers installed, they also appear in the version output:

```bash
# Full version output with image automation controllers
flux version

# Expected output with optional components:
# flux: v2.4.0
# helm-controller: v0.37.4
# image-automation-controller: v0.37.1
# image-reflector-controller: v0.31.2
# kustomize-controller: v1.2.2
# notification-controller: v1.2.4
# source-controller: v1.2.4
```

## Checking CRD Versions

While `flux version` checks controllers, you may also want to verify CRD API versions:

```bash
# List all Flux CRDs and their versions
kubectl get crds -o custom-columns=NAME:.metadata.name,VERSION:.spec.versions[*].name \
  | grep fluxcd

# Check a specific CRD version
kubectl get crd gitrepositories.source.toolkit.fluxcd.io \
  -o jsonpath='{.spec.versions[*].name}'
# Output: v1 v1beta2
```

## Upgrading Based on Version Information

Once you have identified that an upgrade is needed:

```bash
# Step 1: Check current versions
flux version

# Step 2: Run pre-flight checks
flux check --pre

# Step 3: Upgrade the CLI first
# macOS
brew upgrade fluxcd/tap/flux

# Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Step 4: Verify the new CLI version
flux version --client

# Step 5: Upgrade cluster components
flux install

# Step 6: Verify the upgrade
flux version
flux check
```

## Monitoring Version Drift

Set up a Kubernetes CronJob to monitor version drift:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-version-check
  namespace: flux-system
spec:
  schedule: "0 8 * * 1"  # Every Monday at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-version-checker
          containers:
            - name: version-check
              image: ghcr.io/fluxcd/flux-cli:v2.4.0
              command:
                - /bin/sh
                - -c
                - |
                  echo "=== Flux Version Report ==="
                  echo "Date: $(date)"
                  echo ""
                  flux version
                  echo ""
                  echo "=== Health Check ==="
                  flux check
          restartPolicy: OnFailure
```

## Troubleshooting Version Issues

### Controller Version Shows as Empty

```bash
# If a controller version is missing from flux version output:

# Check if the deployment exists
kubectl get deployments -n flux-system

# Check if the pod is running
kubectl get pods -n flux-system

# Check pod logs for errors
kubectl logs -n flux-system deployment/source-controller --tail=50
```

### CLI Cannot Connect to Cluster

```bash
# If flux version fails to connect:

# Verify kubectl connectivity
kubectl cluster-info

# Check your kubeconfig
kubectl config current-context

# Try with explicit kubeconfig
flux version --kubeconfig=/path/to/kubeconfig
```

### Version Command Hangs

```bash
# If flux version takes too long, it may be a network issue

# Set a timeout using the CLI-only flag first
flux version --client

# Check cluster connectivity
kubectl get ns flux-system --request-timeout=5s
```

## Best Practices

1. **Check versions after every upgrade** to confirm all components updated successfully.
2. **Keep CLI and controllers in sync** to avoid compatibility issues.
3. **Use JSON output in automation** for reliable parsing.
4. **Track versions across clusters** to maintain consistency in multi-cluster setups.
5. **Monitor for new releases** by checking the Flux GitHub releases page or subscribing to notifications.
6. **Document version requirements** in your project README so team members know the minimum supported versions.

## Summary

The `flux version` command is a simple but essential tool for managing Flux CD installations. It provides instant visibility into the versions of your CLI and all controller components, making it easy to detect mismatches, plan upgrades, and maintain consistency across environments. Combined with automation scripts, it forms a key part of your Flux lifecycle management strategy.
