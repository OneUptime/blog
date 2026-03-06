# How to Use flux list artifacts to List OCI Artifacts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, OCI, Artifacts, Lists, GitOps, Kubernetes, container-registry, Inventory

Description: A practical guide to listing and inspecting OCI artifacts in container registries using the flux list artifacts command.

---

## Introduction

The `flux list artifacts` command provides a way to query container registries and view all available OCI artifacts for a given repository. This is useful for auditing what has been published, finding specific versions, verifying promotions, and scripting around artifact management workflows.

This guide covers how to use `flux list artifacts` effectively, including filtering, scripting, and integration with other Flux CLI commands.

## Prerequisites

- Flux CLI v2.0 or later installed
- Read access to an OCI-compatible container registry
- OCI artifacts previously pushed with `flux push artifact`

```bash
# Verify Flux CLI installation
flux version --client
```

## Basic Usage

### Listing All Artifacts

```bash
# List all artifacts in a repository
# This shows all tags and their metadata
flux list artifacts oci://ghcr.io/myorg/app-config
```

The output typically includes:

- Tag name
- Digest (SHA256)
- Last modified timestamp
- Size

### Example Output

```yaml
ARTIFACT                                         DIGEST                                                                   LAST UPDATED
oci://ghcr.io/myorg/app-config:v1.0.0           sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2  2026-03-01T10:00:00Z
oci://ghcr.io/myorg/app-config:v1.1.0           sha256:b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3  2026-03-03T14:30:00Z
oci://ghcr.io/myorg/app-config:v1.2.0           sha256:c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4  2026-03-05T09:15:00Z
oci://ghcr.io/myorg/app-config:latest           sha256:c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4  2026-03-05T09:15:00Z
oci://ghcr.io/myorg/app-config:staging          sha256:c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4  2026-03-05T09:15:00Z
oci://ghcr.io/myorg/app-config:production       sha256:b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3  2026-03-03T14:30:00Z
```

## Authentication for Listing

### Docker Hub

```bash
# Authenticate first, then list
docker login docker.io -u myuser
flux list artifacts oci://docker.io/myuser/manifests
```

### GitHub Container Registry

```bash
# Authenticate with GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# List artifacts
flux list artifacts oci://ghcr.io/myorg/app-config
```

### AWS ECR

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# List artifacts in ECR
flux list artifacts oci://123456789.dkr.ecr.us-east-1.amazonaws.com/manifests
```

### Using Inline Credentials

```bash
# Pass credentials directly
flux list artifacts oci://docker.io/myuser/manifests \
  --creds="myuser:mypassword"
```

## Filtering and Searching

### Finding Specific Tags with grep

```bash
# Find all production-related tags
flux list artifacts oci://ghcr.io/myorg/app-config | grep "production"

# Find all semantic version tags
flux list artifacts oci://ghcr.io/myorg/app-config | grep -E "v[0-9]+\.[0-9]+\.[0-9]+"

# Find artifacts from a specific date
flux list artifacts oci://ghcr.io/myorg/app-config | grep "2026-03-05"
```

### Finding Tags That Share a Digest

```bash
# Identify which tags point to the same artifact
# This is useful for verifying promotions
flux list artifacts oci://ghcr.io/myorg/app-config | sort -k2

# Extract just the digests and tags
flux list artifacts oci://ghcr.io/myorg/app-config | awk '{print $2, $1}'
```

### Counting Artifacts

```bash
# Count total number of tags
flux list artifacts oci://ghcr.io/myorg/app-config | wc -l

# Count unique artifacts (by digest)
flux list artifacts oci://ghcr.io/myorg/app-config | awk '{print $2}' | sort -u | wc -l
```

## Practical Use Cases

### Inventory Report

```bash
#!/bin/bash
# artifact-inventory.sh
# Generate an inventory report of all OCI artifacts

REGISTRY="ghcr.io/myorg"

# List of repositories to check
REPOS=(
  "frontend-config"
  "backend-config"
  "database-config"
  "monitoring-config"
)

echo "=== OCI Artifact Inventory Report ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

for repo in "${REPOS[@]}"; do
  echo "--- ${repo} ---"
  flux list artifacts "oci://${REGISTRY}/${repo}" 2>/dev/null || echo "  No artifacts found or access denied"
  echo ""
done
```

### Verify Promotion Status

```bash
#!/bin/bash
# check-promotion.sh
# Verify which version is deployed to each environment

ARTIFACT_URL="oci://ghcr.io/myorg/app-config"
ENVIRONMENTS=("dev" "staging" "production")

echo "=== Promotion Status ==="

# Get all artifacts with their digests
ALL_ARTIFACTS=$(flux list artifacts "${ARTIFACT_URL}")

