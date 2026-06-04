# How to Use docker scout Commands for Security Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Scout, Security, Vulnerability Scanning, CVE, Container Security, DevOps

Description: Learn how to use Docker Scout commands to scan images for vulnerabilities, analyze dependencies, and enforce security policies.

---

Docker Scout is Docker's built-in security analysis tool. It scans your container images for known vulnerabilities (CVEs), analyzes software dependencies, and provides actionable recommendations. Unlike external scanning tools, Scout integrates directly into the Docker CLI, making it easy to build security checks into your development workflow.

This guide covers the core Docker Scout commands with practical examples for development and CI/CD environments.

## Getting Started

Docker Scout ships with Docker Desktop. Verify it is available:

```bash
docker scout version
```

If you are on Linux without Docker Desktop, install the Scout CLI plugin:

```bash
curl -fsSL https://raw.githubusercontent.com/docker/scout-cli/main/install.sh -o install-scout.sh
sh install-scout.sh
```

You need a Docker account to use Scout. Log in first:

```bash
docker login
```

## Scanning Images for Vulnerabilities

The `cves` command scans an image and lists all known vulnerabilities.

Scan a local image for CVEs:

```bash
docker scout cves my-app:latest
```

Scan an image from Docker Hub without pulling it first:

```bash
docker scout cves nginx:latest
```

The output groups vulnerabilities by severity: Critical, High, Medium, and Low. Each entry includes the CVE ID, affected package, installed version, and fixed version.

Filter results to show only critical and high severity vulnerabilities:

```bash
docker scout cves --only-severity critical,high my-app:latest
```

Output results in SARIF JSON for processing in CI pipelines:

```bash
docker scout cves --format sarif --output scout-results.sarif.json my-app:latest
```

Filter by a specific CVE ID to check if your image is affected:

```bash
docker scout cves --only-cve-id CVE-2024-1234 my-app:latest
```

Scan a specific platform variant for multi-arch images:

```bash
docker scout cves --platform linux/amd64 my-app:latest
```

## Generating SBOM (Software Bill of Materials)

Scout can produce a complete inventory of every software package inside your image.

Generate an SBOM for an image:

```bash
docker scout sbom my-app:latest
```

Output the SBOM in SPDX format for compliance requirements:

```bash
docker scout sbom --format spdx my-app:latest
```

Output in JSON for programmatic processing:

```bash
docker scout sbom --format json my-app:latest > sbom.json
```

The SBOM lists every OS package, language-specific dependency, and their versions. This is valuable for license compliance and audit trails.

## Quick Overview

Get a high-level summary of an image's security posture:

```bash
docker scout quickview my-app:latest
```

This prints a concise table showing the total number of vulnerabilities broken down by severity level. It is the fastest way to assess an image's health.

If Scout detects base image metadata, quickview can also show base image refresh and update recommendations:

```bash
docker scout quickview my-app:latest
```

## Viewing Recommendations

Scout does not just find problems - it suggests fixes. The `recommendations` command tells you which base image refreshes or updates can reduce vulnerabilities or image size.

Get upgrade recommendations for an image:

```bash
docker scout recommendations my-app:latest
```

The output might suggest upgrading from `node:20.5` to `node:20.11-alpine` because the newer version fixes 15 vulnerabilities. These are actionable suggestions you can apply immediately.

## Comparing Images

Compare two image versions to see what vulnerabilities were added or fixed.

Compare your current build against the previous version:

```bash
docker scout compare my-app:v2.0 --to my-app:v1.9
```

This shows newly introduced vulnerabilities, fixed vulnerabilities, and unchanged ones. Run this in your CI pipeline to ensure new builds do not regress on security.

Compare against a specific base image:

```bash
docker scout compare my-app:latest --to node:20-alpine
```

## Analyzing Image Layers

See which layer introduced which packages and vulnerabilities:

```bash
docker scout cves --locations --only-severity critical my-app:latest
```

Understanding which layer or file path introduced a vulnerability helps you fix it. If a vulnerability comes from the base image, switch to a patched base. If it comes from your `RUN apt-get install` step, update the package.

