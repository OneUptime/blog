# How to Scan Docker Images for Vulnerabilities with Trivy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Trivy, Vulnerability Scanning, DevSecOps

Description: Learn how to scan Docker images for security vulnerabilities using Trivy, integrate scanning into CI/CD pipelines, and interpret scan results to prioritize fixes.

---

Every Docker image you pull or build contains software that might have known security vulnerabilities. Scanning images before deployment catches these issues early, preventing vulnerable code from reaching production. Trivy is a comprehensive, easy-to-use scanner that's become the industry standard for container security.

## Why Scan Docker Images?

Container images contain:
- Base OS packages (often outdated)
- Application dependencies (npm, pip, gems)
- Configuration files (potentially with secrets)
- Your application code

Any of these can contain:
- Known CVEs (Common Vulnerabilities and Exposures)
- Misconfigurations
- Exposed secrets
- License compliance issues

## Installing Trivy

### macOS

```bash
brew install trivy
```

### Linux

```bash
# Debian/Ubuntu
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# RHEL/CentOS
sudo rpm -ivh https://github.com/aquasecurity/trivy/releases/download/v0.48.0/trivy_0.48.0_Linux-64bit.rpm
```

### Docker (No Installation Required)

```bash
# Run Trivy as a container
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image nginx:latest
```

## Basic Image Scanning

### Scan a Local Image

```bash
# Scan an image
trivy image nginx:latest

# Scan with specific severity filter
trivy image --severity HIGH,CRITICAL nginx:latest

# Scan image by digest
trivy image nginx@sha256:abc123...
```

### Scan Before Pulling

Trivy can scan images from registries without pulling them first.

```bash
# Scan from Docker Hub
trivy image python:3.11

# Scan from private registry
trivy image registry.company.com/myapp:v1.0
```

### Understanding Scan Output

```
nginx:latest (debian 11.6)
===========================
Total: 142 (UNKNOWN: 0, LOW: 85, MEDIUM: 43, HIGH: 12, CRITICAL: 2)

+------------------+------------------+----------+-------------------+---------------+
|     LIBRARY      | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |
+------------------+------------------+----------+-------------------+---------------+
| libssl1.1        | CVE-2023-0286    | CRITICAL | 1.1.1n-0+deb11u3  | 1.1.1n-0+deb11u4 |
| curl             | CVE-2023-27534   | HIGH     | 7.74.0-1.3+deb11u7| 7.74.0-1.3+deb11u8 |
+------------------+------------------+----------+-------------------+---------------+
```

| Column | Description |
|--------|-------------|
| LIBRARY | Vulnerable package name |
| VULNERABILITY ID | CVE identifier |
| SEVERITY | CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN |
| INSTALLED VERSION | Current version in the image |
| FIXED VERSION | Version that fixes the vulnerability |

## Filtering Results

### By Severity

```bash
# Only CRITICAL vulnerabilities
trivy image --severity CRITICAL nginx:latest

# HIGH and CRITICAL
trivy image --severity HIGH,CRITICAL nginx:latest
```

### Ignore Unfixed Vulnerabilities

Some vulnerabilities don't have fixes yet. Filter them out to focus on actionable issues.

```bash
trivy image --ignore-unfixed nginx:latest
```

### Using .trivyignore

Create a `.trivyignore` file to skip specific vulnerabilities (with justification).

```
# .trivyignore

# False positive - not exploitable in our context
CVE-2023-12345

# Accepted risk - no fix available, mitigated by network policy
CVE-2023-67890

# Will be fixed in next release
CVE-2023-11111
```

```bash
trivy image --ignorefile .trivyignore nginx:latest
```

## Output Formats

### JSON Output

```bash
trivy image -f json -o results.json nginx:latest

# Process with jq
trivy image -f json nginx:latest | jq '.Results[].Vulnerabilities[] | select(.Severity == "CRITICAL")'
```

### SARIF (for GitHub Security)

```bash
trivy image -f sarif -o trivy-results.sarif nginx:latest
```

