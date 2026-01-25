# How to Implement Dependency Scanning with Snyk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, Snyk, Dependency Scanning, SCA, DevSecOps, Vulnerability Management, Open Source Security

Description: Learn how to use Snyk to find and fix vulnerabilities in your open source dependencies, container images, and infrastructure as code before they become security incidents.

---

Modern applications depend on hundreds of open source packages, each a potential entry point for attackers. Snyk scans your dependencies, containers, and infrastructure code to find vulnerabilities and suggests fixes. This guide covers CLI usage, IDE integration, CI/CD pipelines, and strategies for managing vulnerability backlogs.

## What Snyk Scans

Snyk provides multiple scanning capabilities:

- **Snyk Open Source**: Dependency vulnerabilities in npm, pip, Maven, Go modules, etc.
- **Snyk Container**: Vulnerabilities in base images and OS packages
- **Snyk Infrastructure as Code**: Misconfigurations in Terraform, CloudFormation, Kubernetes
- **Snyk Code**: SAST for proprietary code (separate from dependency scanning)

This guide focuses on Open Source and Container scanning.

## Setting Up Snyk

### Create an Account and Get API Token

1. Sign up at snyk.io (free tier available)
2. Go to Account Settings > API Token
3. Copy your token for CLI authentication

### Install the Snyk CLI

```bash
# npm (works across platforms)
npm install -g snyk

# macOS with Homebrew
brew install snyk

# Linux using curl
curl https://static.snyk.io/cli/latest/snyk-linux -o snyk
chmod +x snyk
sudo mv snyk /usr/local/bin/

# Authenticate
snyk auth
# Opens browser for authentication, or use:
snyk auth YOUR_API_TOKEN
```

## Scanning Dependencies

### Node.js Projects

```bash
# Scan package.json and node_modules
cd my-node-project
snyk test

# Output shows vulnerabilities with severity and remediation
# Testing my-node-project...
#
# Tested 342 dependencies for known issues
# Found 5 issues, 2 critical, 2 high, 1 medium
#
# Issue: Prototype Pollution
# Severity: Critical
# Package: lodash
# Installed: 4.17.15
# Fixed in: 4.17.21
# Path: my-app > express > lodash
```

### Python Projects

```bash
# Scan requirements.txt or Pipfile
cd my-python-project
snyk test --file=requirements.txt

# For pipenv projects
snyk test --file=Pipfile

# For poetry projects
snyk test --file=pyproject.toml
```

### Java/Maven Projects

```bash
# Scan pom.xml
cd my-java-project
snyk test --file=pom.xml

# For Gradle projects
snyk test --file=build.gradle
```

### Go Projects

```bash
# Scan go.mod
cd my-go-project
snyk test --file=go.mod
```

## Scanning Container Images

```bash
# Scan an image from a registry
snyk container test nginx:1.25

# Scan a locally built image
docker build -t myapp:v1.0 .
snyk container test myapp:v1.0

# Scan with Dockerfile for better remediation advice
snyk container test myapp:v1.0 --file=Dockerfile

# Output example:
# Testing nginx:1.25...
#
# Organization: my-org
# Package manager: deb
# Target file: Dockerfile
# Project name: docker-image|nginx
# Docker image: nginx:1.25
#
# Tested 136 dependencies for known issues
# Found 42 issues
#
# Base Image    Vulnerabilities
# nginx:1.25    42 (2 critical, 8 high, 15 medium, 17 low)
#
# Recommendations for base image upgrade:
# Minor upgrade: nginx:1.25.3 (38 issues)
# Alternative: nginx:1.25-alpine (12 issues)
```

## Monitoring Projects Continuously

The `snyk monitor` command creates a snapshot in Snyk's dashboard for ongoing monitoring:

```bash
# Monitor dependencies
snyk monitor

# Monitor a container image
snyk container monitor myapp:v1.0

# Monitor with custom project name
snyk monitor --project-name="production-api"
```

