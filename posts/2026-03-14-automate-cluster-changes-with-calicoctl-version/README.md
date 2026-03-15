# Automating Cluster Version Checks with calicoctl version

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Automation, Kubernetes, CI/CD

Description: Learn how to integrate calicoctl version checks into CI/CD pipelines and automation scripts to ensure consistent Calico deployments across your clusters.

---

## Introduction

In production Kubernetes environments, manually verifying Calico versions across multiple clusters is tedious and error-prone. Automating version checks with `calicoctl version` enables you to enforce version consistency, detect drift, and gate deployments on version compatibility.

By embedding `calicoctl version` into your automation pipelines, you can catch version mismatches before they cause networking issues. This is especially important in multi-cluster environments where different teams may upgrade Calico on different schedules.

This guide demonstrates practical patterns for automating Calico version checks using shell scripts, CI/CD pipelines, and Kubernetes-native approaches. These techniques will help you maintain version consistency across your entire fleet.

## Prerequisites

- Multiple Kubernetes clusters with Calico installed
- `calicoctl` binary available in your CI/CD runner
- `kubectl` configured with contexts for each cluster
- Basic familiarity with shell scripting and CI/CD concepts
- Access to a CI/CD platform (GitHub Actions, GitLab CI, or Jenkins)

## Parsing calicoctl version Output

The first step in automation is reliably parsing the version information:

```bash
#!/bin/bash
# extract-calico-version.sh
# Extracts client and cluster versions from calicoctl

CLIENT_VERSION=$(calicoctl version 2>/dev/null | grep "Client Version:" | awk '{print $3}')
CLUSTER_VERSION=$(calicoctl version 2>/dev/null | grep "Cluster Version:" | awk '{print $3}')
CLUSTER_TYPE=$(calicoctl version 2>/dev/null | grep "Cluster Type:" | awk '{print $3}')

echo "Client: ${CLIENT_VERSION:-UNKNOWN}"
echo "Cluster: ${CLUSTER_VERSION:-UNKNOWN}"
echo "Type: ${CLUSTER_TYPE:-UNKNOWN}"

# Exit with error if cluster version is unavailable
if [ -z "$CLUSTER_VERSION" ]; then
  echo "ERROR: Could not retrieve cluster version" >&2
  exit 1
fi
```

## Multi-Cluster Version Audit Script

For environments with multiple clusters, automate version auditing:

```bash
#!/bin/bash
# audit-calico-versions.sh
# Checks Calico versions across all configured kubectl contexts

EXPECTED_VERSION="${1:-v3.27.0}"
CONTEXTS=$(kubectl config get-contexts -o name)
FAILURES=0

echo "=== Calico Version Audit ==="
echo "Expected version: $EXPECTED_VERSION"
echo ""

for CTX in $CONTEXTS; do
  echo "--- Cluster: $CTX ---"
  
  # Set the context for calicoctl
  export KUBECONFIG=$(kubectl config view --raw -o jsonpath="{.clusters[0].cluster.server}" 2>/dev/null)
  
  CLUSTER_VER=$(kubectl --context="$CTX" get clusterinformation default     -o jsonpath='{.spec.calicoVersion}' 2>/dev/null)
  
  if [ -z "$CLUSTER_VER" ]; then
    echo "  Status: UNREACHABLE"
    FAILURES=$((FAILURES + 1))
  elif [ "$CLUSTER_VER" = "$EXPECTED_VERSION" ]; then
    echo "  Version: $CLUSTER_VER - OK"
  else
    echo "  Version: $CLUSTER_VER - MISMATCH (expected $EXPECTED_VERSION)"
    FAILURES=$((FAILURES + 1))
  fi
done

echo ""
echo "=== Summary ==="
echo "Clusters checked: $(echo "$CONTEXTS" | wc -w)"
echo "Failures: $FAILURES"

exit $FAILURES
```

## CI/CD Pipeline Integration

### GitHub Actions Workflow

```yaml
name: Calico Version Check
on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8 AM
  workflow_dispatch:

jobs:
  version-check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        cluster: [production, staging, development]
    steps:
      - name: Install calicoctl
        run: |
          curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
          chmod +x calicoctl
          sudo mv calicoctl /usr/local/bin/

      - name: Configure kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets[format('KUBECONFIG_{0}', matrix.cluster)] }}" | base64 -d > ~/.kube/config

      - name: Check Calico version
        run: |
          echo "Checking ${{ matrix.cluster }} cluster..."
          CLIENT_VER=$(calicoctl version | grep "Client Version:" | awk '{print $3}')
          CLUSTER_VER=$(calicoctl version | grep "Cluster Version:" | awk '{print $3}')
          
          echo "Client: $CLIENT_VER"
          echo "Cluster: $CLUSTER_VER"
          
          if [ "$CLIENT_VER" != "$CLUSTER_VER" ]; then
            echo "::warning::Version mismatch on ${{ matrix.cluster }}"
          fi

      - name: Verify node health
        run: |
          calicoctl node status || echo "::warning::Node status check failed"
```

## Version-Gated Deployment Script

Use version checks to gate configuration changes:

```bash
#!/bin/bash
# safe-calico-deploy.sh
# Only applies Calico configuration if version requirements are met

MIN_VERSION="v3.25.0"
CONFIG_FILE="$1"

if [ -z "$CONFIG_FILE" ]; then
  echo "Usage: $0 <config-file.yaml>"
  exit 1
fi

# Get current cluster version
CLUSTER_VERSION=$(calicoctl version 2>/dev/null | grep "Cluster Version:" | awk '{print $3}')

if [ -z "$CLUSTER_VERSION" ]; then
  echo "ERROR: Cannot determine cluster version"
  exit 1
fi

# Simple version comparison (strip 'v' prefix)
CURRENT=$(echo "$CLUSTER_VERSION" | sed 's/^v//' | awk -F. '{printf "%d%03d%03d", $1, $2, $3}')
MINIMUM=$(echo "$MIN_VERSION" | sed 's/^v//' | awk -F. '{printf "%d%03d%03d", $1, $2, $3}')

if [ "$CURRENT" -lt "$MINIMUM" ]; then
  echo "ERROR: Cluster version $CLUSTER_VERSION is below minimum $MIN_VERSION"
  echo "Please upgrade Calico before applying this configuration."
  exit 1
fi

echo "Version check passed: $CLUSTER_VERSION >= $MIN_VERSION"
echo "Applying configuration from $CONFIG_FILE..."
calicoctl apply -f "$CONFIG_FILE"
```

## Verification

Test your automation scripts:

```bash
# Test the version extraction
bash extract-calico-version.sh

# Run the audit in dry-run mode
bash audit-calico-versions.sh v3.27.0

# Verify CI/CD integration
# Trigger a manual workflow run and check the output
```

## Troubleshooting

- **Script fails with "command not found"**: Ensure calicoctl is in the PATH of your CI/CD runner. Use absolute paths if necessary.
- **Version parsing returns empty**: The output format may differ across calicoctl versions. Test your parsing against the actual output.
- **Context switching fails**: Verify that all kubeconfig contexts are valid and accessible from the automation environment.
- **Rate limiting on API server**: Add delays between cluster checks if querying many clusters sequentially.

## Conclusion

Automating `calicoctl version` checks is a foundational practice for maintaining healthy Calico deployments at scale. By integrating version verification into CI/CD pipelines and deployment scripts, you catch version drift early and prevent configuration incompatibilities before they impact your network.
