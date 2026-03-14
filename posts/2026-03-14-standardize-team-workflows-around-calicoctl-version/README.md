# Standardizing Team Workflows Around calicoctl version

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, DevOps, Team Workflows, Kubernetes, Best Practices

Description: Establish consistent team practices for using calicoctl version across your organization, including version pinning, onboarding procedures, and shared tooling standards.

---

## Introduction

When multiple engineers work with Calico across development, staging, and production clusters, inconsistent `calicoctl` versions become a real problem. One engineer might be using v3.27.0 while another uses v3.24.0, leading to confusion when commands produce different output or behave differently.

Standardizing how your team uses `calicoctl version` is about more than just aligning binary versions. It encompasses establishing shared practices for version verification, creating common scripts, and building a culture where version checks are a routine part of cluster operations.

This guide provides practical strategies for creating team-wide standards around calicoctl version management that scale from small teams to large organizations.

## Prerequisites

- A team managing one or more Kubernetes clusters with Calico
- A shared tools repository or configuration management system
- Basic understanding of version management and team workflows
- A package manager or artifact repository for distributing tools

## Establishing a Version Pinning Policy

Create a clear policy document that specifies which calicoctl version to use:

```yaml
# team-tools/calico-versions.yaml
# This file defines the approved calicoctl versions for each environment
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-tool-versions
  namespace: platform-tools
data:
  production: "v3.27.0"
  staging: "v3.27.0"
  development: "v3.27.0"
  minimum-supported: "v3.25.0"
```

Create a wrapper script that enforces version compliance:

```bash
#!/bin/bash
# calicoctl-wrapper.sh
# Place this in your team's shared bin directory

EXPECTED_VERSION_FILE="${TEAM_TOOLS_DIR:-/opt/team-tools}/calico-versions.yaml"
ENVIRONMENT="${CALICO_ENV:-development}"

# Get expected version
EXPECTED=$(grep "$ENVIRONMENT:" "$EXPECTED_VERSION_FILE" 2>/dev/null | awk '{print $2}' | tr -d '"')

if [ -z "$EXPECTED" ]; then
  echo "WARNING: No version policy found for environment '$ENVIRONMENT'" >&2
  exec calicoctl "$@"
fi

ACTUAL=$(calicoctl version 2>/dev/null | grep "Client Version:" | awk '{print $3}')

if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "ERROR: calicoctl version mismatch!" >&2
  echo "  Current:  $ACTUAL" >&2
  echo "  Expected: $EXPECTED (for $ENVIRONMENT)" >&2
  echo "  Run: install-calicoctl $EXPECTED" >&2
  exit 1
fi

exec calicoctl "$@"
```

## Automated Installation Script

Provide a team-standard installation script:

```bash
#!/bin/bash
# install-calicoctl.sh
# Usage: install-calicoctl [version]
# Installs the specified or default version of calicoctl

VERSION="${1:-v3.27.0}"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

BINARY="calicoctl-${OS}-${ARCH}"
URL="https://github.com/projectcalico/calico/releases/download/${VERSION}/${BINARY}"

echo "Installing calicoctl ${VERSION} for ${OS}/${ARCH}..."

INSTALL_DIR="${CALICOCTL_INSTALL_DIR:-/usr/local/bin}"

curl -L "$URL" -o /tmp/calicoctl
chmod +x /tmp/calicoctl

# Verify the binary works
if /tmp/calicoctl version | grep -q "Client Version"; then
  sudo mv /tmp/calicoctl "${INSTALL_DIR}/calicoctl"
  echo "Installed calicoctl ${VERSION} to ${INSTALL_DIR}/calicoctl"
  calicoctl version | grep "Client Version"
else
  echo "ERROR: Downloaded binary appears invalid"
  rm -f /tmp/calicoctl
  exit 1
fi
```

## Onboarding Checklist

Create a standard onboarding checklist for new team members:

