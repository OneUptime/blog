# How to Use Docker Scout CLI Commands

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Scout, CLI, Security, Vulnerability Scanning, SBOM, DevOps

Description: A complete reference guide to Docker Scout CLI commands for vulnerability scanning, SBOM generation, and image analysis.

---

Docker Scout's CLI gives you full control over image analysis, vulnerability scanning, and policy evaluation from the terminal. While Docker Desktop's GUI provides a visual overview, the CLI is where you get the precision needed for scripting, CI/CD integration, and detailed investigation of specific vulnerabilities.

This guide covers the most common Docker Scout CLI commands with practical examples, common flags, and real-world usage patterns.

## Installation and Setup

Docker Scout CLI comes bundled with Docker Desktop 4.17+. If you need to install it separately, use the official install script.

```bash
# Install Docker Scout CLI plugin

curl -sSfL https://raw.githubusercontent.com/docker/scout-cli/main/install.sh | sh -s --

# Verify installation
docker scout version

# Login to Docker Hub (required for full functionality)
docker login
```

Docker Scout CLI uses Docker Hub authentication for access to Docker Scout services. Login is especially important in CI/CD, and policy evaluation and organizational features need it.

## docker scout cves

The `cves` command is the core scanning command. It analyzes an image and reports known vulnerabilities.

### Basic Usage

```bash
# Scan a local image
docker scout cves myapp:latest

# Scan a remote image from a registry
docker scout cves registry://nginx:1.25

# Scan a specific image by digest
docker scout cves myapp@sha256:abc123def456
```

### Filtering Results

```bash
# Show only critical and high severity vulnerabilities
docker scout cves myapp:latest --only-severity critical,high

# Show only vulnerabilities that have a fix available
docker scout cves myapp:latest --only-fixed

# Show only unfixed vulnerabilities
docker scout cves myapp:latest --only-unfixed

# Filter by specific package
docker scout cves myapp:latest --only-package openssl

# Filter by package type (apk, deb, rpm, npm, pypi, golang, etc.)
docker scout cves myapp:latest --only-package-type npm

# Filter by specific CVE ID
docker scout cves myapp:latest --only-cve-id CVE-2024-1234

# Combine multiple filters
docker scout cves myapp:latest \
  --only-severity critical,high \
  --only-fixed \
  --only-package-type apk
```

### Output Formats

```bash
# Default package-grouped text format (human-readable)
docker scout cves myapp:latest

# GitLab format for GitLab vulnerability report integration
docker scout cves myapp:latest --format gitlab --output gl-container-scanning-report.json

# SARIF format for GitHub Code Scanning integration
docker scout cves myapp:latest --format sarif --output results.sarif.json

# SPDX format for vulnerability data in SPDX JSON
docker scout cves myapp:latest --format spdx --output vulnerabilities.spdx.json

# Markdown format for documentation or PR comments
docker scout cves myapp:latest --format markdown

# Write output to a file
docker scout cves myapp:latest --format markdown --output scan-results.md
```

### Exit Codes for CI/CD

```bash
# Exit with code 2 if vulnerabilities matching the filter are found
docker scout cves myapp:latest --exit-code --only-severity critical

# Use in conditional logic
if docker scout cves myapp:latest --exit-code --only-severity critical,high; then
    echo "Image passed security scan"
else
    echo "Vulnerabilities found, blocking deployment"
fi
```

### Multi-Platform Scanning

```bash
# Scan a specific platform variant
docker scout cves myapp:latest --platform linux/amd64
docker scout cves myapp:latest --platform linux/arm64

# Different platforms may have different vulnerability counts
# because OS packages differ between architectures
```

## docker scout sbom

Generate a Software Bill of Materials (SBOM) that lists every component in an image.

