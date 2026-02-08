# How to Use Docker Scout Policy Evaluation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Scout, Policy Evaluation, Security Policy, Compliance, DevOps

Description: Define and enforce Docker Scout security policies to ensure your container images meet organizational compliance standards.

---

Individual vulnerability scans tell you what is wrong with a single image. Security policies tell you what "good" looks like across your entire organization. Docker Scout Policy Evaluation lets you define rules that all your images must meet, then automatically checks every image against those rules. Instead of manually reviewing scan results for each image, you set policies once and Scout tells you which images comply and which do not.

This guide covers creating custom policies, evaluating images against them, integrating policy checks into CI/CD, and managing policies across teams.

## What Are Docker Scout Policies?

A Docker Scout policy is a set of rules that define acceptable security posture for your images. Policies can enforce requirements like:

- No critical vulnerabilities
- Base images must be up to date
- No high-severity vulnerabilities older than 30 days
- Specific packages must not be present
- Images must use approved base images

Docker Scout provides built-in policies and lets you create custom ones tailored to your organization.

## Viewing Built-in Policies

Docker Scout includes default policies that represent common security best practices.

```bash
# View all policies for your Docker organization
docker scout policy

# View policy details for a specific image
docker scout policy myapp:latest

# List available built-in policies
docker scout policy --org myorg
```

The built-in policies typically include:

- **No critical vulnerabilities**: Fails if any critical CVE exists
- **No high vulnerabilities with fixes**: Fails if fixable high-severity CVEs exist
- **Up-to-date base images**: Fails if a newer version of the base image is available
- **Supply chain attestation**: Checks for provenance and SBOM attestations
- **No outdated base images**: Flags images using end-of-life base images

## Evaluating an Image Against Policies

Run policy evaluation to see if an image meets all defined policies.

```bash
# Evaluate an image against all policies
docker scout policy myapp:latest

# Evaluate against a specific policy
docker scout policy myapp:latest --only-policy "no-critical-vulnerabilities"

# Evaluate with detailed output showing each rule
docker scout policy myapp:latest --format json > policy-results.json
```

The output shows a pass/fail status for each policy along with details about why a policy failed.

```bash
# Example output:
#   Policy                          Status
#   No critical vulnerabilities     PASSED
#   No high vulnerabilities (fix)   FAILED  (3 fixable high CVEs)
#   Base image up to date           FAILED  (node:20.10 available, using 20.8)
#   Supply chain attestation        PASSED
```

## Configuring Custom Policies

Create custom policies through the Docker Scout Dashboard or via configuration files.

### Policy for Zero Critical Vulnerabilities

```json
{
  "name": "no-critical-cves",
  "description": "No critical vulnerabilities allowed in production images",
  "rules": [
    {
      "type": "vulnerability-severity",
      "severity": "critical",
      "max_count": 0
    }
  ]
}
```

### Policy for Maximum Vulnerability Age

```json
{
  "name": "timely-patches",
  "description": "High vulnerabilities must be fixed within 14 days of disclosure",
  "rules": [
    {
      "type": "vulnerability-age",
      "severity": "high",
      "max_age_days": 14,
      "only_fixed": true
    }
  ]
}
```

### Policy for Approved Base Images

```json
{
  "name": "approved-base-images",
  "description": "Only approved base images are allowed",
  "rules": [
    {
      "type": "base-image-allowlist",
      "allowed": [
        "node:20-alpine",
        "node:20-slim",
        "python:3.12-slim",
        "golang:1.22-alpine",
        "gcr.io/distroless/*"
      ]
    }
  ]
}
```

### Policy for Forbidden Packages

```json
{
  "name": "no-forbidden-packages",
  "description": "Certain packages must not be present in production images",
  "rules": [
    {
      "type": "package-denylist",
      "packages": [
        "curl",
        "wget",
        "netcat",
        "telnet",
        "ssh",
        "gcc",
        "make"
      ]
    }
  ]
}
```

## Policy Evaluation in CI/CD

Add policy checks to your pipeline so images that violate policies never reach production.

### GitHub Actions

```yaml
# .github/workflows/policy-check.yml
name: Docker Scout Policy Check

on:
  push:
    branches: [main]
  pull_request:

jobs:
  policy-evaluation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Docker Scout Policy Evaluation
        uses: docker/scout-action@v1
        with:
          command: policy
          image: myapp:${{ github.sha }}
          exit-code: true
          # Fail the pipeline if any policy is violated
          only-severities: critical,high

      - name: Generate policy report
        if: always()
        run: |
          docker scout policy myapp:${{ github.sha }} --format json > policy-report.json

      - name: Upload policy report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: policy-report
          path: policy-report.json
```