## Setting Up Policies

Docker Scout supports policies that define security standards for your images. You configure these through the Docker Scout dashboard, and then check compliance from the CLI.

Check if an image meets your organization's security policies:

```bash
docker scout policy my-app:latest
```

This reports whether the image passes or fails each configured policy, such as "no critical CVEs" or "base image must be updated within 30 days."

## Integrating Scout into CI/CD

Here is a practical CI/CD integration that fails the build when critical vulnerabilities are found.

A shell script that scans an image and exits with an error if critical CVEs exist:

```bash
#!/bin/bash
# scan-and-gate.sh

# Fails CI if critical vulnerabilities are found

IMAGE="$1"

if [ -z "$IMAGE" ]; then
  echo "Usage: ./scan-and-gate.sh <image:tag>"
  exit 1
fi

echo "Scanning $IMAGE for vulnerabilities..."

# Fail if any critical vulnerabilities exist
docker scout cves --only-severity critical --exit-code "$IMAGE"
SCOUT_EXIT=$?

if [ "$SCOUT_EXIT" -eq 0 ]; then
  echo "PASSED: No critical vulnerabilities"
elif [ "$SCOUT_EXIT" -eq 2 ]; then
  echo "FAILED: Critical vulnerabilities found"
  docker scout cves --only-severity critical "$IMAGE"
  exit 1
else
  echo "FAILED: Docker Scout scan failed"
  exit "$SCOUT_EXIT"
fi

# Warn on high vulnerabilities but don't fail
docker scout cves --only-severity high --exit-code "$IMAGE" >/dev/null
SCOUT_EXIT=$?

if [ "$SCOUT_EXIT" -eq 2 ]; then
  echo "WARNING: High severity vulnerabilities found"
  docker scout cves --only-severity high "$IMAGE"
elif [ "$SCOUT_EXIT" -ne 0 ]; then
  echo "FAILED: Docker Scout scan failed"
  exit "$SCOUT_EXIT"
fi

echo "PASSED: Scan completed"
exit 0
```

A GitHub Actions workflow that runs Scout scanning:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  push:
    branches: [main]
  pull_request:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t my-app:scan .

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Scout quickview
        run: docker scout quickview my-app:scan

      - name: Scout CVE scan
        run: docker scout cves --only-severity critical --exit-code my-app:scan

      - name: Scout recommendations
        run: docker scout recommendations my-app:scan
```

## Reducing Vulnerabilities in Practice

After scanning, here is a systematic approach to reducing your vulnerability count.

Start with your base image. Switch to minimal images:

```dockerfile
# Instead of this (hundreds of packages, many vulnerabilities)
FROM node:20

# Use this (minimal packages, fewer vulnerabilities)
FROM node:20-alpine

# Or for maximum security, use distroless
FROM gcr.io/distroless/nodejs20-debian12
```

Update your base image regularly. Pin to a specific version but update frequently:

```dockerfile
# Pin the version for reproducibility
FROM node:20.11-alpine3.19

# Update by changing the pin regularly
```

Remove unnecessary packages from your final image:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Use a clean final stage with only runtime dependencies
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "dist/server.js"]
```

After making changes, scan again to verify improvement:

```bash
docker scout compare my-app:v2-fixed --to my-app:v2
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker scout cves` | Scan for vulnerabilities |
| `docker scout quickview` | High-level security summary |
| `docker scout sbom` | Generate software bill of materials |
| `docker scout recommendations` | Get upgrade suggestions |
| `docker scout compare` | Compare two image versions |
| `docker scout policy` | Check policy compliance |
| `docker scout version` | Show Scout version |

## Conclusion

Docker Scout brings vulnerability scanning directly into your development workflow. Scan every image before pushing to production. Use `quickview` for fast assessments and `cves` for detailed analysis. Set up CI/CD gates that reject images with critical vulnerabilities. Follow the recommendations to upgrade base images and reduce your attack surface. Security scanning is not a one-time task - integrate it into every build and make it a regular part of your development process.