Snyk sends alerts when new vulnerabilities are discovered in your monitored projects.

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/snyk.yml
name: Snyk Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run daily to catch new vulnerabilities
    - cron: '0 8 * * *'

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
          # Fail the build on high/critical vulnerabilities
          command: test

      - name: Upload Snyk results to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: snyk.sarif

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Snyk container scan
        uses: snyk/actions/docker@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          image: myapp:${{ github.sha }}
          args: --severity-threshold=high --file=Dockerfile
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - security

snyk-dependency-scan:
  stage: security
  image: snyk/snyk:node
  script:
    - snyk auth $SNYK_TOKEN
    - snyk test --severity-threshold=high
  allow_failure: false
  only:
    - merge_requests
    - main

snyk-container-scan:
  stage: security
  image: snyk/snyk:docker
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - snyk auth $SNYK_TOKEN
    - snyk container test $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA --severity-threshold=high
  only:
    - merge_requests
    - main
```

## Fixing Vulnerabilities

### Automatic Fix PRs

Snyk can open pull requests automatically to fix vulnerabilities:

```bash
# Generate fix commands
snyk fix

# Apply fixes interactively
snyk wizard
```

### Manual Remediation

For vulnerabilities without automatic fixes:

```bash
# Get detailed information about a vulnerability
snyk test --json | jq '.vulnerabilities[] | select(.severity == "critical")'

# Check if an upgrade path exists
snyk test --show-vulnerable-paths=all
```

Common remediation strategies:

1. **Upgrade the dependency**: Most straightforward when a fix exists
2. **Patch**: Apply Snyk patches when upgrades break compatibility
3. **Ignore**: Temporarily ignore with justification (not recommended for critical)
4. **Replace**: Find an alternative package without the vulnerability

### Ignoring Vulnerabilities

Create a `.snyk` policy file for accepted risks:

```yaml
# .snyk
version: v1.25.0
ignore:
  # Ignore a specific vulnerability
  SNYK-JS-LODASH-1018905:
    - '*':
        reason: 'Not exploitable in our usage context'
        expires: '2025-06-01T00:00:00.000Z'

  # Ignore vulnerabilities in test dependencies
  SNYK-JS-MINIMIST-559764:
    - 'jest > jest-cli > minimist':
        reason: 'Only used in test environment'
        expires: '2025-12-31T00:00:00.000Z'

patch: {}
```

## IDE Integration

### VS Code Extension

Install the Snyk extension for VS Code:

1. Open Extensions (Cmd+Shift+X)
2. Search for "Snyk Security"
3. Install and authenticate

The extension shows vulnerabilities inline as you code:

```javascript
// package.json
{
  "dependencies": {
    "lodash": "4.17.15"  // Snyk: Critical vulnerability (upgrade to 4.17.21)
  }
}
```

### JetBrains IDEs

Install the Snyk plugin from JetBrains Marketplace for IntelliJ, WebStorm, PyCharm, etc.

## Reporting and Metrics

Generate reports for compliance and tracking:

```bash
# JSON output for processing
snyk test --json > report.json

# SARIF format for security dashboards
snyk test --sarif > report.sarif

# HTML report
snyk test --json | snyk-to-html -o report.html
```

Key metrics to track:

- Total vulnerabilities by severity
- Mean time to remediate
- Vulnerabilities introduced vs. fixed per sprint
- Coverage (% of projects monitored)

## Configuring Severity Thresholds

Control which vulnerabilities fail builds:

```bash
# Only fail on critical vulnerabilities
snyk test --severity-threshold=critical

# Fail on high and critical
snyk test --severity-threshold=high

# Fail on any vulnerability (strictest)
snyk test --severity-threshold=low
```

## License Compliance

Snyk also detects problematic licenses:

```bash
# Check for license issues
snyk test --license

# Fail on GPL licenses (example policy)
# Configure in Snyk dashboard under Organization Settings > License Policies
```

---

Dependency scanning is not a checkbox exercise. It is an ongoing practice of keeping your software supply chain healthy. Use Snyk in CI/CD to catch new vulnerabilities, monitor projects for emerging threats, and build a culture where upgrading dependencies is routine maintenance, not emergency response.
