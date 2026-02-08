# How to Use Docker Scout Recommendations to Fix Vulnerabilities

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Scout, Vulnerability Remediation, Security, Base Images, DevOps

Description: Use Docker Scout recommendations to fix vulnerabilities by updating base images, packages, and dependencies in your containers.

---

Finding vulnerabilities is only half the battle. The other half, and often the harder half, is figuring out how to fix them. Docker Scout Recommendations bridges this gap by analyzing your image and telling you exactly which base image updates, package upgrades, and configuration changes will eliminate the most vulnerabilities with the least effort.

Instead of researching each CVE individually and trying to find which package update resolves it, Scout's recommendations give you actionable steps sorted by impact. This guide shows how to use recommendations effectively, from simple base image swaps to systematic vulnerability remediation workflows.

## Getting Recommendations

Run the recommendations command against any image to get actionable fix suggestions.

```bash
# Get recommendations for a local image
docker scout recommendations myapp:latest

# Get recommendations for a remote image
docker scout recommendations nginx:1.25

# Get detailed recommendations in JSON format
docker scout recommendations myapp:latest --format json > recommendations.json
```

The output typically includes:

- Recommended base image updates (newer tags, slimmer variants)
- Package versions that fix known vulnerabilities
- Alternative base images with fewer vulnerabilities
- The number of CVEs each recommendation would fix

## Understanding Recommendation Types

Scout provides several categories of recommendations, each addressing different sources of vulnerabilities.

### Base Image Recommendations

These are the highest-impact recommendations. Updating your base image often fixes dozens of vulnerabilities at once because it updates the entire OS package set.

```bash
# See base image recommendations specifically
docker scout recommendations myapp:latest

# Example output:
#   Current base image: node:20.8-alpine3.18
#   Recommended: node:20-alpine (fixes 12 CVEs)
#   Alternative: node:20-slim (fixes 8 CVEs, Debian-based)
#   Alternative: node:20-bookworm-slim (fixes 6 CVEs)
```

Apply the recommendation by updating your Dockerfile.

```dockerfile
# Before: specific version that has known vulnerabilities
FROM node:20.8-alpine3.18

# After: use the tag recommended by Scout
FROM node:20-alpine
```

Rebuild and verify the vulnerabilities are resolved.

```bash
# Rebuild with the updated base image
docker build --no-cache -t myapp:latest .

# Verify vulnerabilities decreased
docker scout cves myapp:latest --only-severity critical,high
```

### Package Update Recommendations

When specific OS packages have vulnerabilities, Scout recommends updated versions.

```bash
# Get detailed CVE information including fixed versions
docker scout cves myapp:latest --only-fixed --format json | \
  jq '.vulnerabilities[] | {cve: .cveId, package: .packageName, installed: .installedVersion, fixed: .fixedVersion}'
```

Apply package updates in your Dockerfile.

```dockerfile
FROM node:20-alpine

# Update OS packages to get security fixes
RUN apk update && apk upgrade --no-cache

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

For Debian-based images:

```dockerfile
FROM node:20-slim

# Install security updates for all packages
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

### Application Dependency Recommendations

Scout also identifies vulnerable application-level dependencies (npm packages, Python packages, etc.).

```bash
# Filter for application-level vulnerabilities
docker scout cves myapp:latest --only-package-type npm

# See which npm packages need updates
docker scout cves myapp:latest --format json | \
  jq '.vulnerabilities[] | select(.packageType == "npm") | {package: .packageName, installed: .installedVersion, fixed: .fixedVersion}'
```

Fix application dependencies before building.

```bash
# Update vulnerable npm packages
npm audit fix

# For breaking updates that npm audit fix cannot handle
npm audit fix --force

# Check what would be updated
npm audit
```

## Comparing Before and After

Use Scout's compare feature to verify that your fixes actually reduced vulnerabilities.

```bash
# Build the fixed image with a new tag
docker build -t myapp:fixed .

# Compare the fixed image against the original
docker scout compare myapp:fixed --to myapp:latest

# Example output:
#   Comparing myapp:fixed to myapp:latest
#   Vulnerabilities:
#     Critical:  2 -> 0  (-2)
#     High:      8 -> 1  (-7)
#     Medium:   15 -> 10 (-5)
#     Low:      22 -> 18 (-4)
#   Packages changed: 14 updated, 2 removed
```

## Step-by-Step Remediation Workflow

Follow this systematic approach to fix vulnerabilities in an existing image.