for env in "${ENVIRONMENTS[@]}"; do
  # Find the digest for this environment tag
  ENV_DIGEST=$(echo "$ALL_ARTIFACTS" | grep ":${env}" | awk '{print $2}')

  if [ -n "$ENV_DIGEST" ]; then
    # Find the semver tag with the same digest
    VERSION=$(echo "$ALL_ARTIFACTS" | grep "$ENV_DIGEST" | grep -oE "v[0-9]+\.[0-9]+\.[0-9]+" | head -1)
    echo "${env}: ${VERSION:-unknown version} (${ENV_DIGEST:0:20}...)"
  else
    echo "${env}: NOT DEPLOYED"
  fi
done
```

### Find the Latest Semver Tag

```bash
#!/bin/bash
# latest-version.sh
# Find the latest semantic version tag for an artifact

ARTIFACT_URL="oci://ghcr.io/myorg/app-config"

# List artifacts, filter for semver tags, sort, and get the latest
LATEST=$(flux list artifacts "${ARTIFACT_URL}" | \
  grep -oE "v[0-9]+\.[0-9]+\.[0-9]+" | \
  sort -V | \
  tail -1)

echo "Latest version: ${LATEST}"
```

### Monitor for New Artifacts

```bash
#!/bin/bash
# monitor-artifacts.sh
# Check for new artifacts since the last check

ARTIFACT_URL="oci://ghcr.io/myorg/app-config"
STATE_FILE="/tmp/artifact-monitor-state"

# Get current artifact list
CURRENT=$(flux list artifacts "${ARTIFACT_URL}")

if [ -f "$STATE_FILE" ]; then
  PREVIOUS=$(cat "$STATE_FILE")

  # Compare and find new entries
  NEW_ARTIFACTS=$(diff <(echo "$PREVIOUS") <(echo "$CURRENT") | grep "^>" | sed 's/^> //')

  if [ -n "$NEW_ARTIFACTS" ]; then
    echo "New artifacts detected:"
    echo "$NEW_ARTIFACTS"
  else
    echo "No new artifacts since last check"
  fi
else
  echo "First run - establishing baseline"
fi

# Save current state
echo "$CURRENT" > "$STATE_FILE"
```

### Cleanup Old Artifacts

```bash
#!/bin/bash
# identify-old-artifacts.sh
# Identify artifacts older than a specified number of days
# Note: Actual deletion requires registry-specific APIs

ARTIFACT_URL="oci://ghcr.io/myorg/app-config"
MAX_AGE_DAYS=30
CUTOFF_DATE=$(date -u -v-${MAX_AGE_DAYS}d +%Y-%m-%d 2>/dev/null || date -u -d "${MAX_AGE_DAYS} days ago" +%Y-%m-%d)

echo "Artifacts older than ${CUTOFF_DATE}:"
flux list artifacts "${ARTIFACT_URL}" | while read -r line; do
  # Extract the date from the last updated column
  ARTIFACT_DATE=$(echo "$line" | grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}" | tail -1)

  if [ -n "$ARTIFACT_DATE" ] && [[ "$ARTIFACT_DATE" < "$CUTOFF_DATE" ]]; then
    echo "  OLD: $line"
  fi
done
```

## CI/CD Integration

### GitHub Actions Artifact Check

```yaml
# .github/workflows/check-artifacts.yaml
name: Check Artifacts
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      packages: read
    steps:
      - uses: fluxcd/flux2/action@main

      - name: Login to GHCR
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: List all artifacts
        run: |
          echo "## Current Artifacts" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          flux list artifacts oci://ghcr.io/${{ github.repository }}/deploy >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

      - name: Count artifacts
        run: |
          COUNT=$(flux list artifacts oci://ghcr.io/${{ github.repository }}/deploy | wc -l)
          echo "Total artifacts: $COUNT" >> $GITHUB_STEP_SUMMARY
```

## Troubleshooting

```bash
# Error: "repository not found"
# Verify the repository path is correct
# Check that you have read access to the registry

# Error: "unauthorized"
# Re-authenticate with the registry
docker login ghcr.io

# Empty output
# The repository may exist but have no artifacts
# Verify you have pushed artifacts to this path
flux push artifact oci://ghcr.io/myorg/app-config:test \
  --path="./test-dir" \
  --source="local" \
  --revision="test"

# Then list again
flux list artifacts oci://ghcr.io/myorg/app-config

# Timeout errors
# Large repositories may take time to list
# Check your network connection and registry status
```

## Best Practices

1. **Regularly audit your artifact repositories** to track what is published and remove obsolete versions.
2. **Use listing in CI/CD** to verify artifacts were pushed successfully before proceeding with deployments.
3. **Script promotion checks** using `flux list artifacts` to confirm environment tags match expected versions.
4. **Monitor artifact counts** to identify repositories that may need cleanup policies.
5. **Cross-reference digests** to understand which tags point to the same underlying content.

## Summary

The `flux list artifacts` command is your window into OCI artifact repositories. It provides the visibility needed to manage artifact lifecycle, verify promotions, audit deployments, and build automation around your GitOps workflows. Combined with shell scripting and CI/CD integration, it becomes a powerful tool for maintaining control over your Kubernetes configuration distribution.
