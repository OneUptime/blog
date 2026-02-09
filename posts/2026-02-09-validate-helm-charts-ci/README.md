# How to Validate Helm Charts Using Chart Testing and Schema Validation in CI Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, CI/CD

Description: Learn how to implement comprehensive Helm chart validation in CI pipelines using chart testing tools, schema validation, and linting to catch configuration errors before deployment.

---

Helm charts are the de facto standard for packaging Kubernetes applications, but they can become complex quickly with templates, values, and dependencies. A single mistake in a chart can cause deployment failures, security vulnerabilities, or unexpected behavior in production. Manual chart validation is time-consuming and error-prone, making automated validation in CI pipelines essential.

Chart validation should verify syntax correctness, template rendering, value schema compliance, security best practices, and compatibility with target Kubernetes versions. In this guide, you'll learn how to implement comprehensive Helm chart validation that catches issues early in the development process.

## Understanding Helm Chart Validation Layers

Effective chart validation consists of multiple layers, each catching different types of issues. Static analysis checks YAML syntax and chart structure without rendering templates. Linting validates chart best practices and common mistakes. Template rendering verifies that charts render correctly with various value combinations. Schema validation ensures values conform to expected types and constraints. Security scanning identifies potential security issues. And installation testing verifies charts deploy successfully to real clusters.

Each layer provides a different level of confidence, and combining them creates a comprehensive validation strategy that catches issues before they reach production.

## Setting Up Helm Chart Testing Tools

Install the essential tools for chart validation:

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install helm-unittest plugin for unit testing
helm plugin install https://github.com/helm-unittest/helm-unittest

# Install chart-testing (ct) tool
curl -sSLo ct.tar.gz \
  https://github.com/helm/chart-testing/releases/download/v3.10.0/chart-testing_3.10.0_linux_amd64.tar.gz
tar -xzf ct.tar.gz
sudo mv ct /usr/local/bin/

# Install kubeval for Kubernetes manifest validation
wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
tar xf kubeval-linux-amd64.tar.gz
sudo mv kubeval /usr/local/bin/

# Install kubeconform (modern kubeval alternative)
wget https://github.com/yannh/kubeconform/releases/download/v0.6.3/kubeconform-linux-amd64.tar.gz
tar xf kubeconform-linux-amd64.tar.gz
sudo mv kubeconform /usr/local/bin/
```

## Creating Chart Schema Validation

Define a JSON schema to validate chart values:

```yaml
# values.schema.json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "service"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "description": "Number of pod replicas"
    },
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": {
          "type": "string",
          "pattern": "^[a-z0-9-./]+$",
          "description": "Container image repository"
        },
        "tag": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9._-]+$",
          "description": "Container image tag"
        },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"],
          "default": "IfNotPresent"
        }
      }
    },
    "service": {
      "type": "object",
      "required": ["type", "port"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["ClusterIP", "NodePort", "LoadBalancer"],
          "description": "Service type"
        },
        "port": {
          "type": "integer",
          "minimum": 1,
          "maximum": 65535,
          "description": "Service port"
        }
      }
    },
    "resources": {
      "type": "object",
      "properties": {
        "limits": {
          "type": "object",
          "properties": {
            "cpu": {
              "type": "string",
              "pattern": "^[0-9]+m?$"
            },
            "memory": {
              "type": "string",
              "pattern": "^[0-9]+Mi?$"
            }
          }
        },
        "requests": {
          "type": "object",
          "properties": {
            "cpu": {
              "type": "string",
              "pattern": "^[0-9]+m?$"
            },
            "memory": {
              "type": "string",
              "pattern": "^[0-9]+Mi?$"
            }
          }
        }
      }
    },
    "autoscaling": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": false
        },
        "minReplicas": {
          "type": "integer",
          "minimum": 1
        },
        "maxReplicas": {
          "type": "integer",
          "minimum": 1
        },
        "targetCPUUtilizationPercentage": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100
        }
      },
      "if": {
        "properties": { "enabled": { "const": true } }
      },
      "then": {
        "required": ["minReplicas", "maxReplicas", "targetCPUUtilizationPercentage"]
      }
    }
  }
}
```

## Writing Chart Unit Tests

Create unit tests for chart templates using helm-unittest:

```yaml
# tests/deployment_test.yaml
suite: test deployment
templates:
  - deployment.yaml