```bash
#!/bin/bash
# remediate.sh - Systematic vulnerability remediation workflow

set -euo pipefail

IMAGE="myapp:latest"
FIXED_IMAGE="myapp:remediated"

echo "Step 1: Baseline scan"
echo "===================="
docker scout cves "$IMAGE" --only-severity critical,high
BASELINE_CRITICAL=$(docker scout cves "$IMAGE" --format json | jq '[.vulnerabilities[] | select(.severity == "critical")] | length')
BASELINE_HIGH=$(docker scout cves "$IMAGE" --format json | jq '[.vulnerabilities[] | select(.severity == "high")] | length')
echo "Baseline: $BASELINE_CRITICAL critical, $BASELINE_HIGH high"
echo ""

echo "Step 2: Get recommendations"
echo "=========================="
docker scout recommendations "$IMAGE"
echo ""

echo "Step 3: Check for base image updates"
echo "==================================="
docker scout recommendations "$IMAGE" --format json | \
  jq '.baseImageRecommendations // empty'
echo ""

echo "Step 4: Check fixable vulnerabilities"
echo "===================================="
docker scout cves "$IMAGE" --only-fixed --only-severity critical,high
echo ""

echo "Step 5: Build remediated image"
echo "============================="
echo "Apply the recommended changes to your Dockerfile, then run:"
echo "  docker build --pull --no-cache -t $FIXED_IMAGE ."
echo ""

echo "Step 6: Verify fixes"
echo "==================="
echo "After rebuilding, run:"
echo "  docker scout compare $FIXED_IMAGE --to $IMAGE"
```

## Handling Unfixable Vulnerabilities

Not all vulnerabilities have fixes available. Scout helps you understand and manage these.

```bash
# List vulnerabilities with no fix available
docker scout cves myapp:latest --only-unfixed --only-severity critical,high

# Get details about unfixed vulnerabilities
docker scout cves myapp:latest --only-unfixed --format json | \
  jq '.vulnerabilities[] | {cve: .cveId, severity: .severity, package: .packageName, description: .description}'
```

Strategies for unfixed vulnerabilities:

**Switch to a different base image.** A vulnerability in Alpine might not exist in Debian, or vice versa.

```bash
# Compare vulnerability counts across base image variants
for base in "node:20-alpine" "node:20-slim" "node:20-bookworm-slim"; do
    echo "=== $base ==="
    docker scout cves "$base" --only-severity critical,high --only-unfixed 2>&1 | tail -3
done
```

**Use distroless or scratch images.** Fewer packages means fewer potential vulnerabilities.

```dockerfile
# Multi-stage build that produces a minimal final image
FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Distroless has no package manager, shell, or standard Linux utilities
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["dist/index.js"]
```

**Accept the risk with documentation.** For vulnerabilities that cannot be mitigated, document the exception.

```bash
# Generate a report of accepted risks
docker scout cves myapp:latest --only-unfixed --format json | \
  jq '.vulnerabilities[] | select(.severity == "high" or .severity == "critical")' > accepted-risks.json
```

## Automating Remediation

Set up automated processes that apply Scout recommendations.

```yaml
# .github/workflows/auto-remediate.yml
name: Auto-Remediate Vulnerabilities

on:
  schedule:
    # Run weekly on Monday at 9 AM
    - cron: '0 9 * * 1'
  workflow_dispatch:

jobs:
  remediate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Check for base image updates
        id: check
        run: |
          docker build -t myapp:current .
          RECS=$(docker scout recommendations myapp:current --format json 2>/dev/null || echo "{}")
          # Check if a newer base image is available
          CURRENT_BASE=$(echo "$RECS" | jq -r '.currentBaseImage // empty')
          RECOMMENDED_BASE=$(echo "$RECS" | jq -r '.recommendedBaseImage // empty')
          if [ -n "$RECOMMENDED_BASE" ] && [ "$CURRENT_BASE" != "$RECOMMENDED_BASE" ]; then
            echo "update_available=true" >> $GITHUB_OUTPUT
            echo "recommended=$RECOMMENDED_BASE" >> $GITHUB_OUTPUT
          else
            echo "update_available=false" >> $GITHUB_OUTPUT
          fi

      - name: Update Dockerfile
        if: steps.check.outputs.update_available == 'true'
        run: |
          # Update the FROM instruction with the recommended base image
          RECOMMENDED="${{ steps.check.outputs.recommended }}"
          sed -i "1s|^FROM .*|FROM $RECOMMENDED|" Dockerfile
          echo "Updated Dockerfile to use $RECOMMENDED"

      - name: Create pull request
        if: steps.check.outputs.update_available == 'true'
        uses: peter-evans/create-pull-request@v6
        with:
          title: "Update base image to ${{ steps.check.outputs.recommended }}"
          body: |
            Docker Scout recommends updating the base image to reduce vulnerabilities.

            **Recommended base image:** ${{ steps.check.outputs.recommended }}

            Please review the changes and run tests before merging.
          branch: auto-remediate/base-image-update
          commit-message: "chore: update base image per Docker Scout recommendation"
```

## Tracking Remediation Progress

Monitor how your vulnerability count changes over time.

```bash
# Save scan results with timestamps for tracking
DATE=$(date +%Y-%m-%d)
docker scout cves myapp:latest --format json > "scans/scan-${DATE}.json"

# Generate a trend summary
for scan in scans/scan-*.json; do
    date=$(basename "$scan" | sed 's/scan-\(.*\)\.json/\1/')
    critical=$(jq '[.vulnerabilities[] | select(.severity == "critical")] | length' "$scan")
    high=$(jq '[.vulnerabilities[] | select(.severity == "high")] | length' "$scan")
    echo "$date: critical=$critical, high=$high"
done
```

Docker Scout Recommendations turn vulnerability scan results into a clear action plan. Start with base image updates for the biggest impact, then address package-level fixes, and finally handle application dependencies. By following recommendations systematically, you can drive your vulnerability count down steadily over time.
