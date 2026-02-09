# How to Scan Dockerfiles for Security Issues with Checkov

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Checkov, Static Analysis, DevOps, CI/CD, Dockerfile, Scanning

Description: Learn how to use Checkov to scan Dockerfiles for security misconfigurations, catch vulnerabilities before building, and integrate checks into CI/CD pipelines.

---

Building a secure Docker image starts with the Dockerfile. Misconfigurations like running as root, using the `latest` tag, or adding unnecessary capabilities create vulnerabilities before the image even runs. Checkov is a static analysis tool that scans Dockerfiles against hundreds of security policies and catches these issues before the build step. Fix the Dockerfile, not the running container.

## What Is Checkov?

Checkov is an open source static analysis tool by Bridgecrew (now part of Palo Alto Networks) that scans infrastructure-as-code files for misconfigurations. It supports Terraform, CloudFormation, Kubernetes manifests, Helm charts, and Dockerfiles. For Dockerfiles specifically, it checks against CIS Docker Benchmark recommendations and additional community policies.

## Installation

Install Checkov using pip or run it as a Docker container:

```bash
# Install with pip (Python 3.8+ required)
pip install checkov

# Or use pipx for isolated installation
pipx install checkov

# Verify the installation
checkov --version
```

For environments where you do not want to install Python dependencies:

```bash
# Run Checkov as a Docker container
docker run --rm -v $(pwd):/work bridgecrew/checkov -d /work --framework dockerfile
```

## Running Your First Scan

Point Checkov at a directory containing Dockerfiles:

```bash
# Scan all Dockerfiles in the current directory
checkov -d . --framework dockerfile

# Scan a specific Dockerfile
checkov -f Dockerfile

# Scan with a specific output format
checkov -f Dockerfile -o json
checkov -f Dockerfile -o junitxml
```

## Understanding the Output

Here is what a typical scan looks like. Given this Dockerfile:

```dockerfile
# A Dockerfile with several security issues
FROM ubuntu:latest
RUN apt-get update && apt-get install -y curl wget
COPY . /app
EXPOSE 22
USER root
CMD ["python", "/app/main.py"]
```

Checkov reports:

```
Passed checks: 2, Failed checks: 6, Skipped checks: 0

Check: CKV_DOCKER_2: "Ensure that HEALTHCHECK instructions have been added"
    FAILED for resource: /Dockerfile.
    Guide: https://docs.bridgecrew.io/docs/ensure-that-healthcheck-instructions-have-been-added

Check: CKV_DOCKER_3: "Ensure that a user for the container has been created"
    FAILED for resource: /Dockerfile.

Check: CKV_DOCKER_7: "Ensure the base image uses a non latest version tag"
    FAILED for resource: /Dockerfile.

Check: CKV_DOCKER_8: "Ensure the last USER is not root"
    FAILED for resource: /Dockerfile.

Check: CKV_DOCKER_9: "Ensure that APT isn't used"
    FAILED for resource: /Dockerfile.

Check: CKV_DOCKER_11: "Ensure From Alias is unique for multistage builds"
    PASSED for resource: /Dockerfile.
```

Each finding includes the check ID, a description, and a link to documentation with remediation steps.

## Common Dockerfile Security Checks

Let's walk through the most important checks and how to fix them.

### CKV_DOCKER_2: Missing HEALTHCHECK

Without a health check, Docker cannot determine if the application inside the container is actually working.

```dockerfile
# BAD: No health check
FROM node:20-alpine
COPY . /app
CMD ["node", "/app/server.js"]

# GOOD: Health check included
FROM node:20-alpine
COPY . /app
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "/app/server.js"]
```

### CKV_DOCKER_3: No User Created

Running as root inside the container is risky. Create a dedicated user:

```dockerfile
# BAD: Runs as root (default)
FROM node:20-alpine
COPY . /app
CMD ["node", "/app/server.js"]

# GOOD: Dedicated non-root user
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --chown=appuser:appgroup . .
USER appuser
CMD ["node", "server.js"]
```

### CKV_DOCKER_7: Using the latest Tag

The `latest` tag is mutable. Your build could pull a completely different image tomorrow:

```dockerfile
# BAD: Mutable tag
FROM python:latest

# GOOD: Pinned version
FROM python:3.12.1-slim

# BEST: Pinned by digest
FROM python:3.12.1-slim@sha256:abcdef123456...
```

### CKV_DOCKER_8: Last USER Is Root

Even if you create a non-root user, the last USER instruction must switch to it:

```dockerfile
# BAD: Switches back to root at the end
FROM node:20-alpine
RUN adduser -S appuser
USER appuser
RUN npm install
USER root
CMD ["node", "server.js"]

# GOOD: Ends as non-root user
FROM node:20-alpine
RUN adduser -S appuser
COPY . /app
RUN npm install
USER appuser
CMD ["node", "server.js"]
```