### Policy Gate Script

A generic script that works with any CI system.

```bash
#!/bin/bash
# policy-gate.sh - Evaluate Docker Scout policies and gate deployment

set -euo pipefail

IMAGE="${1:?Usage: $0 <image:tag>}"
STRICT_MODE="${2:-true}"

echo "=== Docker Scout Policy Evaluation ==="
echo "Image: $IMAGE"
echo "Strict mode: $STRICT_MODE"
echo ""

# Run policy evaluation and capture output
POLICY_OUTPUT=$(docker scout policy "$IMAGE" 2>&1) || true
echo "$POLICY_OUTPUT"

# Check for policy failures
FAILED_POLICIES=$(echo "$POLICY_OUTPUT" | grep -c "FAILED" || true)

if [ "$FAILED_POLICIES" -gt 0 ]; then
    echo ""
    echo "WARNING: $FAILED_POLICIES policies failed!"

    if [ "$STRICT_MODE" = "true" ]; then
        echo "Strict mode enabled. Blocking deployment."
        exit 1
    else
        echo "Strict mode disabled. Proceeding with warnings."
    fi
else
    echo ""
    echo "All policies passed. Image is compliant."
fi
```

```bash
# Use in CI
./policy-gate.sh myapp:latest true   # Strict mode - fails on violations
./policy-gate.sh myapp:latest false   # Warning mode - logs but continues
```

## Monitoring Policy Compliance Across Repositories

Track policy compliance across all your images using the Docker Scout Dashboard or CLI.

```bash
# Check policy status for all images in an organization
docker scout policy --org myorg

# Check a specific repository
docker scout policy --org myorg --repo myapp

# Export compliance report for all images
docker scout policy --org myorg --format json > org-compliance.json
```

## Policy Evaluation with Environment Context

Different environments may have different policy requirements. Production needs strict policies while development can be more relaxed.

```bash
# Evaluate against production policies
docker scout policy myapp:latest --env production

# Evaluate against staging policies (may allow more vulnerabilities)
docker scout policy myapp:latest --env staging
```

Define environment-specific policies.

```json
{
  "environments": {
    "production": {
      "policies": [
        "no-critical-cves",
        "no-high-cves-with-fixes",
        "approved-base-images",
        "no-forbidden-packages",
        "base-image-up-to-date"
      ]
    },
    "staging": {
      "policies": [
        "no-critical-cves",
        "approved-base-images"
      ]
    },
    "development": {
      "policies": [
        "no-critical-cves"
      ]
    }
  }
}
```

## Acting on Policy Failures

When an image fails a policy, the fix depends on which policy was violated.

### Fixing Vulnerability Policies

```bash
# See which vulnerabilities caused the failure
docker scout cves myapp:latest --only-severity critical,high --only-fixed

# Get fix recommendations
docker scout recommendations myapp:latest

# Common fix: update the base image
# Before: FROM node:20.8-alpine
# After:  FROM node:20-alpine (always gets latest patch)
```

### Fixing Base Image Policies

```bash
# Check what base image the image uses
docker scout policy myapp:latest --only-policy "base-image-up-to-date"

# Rebuild with the latest base image
docker build --pull --no-cache -t myapp:latest .
```

### Fixing Package Policies

```dockerfile
# Remove forbidden packages in the final stage of a multi-stage build
FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-slim AS production
WORKDIR /app
# Remove packages that should not be in production
RUN apt-get remove -y curl wget && apt-get autoremove -y
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --production
CMD ["node", "dist/index.js"]
```

## Reporting and Auditing

Generate compliance reports for auditing and management review.

```bash
# Generate a comprehensive policy report
docker scout policy myapp:latest --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Policy Compliance Report')
print('=' * 50)
for policy in data.get('policies', []):
    status = 'PASS' if policy.get('passed') else 'FAIL'
    print(f'  [{status}] {policy[\"name\"]}')
    if not policy.get('passed'):
        for violation in policy.get('violations', []):
            print(f'         - {violation[\"description\"]}')
print('=' * 50)
passed = sum(1 for p in data.get('policies', []) if p.get('passed'))
total = len(data.get('policies', []))
print(f'Result: {passed}/{total} policies passed')
"
```

Docker Scout policies transform security scanning from a reactive process into a proactive one. Instead of asking "what vulnerabilities does this image have?", you define "what does a compliant image look like?" and let Scout enforce it automatically across every image in your organization.