```bash
# Generate SBOM in the default format
docker scout sbom myapp:latest

# SPDX format (industry standard for compliance)
docker scout sbom myapp:latest --format spdx

# CycloneDX format (another industry standard)
docker scout sbom myapp:latest --format cyclonedx

# JSON format for custom processing
docker scout sbom myapp:latest --format json

# Simple list of all packages
docker scout sbom myapp:latest --format list

# Save SBOM to a file
docker scout sbom myapp:latest --format spdx --output sbom.spdx.json
```

### Analyzing the SBOM

```bash
# Generate a human-readable package list
docker scout sbom myapp:latest --format list

# List all APK packages
docker scout sbom myapp:latest --format list --only-package-type apk

# List all npm dependencies
docker scout sbom myapp:latest --format list --only-package-type npm

# Save the default JSON SBOM for custom processing
docker scout sbom myapp:latest --format json --output sbom.json
```

## docker scout compare

Compare two images to see how vulnerabilities and packages changed between them.

```bash
# Compare two versions of the same image
docker scout compare myapp:v2.0 --to myapp:v1.0

# Compare your image against a base image
docker scout compare myapp:latest --to node:20-alpine

# Compare against a remote image
docker scout compare myapp:latest --to registry.example.com/myapp:production

# Markdown output for reports or PR comments
docker scout compare myapp:v2.0 --to myapp:v1.0 --format markdown --output comparison.md

# Filter comparison to specific severities
docker scout compare myapp:v2.0 --to myapp:v1.0 --only-severity critical,high
```

### Understanding Compare Output

```bash
# The compare output shows:
# - New vulnerabilities (introduced in the newer image)
# - Fixed vulnerabilities (resolved in the newer image)
# - Unchanged vulnerabilities (present in both)
# - Package changes (added, removed, updated)

# Show only fixable vulnerabilities
docker scout compare myapp:v2.0 --to myapp:v1.0 --only-fixed

# Hide unchanged packages to focus on differences
docker scout compare myapp:v2.0 --to myapp:v1.0 --ignore-unchanged
```

## docker scout recommendations

Get actionable recommendations for reducing vulnerabilities.

```bash
# Get recommendations for an image
docker scout recommendations myapp:latest

# Save recommendations to a file
docker scout recommendations myapp:latest --output recommendations.txt

# Focus on base image update recommendations
docker scout recommendations myapp:latest --only-update
```

### Applying Recommendations

```bash
# See what base image Scout recommends
docker scout recommendations myapp:latest

# Typical output:
#   Recommended base image update:
#     Current: node:20.8-alpine3.18 (12 vulnerabilities)
#     Recommended: node:20-alpine (3 vulnerabilities)
#     Fixes: 9 vulnerabilities (2 critical, 4 high, 3 medium)

# Update your Dockerfile with the recommended base image, rebuild, and verify
docker build --pull --no-cache -t myapp:updated .
docker scout compare myapp:updated --to myapp:latest
```

## docker scout policy

Evaluate images against organizational security policies.

```bash
# Evaluate an image against all policies
docker scout policy myapp:latest

# Evaluate for a specific organization
docker scout policy myapp:latest --org myorg

# Compare policy results for a repository in a specific environment
docker scout policy myorg/myapp --to-env production

# Write policy output to a file
docker scout policy myapp:latest --output policy-results.txt

# Exit with non-zero code if policies fail
docker scout policy myapp:latest --exit-code
```

## docker scout quickview

Get a quick summary of an image's security status.

```bash
# Quick vulnerability overview
docker scout quickview myapp:latest

# Quick view of a remote image
docker scout quickview nginx:latest

# This provides a condensed summary of image and base-image vulnerabilities,
# plus base image refresh or update recommendations when available.
```

## docker scout enroll and docker scout repo

Manage Scout enrollment for your repositories.

```bash
# Enroll your Docker Hub organization with Scout
docker scout enroll myorg

# Enable Scout for a specific repository
docker scout repo enable myorg/myapp

# Disable Scout for a repository
docker scout repo disable myorg/myapp

# List Scout repositories
docker scout repo list --org myorg
```

## docker scout cache