### CKV_DOCKER_9: Using apt Instead of apt-get

`apt` is designed for interactive use and its output format changes between versions. Use `apt-get` for Dockerfiles:

```dockerfile
# BAD: apt is for interactive use
RUN apt update && apt install -y curl

# GOOD: apt-get is for scripts and Dockerfiles
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
```

### CKV_DOCKER_6: Adding Sensitive Files

Do not COPY or ADD sensitive files like private keys or credentials:

```dockerfile
# BAD: Copies everything including potential secrets
COPY . /app

# GOOD: Use .dockerignore and copy specific files
COPY src/ /app/src/
COPY package.json /app/
```

Create a thorough `.dockerignore`:

```
# .dockerignore
.env
*.pem
*.key
.git
.github
node_modules
docker-compose*.yml
```

## Custom Policies

Checkov lets you write custom policies for organization-specific rules. Create a custom check in Python:

```python
# custom_checks/base_image_check.py
from checkov.dockerfile.base_dockerfile_check import BaseDockerfileCheck
from checkov.common.models.enums import CheckResult, CheckCategories


class ApprovedBaseImages(BaseDockerfileCheck):
    def __init__(self):
        name = "Ensure only approved base images are used"
        id = "CKV_CUSTOM_1"
        supported_instructions = ["FROM"]
        categories = [CheckCategories.SUPPLY_CHAIN]
        super().__init__(
            name=name,
            id=id,
            categories=categories,
            supported_instructions=supported_instructions,
        )

    def scan_resource_conf(self, conf):
        # List of approved base images
        approved = [
            "node:20-alpine",
            "python:3.12-slim",
            "golang:1.22-alpine",
            "gcr.io/distroless/static",
            "gcr.io/distroless/base",
        ]

        for instruction in conf:
            # instruction is a dict with the FROM value
            image = instruction.get("value", "")
            if any(image.startswith(base) for base in approved):
                return CheckResult.PASSED

        return CheckResult.FAILED


check = ApprovedBaseImages()
```

Run Checkov with your custom checks:

```bash
# Run with custom checks directory
checkov -f Dockerfile --external-checks-dir ./custom_checks
```

## Skipping Checks

Sometimes a check does not apply to your situation. Skip it with inline comments or CLI flags:

```dockerfile
# Skip a specific check with an inline comment
# checkov:skip=CKV_DOCKER_2: Health check handled by orchestrator
FROM node:20-alpine
COPY . /app
CMD ["node", "server.js"]
```

Or skip via the command line:

```bash
# Skip specific checks
checkov -f Dockerfile --skip-check CKV_DOCKER_2,CKV_DOCKER_11

# Run only specific checks
checkov -f Dockerfile --check CKV_DOCKER_3,CKV_DOCKER_7,CKV_DOCKER_8
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/dockerfile-scan.yml
name: Dockerfile Security Scan
on:
  pull_request:
    paths:
      - "**/Dockerfile*"
      - "**/.dockerignore"

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: dockerfile
          soft_fail: false
          output_format: sarif
          output_file_path: results.sarif

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

### GitLab CI

```yaml
# .gitlab-ci.yml
dockerfile-scan:
  stage: test
  image: bridgecrew/checkov:latest
  script:
    - checkov -d . --framework dockerfile --output junitxml > checkov-results.xml
  artifacts:
    reports:
      junit: checkov-results.xml
    when: always
  rules:
    - changes:
        - "**/Dockerfile*"
```

### Pre-Commit Hook

Catch issues before they reach CI:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/bridgecrewio/checkov
    rev: '3.1.0'
    hooks:
      - id: checkov
        args: ['--framework', 'dockerfile']
```

```bash
# Install and run pre-commit
pip install pre-commit
pre-commit install

# Now every commit that touches a Dockerfile runs the scan
```

## Fixing a Real Dockerfile

Let's take a problematic Dockerfile and fix every Checkov finding:

```dockerfile
# BEFORE: Multiple security issues
FROM python:latest
RUN apt update && apt install -y gcc
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
EXPOSE 22 8080
CMD ["python", "app.py"]
```

```dockerfile
# AFTER: All Checkov checks pass
FROM python:3.12.1-slim

# Install build dependencies, compile, then remove them
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app appuser

WORKDIR /app

# Copy and install dependencies first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code with correct ownership
COPY --chown=appuser:appgroup . .

# Only expose the application port
EXPOSE 8080

# Add a health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Switch to non-root user
USER appuser

CMD ["python", "app.py"]
```

## Wrapping Up

Checkov catches Dockerfile security issues before they become running vulnerabilities. Install it locally, run it in pre-commit hooks, and enforce it in CI/CD pipelines. The goal is to make it impossible for insecure Dockerfiles to reach production. Start by scanning your existing Dockerfiles, fix the critical findings, and then enable enforcement to prevent regressions.