tests:
  - it: should create a deployment with default values
    asserts:
      - isKind:
          of: Deployment
      - equal:
          path: metadata.name
          value: RELEASE-NAME-mychart
      - equal:
          path: spec.replicas
          value: 1

  - it: should set custom replica count
    set:
      replicaCount: 3
    asserts:
      - equal:
          path: spec.replicas
          value: 3

  - it: should use correct image
    set:
      image:
        repository: myapp
        tag: v1.2.3
    asserts:
      - equal:
          path: spec.template.spec.containers[0].image
          value: myapp:v1.2.3

  - it: should set resource limits when specified
    set:
      resources:
        limits:
          cpu: 500m
          memory: 512Mi
        requests:
          cpu: 250m
          memory: 256Mi
    asserts:
      - equal:
          path: spec.template.spec.containers[0].resources.limits.cpu
          value: 500m
      - equal:
          path: spec.template.spec.containers[0].resources.requests.memory
          value: 256Mi

  - it: should add security context when enabled
    set:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
    asserts:
      - equal:
          path: spec.template.spec.securityContext.runAsNonRoot
          value: true
      - equal:
          path: spec.template.spec.securityContext.runAsUser
          value: 1000

  - it: should create service account when enabled
    set:
      serviceAccount:
        create: true
        name: my-service-account
    asserts:
      - equal:
          path: spec.template.spec.serviceAccountName
          value: my-service-account
```

Run the unit tests:

```bash
# Run all tests
helm unittest ./mychart

# Run with verbose output
helm unittest -f 'tests/**/*_test.yaml' ./mychart -3

# Generate test coverage report
helm unittest --output-type junit --output-file test-results.xml ./mychart
```

## Creating a Chart Testing Configuration

Configure chart-testing tool for comprehensive validation:

```yaml
# ct.yaml
chart-dirs:
  - charts

chart-repos:
  - bitnami=https://charts.bitnami.com/bitnami

helm-extra-args: --timeout 600s

validate-maintainers: true

check-version-increment: true

# Require chart-testing configuration
remote: origin

target-branch: main

# Validation rules
validate-chart-schema: true
validate-yaml: true

# Kubernetes versions to test against
kubernetes-version: v1.28.0

# Additional Helm arguments
helm-extra-set-args:
  - install-test=true
```

## Building a Comprehensive Validation Script

Create a script that runs all validation checks:

```bash
#!/bin/bash
# validate-chart.sh

set -e

CHART_DIR="${1:-.}"
CHART_NAME=$(basename "$CHART_DIR")

echo "==================================="
echo "Validating Helm Chart: $CHART_NAME"
echo "==================================="

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 1. Check chart structure
echo ""
print_info "Step 1: Checking chart structure..."
if [ ! -f "$CHART_DIR/Chart.yaml" ]; then
    print_error "Chart.yaml not found"
    exit 1
fi
if [ ! -f "$CHART_DIR/values.yaml" ]; then
    print_error "values.yaml not found"
    exit 1
fi
if [ ! -d "$CHART_DIR/templates" ]; then
    print_error "templates directory not found"
    exit 1
fi
print_success "Chart structure is valid"

# 2. Lint chart
echo ""
print_info "Step 2: Linting chart..."
if helm lint "$CHART_DIR"; then
    print_success "Chart lint passed"
else
    print_error "Chart lint failed"
    exit 1
fi

# 3. Validate values against schema
echo ""
print_info "Step 3: Validating values schema..."
if [ -f "$CHART_DIR/values.schema.json" ]; then
    if helm template test "$CHART_DIR" --validate > /dev/null 2>&1; then
        print_success "Values schema validation passed"
    else
        print_error "Values schema validation failed"
        exit 1
    fi
else
    print_info "No values.schema.json found, skipping schema validation"
fi

# 4. Template rendering test
echo ""
print_info "Step 4: Testing template rendering..."
if helm template test "$CHART_DIR" > /tmp/rendered-templates.yaml; then
    print_success "Template rendering successful"
else
    print_error "Template rendering failed"
    exit 1
fi

# 5. Validate rendered manifests
echo ""
print_info "Step 5: Validating rendered manifests with kubeconform..."
if cat /tmp/rendered-templates.yaml | \
   kubeconform -strict -ignore-missing-schemas \
   -kubernetes-version 1.28.0 -summary; then
    print_success "Manifest validation passed"
else
    print_error "Manifest validation failed"
    exit 1
fi

# 6. Run unit tests
echo ""
print_info "Step 6: Running unit tests..."
if [ -d "$CHART_DIR/tests" ]; then
    if helm unittest "$CHART_DIR"; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        exit 1
    fi
else
    print_info "No tests directory found, skipping unit tests"
fi

# 7. Test different value combinations
echo ""
print_info "Step 7: Testing with custom values..."