```markdown
## Calico Tools Onboarding

1. Install calicoctl using the team script:
   ```
   ./install-calicoctl.sh v3.27.0
   ```

2. Verify installation:
   ```
   calicoctl version
   ```

3. Configure datastore access:
   ```
   export DATASTORE_TYPE=kubernetes
   export KUBECONFIG=~/.kube/config
   ```

4. Run the team validation script:
   ```
   ./validate-calico-setup.sh
   ```

5. Confirm you can access each environment:
   ```
   for ctx in dev staging prod; do
     kubectl --context=$ctx get clusterinformation default
   done
   ```
```

## Pre-Commit and Pre-Apply Hooks

Add version checks as git pre-commit hooks for Calico configuration repos:

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Ensures calicoctl version is correct before committing Calico configs

# Only check if Calico YAML files are staged
CALICO_FILES=$(git diff --cached --name-only | grep -E '\.(yaml|yml)$' | head -5)
if [ -z "$CALICO_FILES" ]; then
  exit 0
fi

# Check if any staged files contain Calico resources
HAS_CALICO=$(git diff --cached --diff-filter=ACM | grep -l "projectcalico.org" 2>/dev/null)
if [ -z "$HAS_CALICO" ]; then
  exit 0
fi

echo "Calico config detected - validating calicoctl version..."

EXPECTED="v3.27.0"
ACTUAL=$(calicoctl version 2>/dev/null | grep "Client Version:" | awk '{print $3}')

if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "ERROR: calicoctl version $ACTUAL does not match team standard $EXPECTED"
  echo "Run: install-calicoctl $EXPECTED"
  exit 1
fi

echo "calicoctl version OK ($ACTUAL)"
```

## Regular Version Audit

Schedule regular version audits across all team environments:

```bash
#!/bin/bash
# weekly-version-audit.sh
# Run via cron: 0 9 * * 1 /opt/team-tools/weekly-version-audit.sh

REPORT_FILE="/tmp/calico-version-report-$(date +%Y%m%d).txt"

{
  echo "Calico Version Audit Report - $(date)"
  echo "=================================="
  echo ""

  for CONTEXT in $(kubectl config get-contexts -o name); do
    echo "Cluster: $CONTEXT"
    VER=$(kubectl --context="$CONTEXT" get clusterinformation default       -o jsonpath='{.spec.calicoVersion}' 2>/dev/null)
    echo "  Calico Version: ${VER:-UNREACHABLE}"
    
    NODES=$(kubectl --context="$CONTEXT" get nodes --no-headers 2>/dev/null | wc -l)
    echo "  Node Count: ${NODES:-N/A}"
    echo ""
  done

  echo "calicoctl Client Version: $(calicoctl version 2>/dev/null | grep 'Client Version' | awk '{print $3}')"
} > "$REPORT_FILE"

echo "Report saved to $REPORT_FILE"
cat "$REPORT_FILE"
```

## Verification

Verify your team standards are in place:

```bash
# Check the wrapper script works
CALICO_ENV=production ./calicoctl-wrapper.sh version

# Test the install script
./install-calicoctl.sh v3.27.0

# Run the audit
./weekly-version-audit.sh
```

## Troubleshooting

- **Different OS/architecture across team**: Ensure the install script detects the platform correctly. Test on macOS, Linux x86_64, and Linux arm64.
- **Version policy file not accessible**: Store it in a git repository that all team members can access, or use a ConfigMap in a shared cluster.
- **Pre-commit hook slows down commits**: Add the check only when Calico-related files are staged (as shown above).
- **New team members confused by wrapper**: Document the workflow clearly and include it in your team wiki.

## Conclusion

Standardizing calicoctl version management across your team prevents the subtle issues that arise from version inconsistency. By implementing version pinning, automated installation, pre-commit hooks, and regular audits, you create a consistent environment where every team member works with the same tools and produces predictable results.
