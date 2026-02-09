# How to Implement Helm Chart Linting Best Practices with helm lint and ct lint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Master Helm chart linting with helm lint and chart-testing to catch errors early, enforce standards, and maintain high-quality Kubernetes deployments.

---

Linting your Helm charts catches errors before deployment and enforces consistency across your charts. Two primary tools handle this work: helm lint for basic validation and chart-testing (ct) for comprehensive testing. Together, they form a robust quality gate for your Helm charts.

## Understanding Helm Lint Basics

The helm lint command examines your chart for possible issues. It checks template syntax, validates required files, and verifies chart structure. This built-in tool runs quickly and catches common mistakes.

Run helm lint against your chart directory to see immediate feedback about problems.

```bash
# Basic linting of a chart
helm lint ./my-chart

# Lint with custom values
helm lint ./my-chart --values custom-values.yaml

# Strict mode - treat warnings as errors
helm lint ./my-chart --strict
```

The output shows errors that prevent installation and warnings about potential issues. In CI/CD pipelines, use strict mode to fail builds on any warning.

## Common Lint Errors and Fixes

Charts often fail linting due to missing required files, invalid YAML syntax, or template errors. Understanding these patterns helps you write better charts from the start.

A common error occurs when Chart.yaml is missing required fields.

```yaml
# Chart.yaml - Missing required fields causes lint failure
apiVersion: v2
name: myapp
# ERROR: Missing version field
type: application

# Fixed version
apiVersion: v2
name: myapp
version: 1.0.0  # Required field
type: application
description: My application chart  # Recommended
```

Template syntax errors appear when you use invalid Go template expressions.

```yaml
# templates/deployment.yaml - Invalid template syntax
apiVersion: apps/v1
kind: Deployment
metadata:
  # ERROR: Missing closing brace
  name: {{ .Values.name }
spec:
  replicas: {{ .Values.replicaCount }}

# Fixed syntax
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}  # Properly closed
spec:
  replicas: {{ .Values.replicaCount }}
```

Values file references that don't exist cause runtime errors that linting catches.

```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.serviceName }}  # Must exist in values.yaml
spec:
  type: {{ .Values.service.type | default "ClusterIP" }}  # Safe with default
  ports:
  - port: {{ .Values.service.port }}  # Fails if service.port not defined
```

## Configuring Chart Testing (ct)

Chart-testing goes beyond basic linting by installing charts in a test cluster, running smoke tests, and validating upgrade paths. Install ct to add comprehensive validation to your workflow.

```bash
# Install chart-testing
brew install chart-testing

# Or download binary from GitHub releases
curl -LO https://github.com/helm/chart-testing/releases/download/v3.8.0/chart-testing_3.8.0_linux_amd64.tar.gz
tar -xzf chart-testing_3.8.0_linux_amd64.tar.gz
sudo mv ct /usr/local/bin/
```

Configure ct using a YAML file that defines testing behavior.

```yaml
# ct.yaml
chart-dirs:
  - charts
chart-repos:
  - bitnami=https://charts.bitnami.com/bitnami
  - stable=https://charts.helm.sh/stable

# Directories containing test values files
test-values:
  - test-values

# Kubernetes versions to test against
kubernetes-versions:
  - v1.27.0
  - v1.28.0
  - v1.29.0

# Validate maintainers field
validate-maintainers: true

# Check version increments
check-version-increment: true

# Require values schema
validate-chart-schema: true

# Additional helm lint flags
helm-extra-args: --timeout 600s

# Namespace for testing
namespace: ct-testing

# Enable debug output
debug: false
```

## Running Comprehensive Chart Tests

Use ct lint to perform thorough validation that checks version increments, maintainer information, and chart schema.

```bash
# Lint all charts in repository
ct lint --config ct.yaml

# Lint specific charts
ct lint --charts charts/myapp,charts/database

# Lint changed charts only (useful in CI)
ct lint --target-branch main

# Validate schema
ct lint --validate-chart-schema --validate-maintainers
```

The lint command checks several aspects that helm lint misses. It verifies that chart versions increment properly when you make changes, ensuring you don't accidentally release the same version twice.

```bash
# In CI pipeline - lint only changed charts
git fetch origin main
ct lint --target-branch origin/main --config ct.yaml
```

## Installing Charts for Integration Testing

Chart-testing can install your chart in a Kubernetes cluster to verify it actually works. This catches issues that static linting misses.

```bash
# Install and test charts
ct install --config ct.yaml

# Test specific charts
ct install --charts charts/myapp

# Install changed charts only
ct install --target-branch main
```

Create test value files that ct uses during installation.