# Test with minimal values
cat > /tmp/minimal-values.yaml << EOF
image:
  repository: nginx
  tag: latest
service:
  type: ClusterIP
  port: 80
EOF

if helm template test "$CHART_DIR" -f /tmp/minimal-values.yaml > /dev/null 2>&1; then
    print_success "Minimal values test passed"
else
    print_error "Minimal values test failed"
    exit 1
fi

# Test with maximum values
cat > /tmp/maximum-values.yaml << EOF
replicaCount: 3
image:
  repository: nginx
  tag: stable
  pullPolicy: Always
service:
  type: LoadBalancer
  port: 8080
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
EOF

if helm template test "$CHART_DIR" -f /tmp/maximum-values.yaml > /dev/null 2>&1; then
    print_success "Maximum values test passed"
else
    print_error "Maximum values test failed"
    exit 1
fi

# 8. Check for security issues
echo ""
print_info "Step 8: Scanning for security issues..."

# Check for runAsRoot
if grep -r "runAsRoot: false" "$CHART_DIR/templates/" > /dev/null; then
    print_success "Security: runAsNonRoot is configured"
else
    print_info "Consider adding runAsNonRoot: true to security contexts"
fi

# Check for resource limits
if grep -r "resources:" "$CHART_DIR/templates/" > /dev/null; then
    print_success "Security: Resource limits are defined"
else
    print_info "Consider adding resource limits to containers"
fi

# 9. Package chart
echo ""
print_info "Step 9: Packaging chart..."
if helm package "$CHART_DIR" -d /tmp > /dev/null; then
    print_success "Chart packaging successful"
else
    print_error "Chart packaging failed"
    exit 1
fi

# Cleanup
rm -f /tmp/rendered-templates.yaml
rm -f /tmp/minimal-values.yaml
rm -f /tmp/maximum-values.yaml

echo ""
echo "==================================="
print_success "All validation checks passed!"
echo "==================================="
```

Make the script executable and run it:

```bash
chmod +x validate-chart.sh
./validate-chart.sh ./mychart
```

## Integrating Chart Validation into CI Pipeline

Create a GitHub Actions workflow for automated chart validation:

```yaml
# .github/workflows/helm-chart-validation.yaml
name: Helm Chart Validation

on:
  pull_request:
    paths:
      - 'charts/**'
  push:
    branches:
      - main

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Set up Helm
        uses: azure/setup-helm@v3
        with:
          version: v3.12.0

      - name: Install helm-unittest
        run: |
          helm plugin install https://github.com/helm-unittest/helm-unittest

      - name: Install validation tools
        run: |
          # Install kubeconform
          wget https://github.com/yannh/kubeconform/releases/download/v0.6.3/kubeconform-linux-amd64.tar.gz
          tar xf kubeconform-linux-amd64.tar.gz
          sudo mv kubeconform /usr/local/bin/

          # Install chart-testing
          curl -sSLo ct.tar.gz \
            https://github.com/helm/chart-testing/releases/download/v3.10.0/chart-testing_3.10.0_linux_amd64.tar.gz
          tar -xzf ct.tar.gz
          sudo mv ct /usr/local/bin/

      - name: Run chart validation script
        run: |
          for chart in charts/*/; do
            ./scripts/validate-chart.sh "$chart"
          done

      - name: Run chart-testing (lint)
        run: ct lint --config ct.yaml

      - name: Create kind cluster
        uses: helm/kind-action@v1.5.0

      - name: Run chart-testing (install)
        run: ct install --config ct.yaml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: chart-test-results
          path: |
            test-results.xml
            **/test-results.xml
```

## Creating Pre-Commit Hooks for Local Validation

Set up pre-commit hooks to validate charts before committing:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: helm-lint
        name: Helm Lint
        entry: bash -c 'for chart in charts/*/; do helm lint $chart; done'
        language: system
        pass_filenames: false

      - id: helm-unittest
        name: Helm Unit Tests
        entry: bash -c 'for chart in charts/*/; do helm unittest $chart; done'
        language: system
        pass_filenames: false

      - id: validate-chart
        name: Validate Charts
        entry: ./scripts/validate-chart.sh
        language: system
        files: ^charts/
        pass_filenames: true
```

Install pre-commit and set up hooks:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

Comprehensive Helm chart validation in CI pipelines catches configuration errors, security issues, and compatibility problems before charts reach production. By combining multiple validation layers including linting, schema validation, unit testing, and installation testing, you can deploy Helm charts with confidence knowing they will work correctly in your target environment.