### Table (Default)

```bash
trivy image -f table nginx:latest
```

### Template Output

```bash
# Custom template
trivy image -f template --template "@contrib/html.tpl" -o report.html nginx:latest
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Fail on critical vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          exit-code: '1'
          severity: 'CRITICAL'
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - scan

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

trivy-scan:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --exit-code 1 --severity CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: false
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t myapp:${BUILD_NUMBER} .'
            }
        }
        stage('Security Scan') {
            steps {
                sh '''
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy image \
                        --exit-code 1 \
                        --severity CRITICAL,HIGH \
                        myapp:${BUILD_NUMBER}
                '''
            }
        }
    }
}
```

## Scanning Dockerfiles and IaC

Trivy scans more than just images.

### Dockerfile Scanning

```bash
# Scan Dockerfile for misconfigurations
trivy config Dockerfile

# Example output:
# Dockerfile (dockerfile)
# =======================
# Tests: 23 (SUCCESSES: 21, FAILURES: 2)
# Failures: 2 (LOW: 0, MEDIUM: 1, HIGH: 1)
#
# HIGH: Specify a tag in the 'FROM' statement
# MEDIUM: Use COPY instead of ADD
```

### File System Scanning

```bash
# Scan a directory for vulnerabilities in dependencies
trivy fs ./my-project

# Scans package.json, requirements.txt, go.mod, etc.
```

## Caching for Faster Scans

Trivy downloads vulnerability databases on first run. Cache them for faster subsequent scans.

```bash
# Download database explicitly
trivy image --download-db-only

# Use specific cache directory
trivy image --cache-dir /tmp/trivy-cache nginx:latest

# Skip database update (use existing cache)
trivy image --skip-db-update nginx:latest
```

### Docker Volume for Cache

```bash
docker run --rm \
  -v trivy-cache:/root/.cache/ \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image nginx:latest
```

## Practical Workflow

### Pre-Build: Scan Base Image

```bash
# Before writing Dockerfile, check base image
trivy image --severity HIGH,CRITICAL python:3.11-slim

# Compare alternatives
trivy image python:3.11-slim
trivy image python:3.11-alpine
trivy image cgr.dev/chainguard/python:latest
```

### Post-Build: Scan Your Image

```bash
# Build and scan
docker build -t myapp:dev .
trivy image --severity HIGH,CRITICAL myapp:dev
```

### Pre-Deploy: Gate on Critical Issues

```bash
# Fail if critical vulnerabilities exist
trivy image --exit-code 1 --severity CRITICAL myapp:v1.0

# If exit code is 0, safe to deploy
# If exit code is 1, vulnerabilities found
```

## Fixing Vulnerabilities

### Update Base Image

```dockerfile
# Before: old base image
FROM python:3.9

# After: newer base image with patches
FROM python:3.11-slim
```

### Update Dependencies

```dockerfile
# Add security updates in Dockerfile
FROM debian:bullseye

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### Pin to Fixed Versions

```dockerfile
# package.json - pin to patched versions
{
  "dependencies": {
    "lodash": ">=4.17.21",
    "axios": ">=1.6.0"
  }
}
```

### Use Minimal Base Images

```dockerfile
# Fewer packages = fewer vulnerabilities
FROM gcr.io/distroless/nodejs:18
# or
FROM alpine:3.19
```

## Summary

| Command | Purpose |
|---------|---------|
| `trivy image nginx:latest` | Basic scan |
| `trivy image --severity CRITICAL` | Filter by severity |
| `trivy image --ignore-unfixed` | Skip vulnerabilities without fixes |
| `trivy image -f json -o results.json` | JSON output for automation |
| `trivy image --exit-code 1` | Fail CI if vulnerabilities found |
| `trivy config Dockerfile` | Scan Dockerfile for misconfigurations |
| `trivy fs ./project` | Scan project dependencies |

Integrate Trivy into your CI/CD pipeline to catch vulnerabilities before they reach production. Start by scanning for CRITICAL issues and expand coverage as your security posture matures.
