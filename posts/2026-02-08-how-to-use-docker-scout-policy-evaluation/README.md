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
- Packages must use compliant licenses
- Images should define a non-root default user
- Images must use approved base images

Docker Scout provides built-in policies and lets you create custom ones tailored to your organization.

## Viewing Built-in Policies

Docker Scout includes default policies that represent common security best practices.

```bash
# View policy details for a specific image
docker scout policy --org myorg myapp:latest

# View policy details for a specific platform
docker scout policy --org myorg --platform linux/amd64 myapp:latest
```

The built-in policies typically include:

- **No fixable critical or high vulnerabilities**: Fails if fixable critical or high-severity CVEs exist
- **Up-to-date base images**: Fails if a newer version of the base image is available
- **Supply chain attestation**: Checks for provenance and SBOM attestations
- **No outdated base images**: Flags images using end-of-life base images

## Evaluating an Image Against Policies

Run policy evaluation to see if an image meets all defined policies.

```bash
# Evaluate an image against all policies
docker scout policy --org myorg myapp:latest

# Evaluate against a specific policy
docker scout policy --org myorg myapp:latest --only-policy "<policy-name>"

# Write the policy report to a file
docker scout policy --org myorg myapp:latest --output policy-results.txt
```

The output shows a pass/fail status for each policy along with details about why a policy failed.

```bash
# Example output:
#   Status |                  Policy                             |           Results
#   OK     | No copyleft licenses                                |    0 packages
#   FAILED | No fixable critical or high vulnerabilities         |    2C     1H     0M     0L
#   N/A    | No outdated base images                             |    No data
#   FAILED | Supply chain attestations                           |    2 deviations
```

## Configuring Custom Policies

Create custom policies through the Docker Scout Dashboard. Docker Scout custom policies are configured from supported policy types, and the available parameters depend on the policy type.

### Policy for Zero Critical Vulnerabilities

Use a Severity-Based Vulnerability policy and configure the severities to include `Critical`. If you only want to fail on vulnerabilities that can be remediated, enable the fixable vulnerabilities option.

### Policy for Maximum Vulnerability Age

Docker Scout's built-in policy types focus on policy categories such as vulnerability severity, licenses, base image freshness, high-profile vulnerabilities, attestations, non-root users, approved base images, SonarQube quality gates, and Docker Hardened Images. Age-based vulnerability SLAs should be tracked with your vulnerability management workflow or exception process.

### Policy for Approved Base Images

Use the Approved Base Images policy type and configure approved base image sources. Docker Hub image patterns must include the `docker.io` prefix, for example:

```text
docker.io/library/node:*-slim
docker.io/library/python:3.12-slim
docker.io/library/golang:*-alpine
gcr.io/distroless/*
```

### Policy for Forbidden Packages

Docker Scout does not currently expose a general package denylist policy type. Use Docker Scout's package and vulnerability reports to identify unwanted packages, and enforce package allowlists or denylists with a complementary policy tool if your organization requires that control.

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
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Docker Scout Policy Evaluation
        uses: docker/scout-action@v1
        with:
          command: compare
          image: myapp:${{ github.sha }}
          to-env: production
          organization: myorg
          only-severities: critical,high
          # Fail the pipeline if policy compliance worsened
          exit-on: policy

      - name: Generate policy report
        if: always()
        run: |
          docker scout policy --org myorg myapp:${{ github.sha }} --output policy-report.txt

      - name: Upload policy report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: policy-report
          path: policy-report.txt
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

# Check for policy failures. docker scout policy can return exit code 2
# when --exit-code is set and policies are not met.
if docker scout policy --org myorg --exit-code "$IMAGE"; then
    FAILED_POLICIES=0
else
    STATUS=$?
    if [ "$STATUS" -eq 2 ]; then
        FAILED_POLICIES=1
    else
        exit "$STATUS"
    fi
fi

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
# Check policy status for a repository
docker scout policy --org myorg myorg/myapp

# Check a specific image
docker scout policy --org myorg myorg/myapp:latest

# Export a policy report
docker scout policy --org myorg myorg/myapp:latest --output policy-report.txt
```

## Policy Evaluation with Environment Context

Different environments give you different comparison baselines. For example, you can compare a candidate image against the image currently recorded in production or staging.

```bash
# Compare a repository to the image in the production environment
docker scout policy --org myorg myorg/myapp --to-env production

# Compare a repository to the image in the staging environment
docker scout policy --org myorg myorg/myapp --to-env staging
```

Docker Scout environments let you compare policy status for a repository against the image recorded in an environment, such as `production` or `staging`.

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
# After:  FROM node:20-alpine (pulls the current patch for that tag)
```

### Fixing Base Image Policies

```bash
# Check what base image the image uses
docker scout policy --org myorg myapp:latest --only-policy "<base-image-policy-name>"

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
RUN npm ci --omit=dev
CMD ["node", "dist/index.js"]
```

## Reporting and Auditing

Generate compliance reports for auditing and management review.

```bash
# Generate a policy report file
docker scout policy --org myorg myapp:latest --output policy-report.txt
```

Docker Scout policies transform security scanning from a reactive process into a proactive one. Instead of asking "what vulnerabilities does this image have?", you define "what does a compliant image look like?" and let Scout enforce it automatically across every image in your organization.
