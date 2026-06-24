# How to Lint and Validate Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, Linting, Hadolint, DevOps

Description: Learn how to lint and validate your Containerfiles for Podman using tools like Hadolint, container-diff, and custom validation scripts to catch errors before they reach production.

---

> Linting your Containerfiles catches mistakes that would otherwise become runtime failures, security vulnerabilities, or bloated images in production.

Writing a Containerfile that builds successfully does not mean it follows best practices. Images might be larger than necessary, run as root unnecessarily, use deprecated instructions, or contain subtle security issues. Linting and validation tools catch these problems early, before they reach production. This guide covers the tools and techniques for validating Containerfiles when working with Podman.

---

## Why Lint Containerfiles?

A Containerfile that builds successfully can still have many problems. It might install packages without cleaning the cache, bloating the image. It might use `latest` tags, making builds non-reproducible. It might run as root when it does not need to. It might use the shell form of CMD, breaking signal handling. Linting tools detect these issues automatically, enforcing best practices across your team.

## Hadolint: The Standard Containerfile Linter

Hadolint is the most widely used Containerfile linter. It parses your Containerfile and applies a comprehensive set of rules based on best practices. It also uses ShellCheck to validate bash commands inside RUN instructions.

### Installing Hadolint

You can run Hadolint directly through Podman without installing anything:

```bash
podman run --rm -i hadolint/hadolint < Containerfile
```

Or install it locally:

```bash
# macOS

brew install hadolint

# Linux (download binary)
wget -O /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64
chmod +x /usr/local/bin/hadolint
```

### Running Hadolint

Lint a Containerfile:

```bash
hadolint Containerfile
```

Sample output:

```text
Containerfile:3 DL3008 warning: Pin versions in apt-get install
Containerfile:5 DL3003 warning: Use WORKDIR to switch to a directory
Containerfile:8 DL4006 warning: Set the SHELL option -o pipefail before RUN with a pipe in
Containerfile:12 DL3025 warning: Use arguments JSON notation for CMD and ENTRYPOINT
```

Each warning includes a rule code, severity level, and description.

### Understanding Hadolint Rules

Hadolint rules are prefixed with DL (Docker Lint) or SC (ShellCheck). Here are some of the most important ones:

**DL3007** warns when you use a tag like `latest` instead of pinning a specific version. Non-pinned tags make builds non-reproducible:

```dockerfile
# Bad
FROM node:latest

# Good
FROM node:20-alpine
```

**DL3008** warns about unpinned package versions in apt-get install:

```dockerfile
# Triggers warning
RUN apt-get update && apt-get install -y curl

# Fixed - pin versions
RUN apt-get update && apt-get install -y curl=7.88.1-10+deb12u5
```

**DL3009** warns about not cleaning up the apt cache:

```dockerfile
# Bad
RUN apt-get update && apt-get install -y curl

# Good
RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*
```

**DL3025** warns about using the shell form for CMD or ENTRYPOINT:

```dockerfile
# Bad - shell form
CMD node server.js

# Good - exec form
CMD ["node", "server.js"]
```

**DL4006** warns about missing pipefail in RUN instructions with pipes:

```dockerfile
# Bad
RUN curl -s https://example.com | bash

# Good
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN curl -s https://example.com | bash
```

### Hadolint Configuration

Create a `.hadolint.yaml` file to customize rules for your project:

```yaml
# .hadolint.yaml
ignored:
  - DL3008  # Don't require pinned apt versions
  - DL3018  # Don't require pinned apk versions

trustedRegistries:
  - docker.io
  - gcr.io
  - ghcr.io

override:
  error:
    - DL3000  # Use absolute WORKDIR
    - DL3001  # Invalid command
    - DL3003  # Use WORKDIR instead of cd
  warning:
    - DL3006  # Missing image tag
    - DL3007  # latest tag
  info:
    - DL3025  # CMD form
```

Run with the config:

```bash
hadolint --config .hadolint.yaml Containerfile
```

### Hadolint Output Formats

Hadolint supports multiple output formats for CI integration:

```bash
# Default format
hadolint Containerfile

# JSON format (for programmatic parsing)
hadolint --format json Containerfile

# SARIF format (for GitHub Code Scanning)
hadolint --format sarif Containerfile

# Checkstyle format (for Jenkins)
hadolint --format checkstyle Containerfile

# GitLab Code Quality format
hadolint --format gitlab_codeclimate Containerfile

# CodeClimate format
hadolint --format codeclimate Containerfile
```

## Validating with Podman Build

Podman itself can validate your Containerfile by performing a test build. While not a linter, the build process catches syntax errors and invalid instructions:

```bash
# Basic validation through build
podman build --no-cache -t test-build .

# Check for warnings in build output
podman build -t test-build . 2>&1 | grep -i "warning\|deprecated"
```

## Custom Validation Scripts

For project-specific rules that linters do not cover, write custom validation scripts:

```bash
#!/bin/bash
# validate-containerfile.sh

CONTAINERFILE="${1:-Containerfile}"
EXIT_CODE=0

echo "Validating $CONTAINERFILE..."

# Check that a HEALTHCHECK is defined
if ! grep -q "^HEALTHCHECK" "$CONTAINERFILE"; then
    echo "ERROR: No HEALTHCHECK instruction found"
    EXIT_CODE=1
fi

# Check that USER is set to non-root
if ! grep -q "^USER" "$CONTAINERFILE"; then
    echo "WARNING: No USER instruction found (container will run as root)"
    EXIT_CODE=1
fi

# Check that EXPOSE is defined
if ! grep -q "^EXPOSE" "$CONTAINERFILE"; then
    echo "WARNING: No EXPOSE instruction found"
fi

# Check for use of ADD instead of COPY
if grep -q "^ADD" "$CONTAINERFILE"; then
    echo "WARNING: Use COPY instead of ADD unless you need tar extraction or URL fetching"
fi

# Check for latest tags
if grep -qE "^FROM\s+\S+:latest" "$CONTAINERFILE"; then
    echo "ERROR: Using :latest tag. Pin to a specific version"
    EXIT_CODE=1
fi

# Check for running as root explicitly
if grep -qE "^USER\s+root" "$CONTAINERFILE"; then
    echo "ERROR: Container explicitly runs as root"
    EXIT_CODE=1
fi

# Check for COPY . . without .dockerignore
if grep -q "COPY \. \." "$CONTAINERFILE" && [ ! -f ".dockerignore" ] && [ ! -f ".containerignore" ]; then
    echo "WARNING: COPY . . used without .dockerignore or .containerignore"
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "All validations passed"
else
    echo "Validation failed"
fi

exit $EXIT_CODE
```

Make it executable and run:

```bash
chmod +x validate-containerfile.sh
./validate-containerfile.sh Containerfile
```

## Image Analysis with Skopeo and Podman Inspect

After building, analyze the resulting image to understand what it contains:

```bash
# Inspect image metadata
podman inspect my-app:latest

# Compare image layers and sizes
podman image tree my-app:latest

# Use skopeo to inspect remote images without pulling
skopeo inspect docker://docker.io/library/python:3.11-slim

# Compare two image versions by inspecting their layers
podman history my-app:1.0
podman history my-app:2.0
```

## Security Scanning with Trivy

Combine linting with vulnerability scanning for comprehensive validation:

```bash
# Scan for vulnerabilities
trivy image my-app:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL my-app:latest

# Scan the Containerfile itself for misconfigurations
trivy config Containerfile
```

Trivy can also scan Containerfiles for configuration issues, complementing Hadolint's linting.

## CI/CD Integration

### GitHub Actions

```yaml
name: Lint Containerfile

on:
  pull_request:
    paths:
      - 'Containerfile'
      - '.hadolint.yaml'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Lint Containerfile
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Containerfile
          failure-threshold: warning

      - name: Security scan
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          scan-type: config
          scan-ref: .
```

### GitLab CI

```yaml
lint-containerfile:
  stage: validate
  image: hadolint/hadolint:latest-alpine
  script:
    - hadolint --format gitlab_codeclimate Containerfile > hadolint-report.json
  artifacts:
    reports:
      codequality: hadolint-report.json
  rules:
    - changes:
        - Containerfile
```

### Pre-Commit Hook

Add Containerfile linting to your Git pre-commit hooks:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Find all staged Containerfiles
CONTAINERFILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '(Containerfile|Dockerfile)')

if [ -n "$CONTAINERFILES" ]; then
    echo "Linting Containerfiles..."
    for file in $CONTAINERFILES; do
        hadolint "$file"
        if [ $? -ne 0 ]; then
            echo "Linting failed for $file"
            exit 1
        fi
    done
    echo "All Containerfiles passed linting"
fi
```

Or use the pre-commit framework:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/hadolint/hadolint
    rev: v2.12.0
    hooks:
      - id: hadolint-docker
        entry: hadolint/hadolint hadolint
```

## The .dockerignore and .containerignore File

While not strictly a linting tool, the ignore file prevents unnecessary files from being sent to the build context:

```text
# .containerignore
.git
.github
.gitignore
node_modules
npm-debug.log
*.md
!README.md
.env
.env.*
docker-compose*.yml
Containerfile
.dockerignore
.containerignore
__pycache__
*.pyc
.pytest_cache
coverage/
.nyc_output/
dist/
build/
*.log
```

Validate that your ignore file is working:

```bash
# Check what files are included in the build context
podman build --no-cache -f - . <<'EOF'
FROM alpine
COPY . /context
RUN find /context -maxdepth 2 -type f | sort
EOF
```

## Best Practices

Run Hadolint in your CI pipeline to catch issues before they are merged. Use a `.hadolint.yaml` configuration file to customize rules for your project. Combine linting with security scanning for comprehensive validation. Write custom validation scripts for project-specific requirements. Use pre-commit hooks to catch issues before they are even committed. Keep your `.containerignore` file up to date to prevent unnecessary context transfers. Review linting warnings regularly and update your configuration as your standards evolve. Treat linting warnings as errors in CI to maintain high standards. Scan built images for vulnerabilities, not just Containerfile syntax.

## Conclusion

Linting and validating Containerfiles is a low-effort, high-impact practice that prevents a wide range of issues from reaching production. Hadolint catches syntax issues and best practice violations, Trivy finds security vulnerabilities, and custom scripts enforce your team's specific standards. By integrating these tools into your CI/CD pipeline and pre-commit hooks, you create a safety net that ensures every Containerfile meets your quality bar before it builds a production image.