```yaml
# charts/myapp/ci/test-values.yaml
# These values are used during ct install
replicaCount: 1

service:
  type: ClusterIP
  port: 8080

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 50m
    memory: 64Mi

# Add test-specific configuration
testing:
  enabled: true
  mock: true
```

Place test values files in a ci/ directory within each chart. Chart-testing automatically finds and uses these during installation tests.

## Integrating Linting in CI/CD

Add linting to your CI pipeline to catch issues before merging pull requests. This example shows a GitHub Actions workflow.

```yaml
# .github/workflows/lint-test.yaml
name: Lint and Test Charts

on:
  pull_request:
    paths:
      - 'charts/**'

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for version comparison

      - name: Set up Helm
        uses: azure/setup-helm@v3
        with:
          version: v3.12.0

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: 3.11

      - name: Set up chart-testing
        uses: helm/chart-testing-action@v2

      - name: Run chart-testing (lint)
        run: ct lint --config ct.yaml --target-branch ${{ github.event.repository.default_branch }}

      - name: Create kind cluster
        uses: helm/kind-action@v1

      - name: Run chart-testing (install)
        run: ct install --config ct.yaml --target-branch ${{ github.event.repository.default_branch }}
```

This workflow runs on every pull request that changes chart files. It lints charts and installs them in a temporary kind cluster to verify functionality.

## Custom Linting Rules

Create custom validation beyond what helm lint and ct provide using shell scripts or policy engines.

```bash
#!/bin/bash
# scripts/custom-lint.sh

set -e

CHART_DIR=$1

echo "Running custom linting for $CHART_DIR"

# Check that all templates have documentation
for template in "$CHART_DIR"/templates/*.yaml; do
    if ! grep -q "{{- /\*" "$template"; then
        echo "ERROR: $template missing documentation header"
        exit 1
    fi
done

# Verify values.yaml has descriptions
if ! grep -q "# " "$CHART_DIR/values.yaml"; then
    echo "WARNING: values.yaml should include comments"
fi

# Check for hardcoded namespaces (anti-pattern)
if grep -r "namespace: " "$CHART_DIR/templates/" | grep -v "\.Release\.Namespace"; then
    echo "ERROR: Found hardcoded namespace in templates"
    exit 1
fi

# Ensure resource limits are defined
if ! grep -q "limits:" "$CHART_DIR/values.yaml"; then
    echo "WARNING: Resource limits not defined in values.yaml"
fi

echo "Custom linting passed for $CHART_DIR"
```

Run custom linting alongside standard tools for comprehensive validation.

```bash
# Combined linting script
./scripts/custom-lint.sh charts/myapp
helm lint charts/myapp --strict
ct lint --charts charts/myapp
```

## Validating Chart Documentation

Good charts include comprehensive documentation. Enforce this with automated checks.

```bash
# Check for required documentation files
required_files=("README.md" "values.yaml" "Chart.yaml")

for chart in charts/*/; do
    for file in "${required_files[@]}"; do
        if [ ! -f "$chart/$file" ]; then
            echo "ERROR: $chart missing $file"
            exit 1
        fi
    done

    # Verify README has minimum content
    readme_lines=$(wc -l < "$chart/README.md")
    if [ "$readme_lines" -lt 10 ]; then
        echo "WARNING: $chart/README.md is too short"
    fi
done
```

## Schema Validation

Define a JSON schema for your values.yaml to enable strict validation of user inputs.

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["replicaCount", "image"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10
    },
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": {
          "type": "string"
        },
        "tag": {
          "type": "string",
          "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$"
        },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"]
        }
      }
    }
  }
}
```

Save this as values.schema.json in your chart directory. Helm automatically validates values against this schema during installation.

## Pre-commit Hooks

Prevent committing unlinted charts by using pre-commit hooks.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gruntwork-io/pre-commit
    rev: v0.1.17
    hooks:
      - id: helmlint
        args: ['--strict']

  - repo: local
    hooks:
      - id: chart-testing
        name: chart-testing lint
        entry: ct lint --config ct.yaml
        language: system
        files: charts/.*/.*
        pass_filenames: false
```

Install the hooks so they run automatically before each commit.

```bash
pip install pre-commit
pre-commit install
```

Now every commit that touches chart files triggers linting automatically. This catches errors at the earliest possible point in your development workflow.

Linting Helm charts with helm lint and chart-testing creates a quality gate that prevents broken deployments. Combine basic validation, schema checking, custom rules, and integration testing to build confidence in your charts. When you enforce linting in CI/CD and pre-commit hooks, you catch issues before they reach production.