Manage the local Scout cache for faster repeated scans.

```bash
# Clear temporary Scout data
docker scout cache prune

# Clear temporary data and cached SBOMs
docker scout cache prune --sboms
```

## Practical Command Combinations

### Full Security Audit

```bash
#!/bin/bash
# full-audit.sh - Complete Docker Scout security audit

IMAGE="${1:?Usage: $0 <image:tag>}"

echo "=== Docker Scout Full Audit: $IMAGE ==="
echo ""

echo "--- Quick Overview ---"
docker scout quickview "$IMAGE"
echo ""

echo "--- SBOM Package List ---"
docker scout sbom "$IMAGE" --format list
echo ""

echo "--- Vulnerability Scan ---"
docker scout cves "$IMAGE" --only-severity critical,high
echo ""

echo "--- Recommendations ---"
docker scout recommendations "$IMAGE"
echo ""

echo "--- Policy Evaluation ---"
docker scout policy "$IMAGE" || true
echo ""

echo "=== Audit Complete ==="
```

### Before/After Comparison Script

```bash
#!/bin/bash
# compare-fix.sh - Compare images before and after a fix

BEFORE="${1:?Usage: $0 <before-image> <after-image>}"
AFTER="${2:?Usage: $0 <before-image> <after-image>}"

echo "Comparing: $AFTER (new) vs $BEFORE (old)"
echo ""

# Check whether vulnerabilities exist in each severity
echo "Before:"
for sev in critical high medium low; do
    if docker scout cves "$BEFORE" --only-severity "$sev" --exit-code >/dev/null 2>&1; then
        echo "  $sev: none detected"
    else
        echo "  $sev: detected"
    fi
done

echo ""
echo "After:"
for sev in critical high medium low; do
    if docker scout cves "$AFTER" --only-severity "$sev" --exit-code >/dev/null 2>&1; then
        echo "  $sev: none detected"
    else
        echo "  $sev: detected"
    fi
done

echo ""
echo "Detailed comparison:"
docker scout compare "$AFTER" --to "$BEFORE"
```

### Daily Monitoring Script

```bash
#!/bin/bash
# daily-scan.sh - Scan production images and report changes

IMAGES=(
    "registry.example.com/api:latest"
    "registry.example.com/web:latest"
    "registry.example.com/worker:latest"
)

REPORT_DIR="./daily-scans/$(date +%Y-%m-%d)"
mkdir -p "$REPORT_DIR"

for IMAGE in "${IMAGES[@]}"; do
    SAFE_NAME=$(echo "$IMAGE" | tr '/:' '__')
    echo "Scanning $IMAGE..."

    # Run scan and save results
    docker scout cves "$IMAGE" --format sarif --output "$REPORT_DIR/${SAFE_NAME}.sarif.json" 2>/dev/null

    # Check critical and high vulnerabilities for alerting
    if docker scout cves "$IMAGE" --only-severity critical,high --exit-code >/dev/null 2>&1; then
        echo "  $IMAGE: no critical or high vulnerabilities detected"
    else
        echo "  $IMAGE: critical or high vulnerabilities detected"
    fi
done

echo ""
echo "Reports saved to $REPORT_DIR"
```

## Command Reference Summary

| Command | Purpose |
|---------|---------|
| `docker scout cves` | Scan for vulnerabilities |
| `docker scout sbom` | Generate Software Bill of Materials |
| `docker scout compare` | Compare two images |
| `docker scout recommendations` | Get fix recommendations |
| `docker scout policy` | Evaluate against policies |
| `docker scout quickview` | Quick security summary |
| `docker scout enroll` | Enroll organization with Scout |
| `docker scout repo` | Manage repository enrollment |
| `docker scout cache` | Manage local cache |
| `docker scout version` | Show Scout CLI version |

The Docker Scout CLI provides everything you need for comprehensive container security analysis. Master these commands and you can build automated security workflows that scan, compare, recommend, and enforce policies across your entire container infrastructure.
